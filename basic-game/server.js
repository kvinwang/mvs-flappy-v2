// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const players = {};
const columns = [];
const COLUMN_WIDTH = 50;
const COLUMN_GAP = 200;
const COLUMN_SPEED = 2;
const GRAVITY = 0.5;
const JUMP_STRENGTH = -10;

app.use(express.static(__dirname + '/public'));

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

server.listen(3000, () => {
  console.log('listening on *:3000');
});
