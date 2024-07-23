// Wapo doesn't support the node.js http server API. Here, we implement a node-like http server using Wapo APIs.
import http from './http';
// Wapo doesn't support file system APIs. We use webpack to bundle the files into the bundled js file
// and extract them to the memory file system at runtime.
import { loadAssets } from "./loadAssets";

loadAssets();

// server.js
const socketIo = require('socket.io');
const fs = require('fs');

// There are some troubles using the express framework. Here, we use a custom http handler as a workaround.
function app(req, res) {
  const path = req.url.split('?')[0];
  switch (path) {
    case '/':
      const html = fs.readFileSync('/public/index.html', 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
      break;
  }
}
const server = http.createServer(app);
const io = socketIo(server);

const players = {};
const columns = [];
const COLUMN_WIDTH = 50;
const COLUMN_GAP = 200;
const COLUMN_SPEED = 2;
const GRAVITY = 0.5;
const JUMP_STRENGTH = -10;

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function createColumn() {
  const height = Math.floor(Math.random() * 300) + 100;
  columns.push({ x: 800, y: height, width: COLUMN_WIDTH, gap: COLUMN_GAP });
}

function updateColumns() {
  columns.forEach(column => {
    column.x -= COLUMN_SPEED;
  });

  if (columns.length > 0 && columns[0].x + COLUMN_WIDTH < 0) {
    columns.shift();
  }

  if (columns.length === 0 || columns[columns.length - 1].x < 400) {
    createColumn();
  }
}

function checkCollision(player, column) {
  if (
    player.x < column.x + column.width &&
    player.x + 30 > column.x &&
    (player.y < column.y || player.y + 30 > column.y + column.gap)
  ) {
    return true;
  }
  return false;
}

io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  players[socket.id] = {
    x: 100,
    y: 300,
    velocity: 0,
    score: 0,
    color: getRandomColor(),
  };

  socket.emit('currentPlayers', players);
  socket.emit('currentColumns', columns);

  socket.broadcast.emit('newPlayer', { playerId: socket.id, playerInfo: players[socket.id] });

  socket.on('playerJump', () => {
    if (players[socket.id]) {
      players[socket.id].velocity = JUMP_STRENGTH;
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

function gameLoop() {
  Object.keys(players).forEach((playerId) => {
    const player = players[playerId];
    player.y += player.velocity;
    player.velocity += GRAVITY;

    if (player.y >= 580) {
      player.y = 580;
      player.velocity = 0;
    } else if (player.y <= 0) {
      player.y = 0;
      player.velocity = 0;
    }

    columns.forEach(column => {
      if (checkCollision(player, column)) {
        player.y = 300;
        player.velocity = 0;
        player.score = 0;
      }
    });

    player.score += 1;
  });

  updateColumns();

  io.emit('gameState', { players, columns });
}

setInterval(gameLoop, 1000 / 60); // 60 FPS

const CERT = `-----BEGIN CERTIFICATE-----
MIIBZzCCAQ2gAwIBAgIIbELHFTzkfHAwCgYIKoZIzj0EAwIwITEfMB0GA1UEAwwW
cmNnZW4gc2VsZiBzaWduZWQgY2VydDAgFw03NTAxMDEwMDAwMDBaGA80MDk2MDEw
MTAwMDAwMFowITEfMB0GA1UEAwwWcmNnZW4gc2VsZiBzaWduZWQgY2VydDBZMBMG
ByqGSM49AgEGCCqGSM49AwEHA0IABOoRzdEagFDZf/im79Z5JUyeXP96Yww6nH8X
ROvXOESnE0yFtlVjdj0NTNXT2m+PWzuxsjvPVBWR/tpDldjTW8CjLTArMCkGA1Ud
EQQiMCCCE2hlbGxvLndvcmxkLmV4YW1wbGWCCWxvY2FsaG9zdDAKBggqhkjOPQQD
AgNIADBFAiEAsuZKsdksPsrnJFdV9JTZ1P782IlqjqNL9aAURvrF3UkCIDDpTvE5
EyZ5zRflnB+ZwomjXNhTAnasRjQTDqXFrQbP
-----END CERTIFICATE-----`;

const KEY = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgH1VlVX/3DI37UR5g
tGzUOSAaOmjQbZMJQ2Z9eBnzh3+hRANCAATqEc3RGoBQ2X/4pu/WeSVMnlz/emMM
Opx/F0Tr1zhEpxNMhbZVY3Y9DUzV09pvj1s7sbI7z1QVkf7aQ5XY01vA
-----END PRIVATE KEY-----`;

const tlsConfig = {
  serverName: 'localhost',
  certificateChain: CERT,
  privateKey: KEY,
}

// Wapo doesn't support to listen on a port directly, but supports listening on a domain name
// with the corresponding TLS certificate.
server.listen(tlsConfig, () => {
  console.log('listening on ' + tlsConfig.serverName);
});
