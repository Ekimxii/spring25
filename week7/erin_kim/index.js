const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

mongoose.connect('mongodb://localhost:27017/chatbox', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

const messageSchema = new mongoose.Schema({
  nickname: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

let users = {};

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('a user connected');

  Message.find().sort({ timestamp: 1 }).limit(50).then(messages => {
    socket.emit('chat history', messages);
  });
  
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
    let nickname = users[socket.id] || 'Anonymous';
    console.log(`Message from ${nickname}: ${msg}`);

    const newMessage = new Message({ nickname, message: msg });
    newMessage.save().then(() => {
      io.emit('chat message', `${nickname}: ${msg}`);
    });
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