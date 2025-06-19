const axios = require('axios');

let currentRoom = null;
let roomPromise = null;

async function createRoom() {
  const response = await axios.post(
    'https://api.100ms.live/v2/rooms',
    {
      name: `debate-room-${Date.now()}`,
      description: 'Real-time debate room',
      template_id: process.env.TEMPLATE_ID,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.MANAGEMENT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );
  currentRoom = response.data;
  return currentRoom;
}

async function getCurrentRoom(forceNew = false) {
  if (forceNew) {
    return createRoom();
  }
  if (currentRoom) {
    return currentRoom;
  }
  if (!roomPromise) {
    roomPromise = createRoom().then(room => {
      currentRoom = room;
      roomPromise = null;
      return room;
    });
  }
  return roomPromise;
}

module.exports = { createRoom, getCurrentRoom };
