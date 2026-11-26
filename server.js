const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading index.html');
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else if (req.url === '/client.js') {
    fs.readFile(path.join(__dirname, 'client.js'), (err, data) => {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading client.js');
      }
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const wss = new WebSocket.Server({ server });
const players = {};

wss.on('connection', (ws) => {
  const playerId = 'player_' + Math.random().toString(36).substring(2, 9);
  players[playerId] = {
    x: Math.floor(Math.random() * 400),
    y: Math.floor(Math.random() * 400),
    color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`
  };

  ws.send(JSON.stringify({
    type: 'init',
    id: playerId,
    players: players
  }));

  broadcast({
    type: 'playerJoined',
    id: playerId,
    data: players[playerId]
  }, ws);

  ws.on('message', (rawMessage) => {
    try {
      const msg = JSON.parse(rawMessage);
      if (msg.type === 'move' && players[playerId]) {
        players[playerId].x = msg.x;
        players[playerId].y = msg.y;

        broadcast({
          type: 'playerMoved',
          id: playerId,
          x: msg.x,
          y: msg.y
        }, ws);
      }
    } catch (err) {
      console.error('Invalid JSON:', err);
    }
  });

  ws.on('close', () => {
    delete players[playerId];
    broadcast({ type: 'playerLeft', id: playerId });
  });
});

function broadcast(data, excludeWs = null) {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

server.listen(PORT, () => {
  console.log(`Game server running on port ${PORT}`);
});
