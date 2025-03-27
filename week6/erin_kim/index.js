const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

let users = {};

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('a user connected');
  
  socket.on('set nickname', (nickname) => {
    users[socket.id] = nickname || 'Anonymous';
    console.log(`${nickname} connected.`);

    socket.broadcast.emit('chat message', `${nickname} has joined the chat!`);

    io.emit('user list', Object.values(users));
  });

  socket.on('typing', () => {
    let username = users[socket.id] || 'Anonymous'; 
    socket.broadcast.emit('typing', username); 
  });

  socket.on('chat message', (msg) => {
    console.log('message: ' + msg);
    io.emit('chat message', msg);
  });

  socket.on('private message', (data) => {
    const { recipient, message } = data;
    for (let id in users) {
      if (users[id] === recipient) {
        io.to(id).emit('chat message', `Private message from ${users[socket.id]}: ${message}`);
        socket.emit('chat message', `Private message to ${recipient}: ${message}`);
        break;
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
    socket.broadcast.emit('chat message', `${users[socket.id]} has disconnected`);
    delete users[socket.id];

    io.emit('user list', Object.values(users));
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});