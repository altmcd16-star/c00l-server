const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Multiplayer Game Server Online');
});

const wss = new WebSocket.Server({ server });

// Store all active players in memory: { playerId: { x, y, color } }
const players = {};

wss.on('connection', (ws) => {
  // 1. Give the new player a random ID and starting position
  const playerId = 'player_' + Math.random().toString(36).substring(2, 9);
  players[playerId] = {
    x: Math.floor(Math.random() * 400),
    y: Math.floor(Math.random() * 400),
    color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`
  };

  console.log(`${playerId} joined`);

  // 2. Send the new player their ID + the current list of all players
  ws.send(JSON.stringify({
    type: 'init',
    id: playerId,
    players: players
  }));

  // 3. Tell all OTHER players that someone new joined
  broadcast({
    type: 'playerJoined',
    id: playerId,
    data: players[playerId]
  }, ws);

  // 4. Listen for movement/action updates from this player
  ws.on('message', (rawMessage) => {
    try {
      const msg = JSON.parse(rawMessage);

      if (msg.type === 'move' && players[playerId]) {
        players[playerId].x = msg.x;
        players[playerId].y = msg.y;

        // Forward the new position to all other players
        broadcast({
          type: 'playerMoved',
          id: playerId,
          x: msg.x,
          y: msg.y
        }, ws);
      }
    } catch (err) {
      console.error('Invalid JSON received:', err);
    }
  });

  // 5. Clean up when the player disconnects
  ws.on('close', () => {
    console.log(`${playerId} left`);
    delete players[playerId];
    broadcast({ type: 'playerLeft', id: playerId });
  });
});

// Helper function to send data to everyone (optionally skipping the sender)
function broadcast(data, excludeWs = null) {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

server.listen(PORT, () => {
  console.log(`Game server listening on port ${PORT}`);
});
