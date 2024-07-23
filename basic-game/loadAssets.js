import fs from "fs";

function toBytes(inline) {
    // format:
    // data:text/html;base64,PCFET0NUWVBFIG...
    const i = inline.indexOf(",");
    return atob(inline.slice(i + 1));
}

export function loadAssets() {
    fs.mkdirSync("/public");
    fs.writeFileSync("/public/index.html", toBytes(require("./public/index.html")));
    fs.mkdirSync("/client-dist");
    fs.writeFileSync("/client-dist/socket.io.js", toBytes(require("./socket.io.js.txt")));
}
