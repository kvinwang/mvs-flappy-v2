const events = require('events');
const http = require('http');

const ns = {};

class Socket extends events.EventEmitter {
    constructor(req) {
        super();
        this._req = req;
        this._headTx = null;
        this._readableState = {};
        this._writableState = {};
        this.pauseBuffer = null;
        this.readStream = Wapo.streamOpenRead(req.opaqueInputStream, (cmd, data) => {
            switch (cmd) {
                case "data":
                    if (this.pauseBuffer) {
                        this.pauseBuffer = Wapo.concatU8a([this.pauseBuffer, data]);
                    } else {
                        this.emit('data', data);
                    }
                    break;
                case "error":
                    this.emit('error', data);
                    break;
                case "end":
                    this.emit('end');
                    break;
                default:
                    console.log("unknown cmd:", cmd);
                    break;
            }
        });
        this.writeStream = Wapo.streamOpenWrite(req.opaqueOutputStream);
        this.remoteAddress = "";
    }

    async write(data, encoding, callback) {
        if (typeof encoding === 'function') {
            callback = encoding;
            encoding = null;
        }
        if (!this.writeStream) {
            self.emit('error', new Error('writeStream is not open'));
            return;
        }
        await this.writeData(data);
        callback && callback();
    }

    async writeData(data) {
        if (this._headTx) {
            const i = data.indexOf('\r\n\r\n');
            const head = data.slice(0, i);
            data = data.slice(i + 4);
            Wapo.httpsSendResponseHeadRaw(this._headTx, head);
            this._headTx = null;
        }
        await writeData(this.writeStream, data);
    }

    async end(data, encoding, callback) {
        if (typeof data === 'function') {
            data = null;
            callback = data;
        } else if (typeof encoding === 'function') {
            callback = encoding;
            encoding = null;
        }
        if (data) {
            await this.writeData(data);
        }
        Wapo.streamClose(this.writeStream);
        this.emit('close');
        callback && callback();
    }

    on(event, listener) {
        super.on(event, listener);
    }

    destroy() {
        Wapo.streamClose(this.readStream);
        Wapo.streamClose(this.writeStream);
        this.emit('close');
    }

    cork() { }
    uncork() { }
    pause() {
        this.pauseBuffer = new Uint8Array([]);
    }
    resume() {
        if (this.pauseBuffer?.length > 0) {
            this.emit('data', this.pauseBuffer);
            this.pauseBuffer = null;
        }
    }

    get readable() {
        return true;
    }

    get writable() {
        return true;
    }
}

class IncomingMessage extends events.EventEmitter {
    constructor(req, socket) {
        super();
        this._req = req;
        this._socket = socket;
        // TODO: turn dup keys into array value
        this.headers = Object.fromEntries(
            req.headers.map(([key, value]) => [key.toLowerCase(), value])
        );
        this.method = req.method;
        this.url = req.url;
        const contentType = this.headers['content-type'];
        if (contentType && contentType.toLowerCase().indexOf('charset=utf-8') !== -1) {
            this.encoding = 'utf-8';
        }
        if (socket) {
            socket.on('data', (data) => {
                if (this.encoding) {
                    data = new TextDecoder(this.encoding).decode(data);
                }
                this.emit('data', data);
            });
            socket.on('end', () => {
                this.emit('end');
            });
            socket.on('close', () => {
                this.emit('close');
            });
        }
    }

    get socket() {
        return this._socket;
    }

    get connection() {
        return this._socket;
    }

    getHeaders() {
        return this.headers;
    }

    setEncoding(encoding) {
        this.encoding = encoding;
    }

    destroy() {
        this._socket.destroy();
    }
}

class ClientRequest extends IncomingMessage {

}

class ServerResponse extends events.EventEmitter {
    constructor(req, socket) {
        super();
        this._req = req;
        this._socket = socket;
        this.statusCode = 200;
        this.headers = {};
        this.headerSent = false;
    }

    setHeader(name, value) {
        this.headers[name] = value;
    }

    getHeader(name) {
        return this.headers[name];
    }

    writeHead(statusCode, headers) {
        this.statusCode = statusCode;
        if (headers) {
            this.headers = headers;
        }
    }

    flushHeaders() {
        if (!this.headerSent) {
            if (this.headers['Content-Length']) {
                this.headers['Content-Length'] = '' + this.headers['Content-Length'];
            }
            // CORS
            // this.headers['Access-Control-Allow-Origin'] = '*';
            Wapo.httpsSendResponseHead(this._req.opaqueResponseTx, {
                status: this.statusCode,
                headers: this.headers,
            });
            this.headerSent = true;
        }
    }

    end(data) {
        if (!this._socket) {
            this.emit('error', new Error('outStream is not open'));
            return;
        }
        this.flushHeaders();
        this._socket.end(data);
        this._socket = null;
    }

    write(data) {
        if (!this.socket) {
            this.emit('error', new Error('outStream is not open'));
            return;
        }
        this.socket.write(data);
    }

    destroy() {
        this._socket.destroy();
    }

    close() {
        this._socket.destroy();
    }

    get socket() {
        return this._socket;
    }
}

class Server extends events.EventEmitter {
    constructor(options, requestListener) {
        super();
        this.options = options;
        this.requestListener = requestListener;
        this._listenId = null;
    }

    listen(tlsConfig, done) {
        this._listenId = Wapo.httpsListen(tlsConfig, async (req) => {
            const socket = new Socket(req);
            const headers = new Headers(req.headers);
            if (headers.has('upgrade')) {
                socket._headTx = req.opaqueResponseTx;
                const incomingMessage = new IncomingMessage(req);
                this.emit('upgrade', incomingMessage, socket, new ArrayBuffer([]));
                return;
            }
            const incomingMessage = new IncomingMessage(req, socket);
            const serverResponse = new ServerResponse(req, socket);
            if (this.requestListener) {
                this.requestListener(incomingMessage, serverResponse);
            }
            this.emit('request', incomingMessage, serverResponse);
        });
        this.emit('listening');
        if (done) {
            done();
        }
    }

    close() {
        Wapo.close(this._listenId);
        this.emit('close');
    }
}

ns.createServer = function (options, requestListener) {
    if (typeof options === 'function') {
        requestListener = options;
        options = {};
    }
    return new Server(options, requestListener);
};

async function writeData(writer, data) {
    if (typeof data === 'string') {
        data = new TextEncoder().encode(data);
    }
    return new Promise((resolve, reject) => {
        Wapo.streamWriteChunk(writer, data, (suc, err) => {
            if (suc) {
                resolve();
            } else {
                reject(err);
            }
        });
    });
}

http.ServerResponse = ServerResponse;
export default ns;