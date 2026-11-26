// Replace with your actual Render URL
const socket = new WebSocket('wss://://onrender.com');

let myId = null;
let allPlayers = {};

socket.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === 'init') {
    myId = msg.id;
    allPlayers = msg.players;
    console.log('Joined as:', myId, 'Current players:', allPlayers);
  } 
  else if (msg.type === 'playerJoined') {
    allPlayers[msg.id] = msg.data;
  } 
  else if (msg.type === 'playerMoved') {
    if (allPlayers[msg.id]) {
      allPlayers[msg.id].x = msg.x;
      allPlayers[msg.id].y = msg.y;
    }
  } 
  else if (msg.type === 'playerLeft') {
    delete allPlayers[msg.id];
  }
});

// Call this function whenever your local player moves (e.g., on arrow key press)
function sendMove(newX, newY) {
  if (myId && socket.readyState === WebSocket.OPEN) {
    // Update locally right away so movement feels instant
    allPlayers[myId].x = newX;
    allPlayers[myId].y = newY;

    // Tell the server so other players see it
    socket.send(JSON.stringify({
      type: 'move',
      x: newX,
      y: newY
    }));
  }
}
