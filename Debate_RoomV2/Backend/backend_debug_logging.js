// backend_debug_logging.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;

const MANAGEMENT_API_TOKEN = process.env.MANAGEMENT_TOKEN;
const TEMPLATE_ID = process.env.TEMPLATE_ID;
const ACCESS_KEY = process.env.APP_ACCESS_KEY;
const APP_SECRET = process.env.APP_SECRET;

// Cache the last created room so we don't create a new one for every request
let currentRoom = null;
let roomPromise = null; // ensure only one room is created at a time
// In-memory storage for speaker scores
const scores = {};
// Mapping from app roles to 100ms roles
const ROLE_MAP = {
  judge: 'host',
  speaker: 'host',
  moderator: 'host',
  audience: 'guest'
};

console.log('[ENV] MANAGEMENT_API_TOKEN:', MANAGEMENT_API_TOKEN ? '✅ Loaded' : '❌ Missing');
console.log('[ENV] TEMPLATE_ID:', TEMPLATE_ID ? '✅ Loaded' : '❌ Missing');
console.log('[ENV] ACCESS_KEY:', ACCESS_KEY ? '✅ Loaded' : '❌ Missing');
console.log('[ENV] APP_SECRET:', APP_SECRET ? '✅ Loaded' : '❌ Missing');

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

async function createRoom() {
  console.log('🔧 Creating room...');
  const response = await axios.post(
    'https://api.100ms.live/v2/rooms',
    {
      name: 'debate-room-' + Date.now(),
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
  console.log('✅ Room created:', response.data);
  currentRoom = response.data;
  return currentRoom;
}

async function getCurrentRoom(forceNew = false) {
  if (forceNew) {
    currentRoom = await createRoom();
    return currentRoom;
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
function generateToken(userId, roomId, appRole = 'audience') {
  const hmsRole = ROLE_MAP[appRole] || 'guest';
  const payload = {
    access_key: process.env.APP_ACCESS_KEY,
    room_id: roomId,
    user_id: userId,
    role: hmsRole,
    app_role: appRole,
    type: 'app',
    version: 2,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
    jti: `${userId}-${Date.now()}`
  };

  const token = jwt.sign(payload, process.env.APP_SECRET, { algorithm: "HS256" });
  console.log(`[TOKEN] Generated for role "${appRole}" user ${userId} in room ${roomId}`);
  return token;
}

app.get('/api/get-token', async (req, res) => {
  try {
    const forceNew = req.query.new === 'true';
    const appRole = req.query.role || 'audience';
    if (!ROLE_MAP[appRole]) {
      return res.status(400).json({ error: 'invalid role' });
    }
    // Reuse the existing room if available unless a new one is requested
    const room = await getCurrentRoom(forceNew);
    console.log(`[ROOM] Using room ${room.id}`);
    const userId = 'user-' + Date.now();
    const token = generateToken(userId, room.id, appRole);
    res.json({ token, roomId: room.id });
  } catch (err) {
    console.error('❌ Token generation failed:', err.response?.data || err.message);
    res.status(400).json({ error: 'Token generation failed', details: err.message });
  }
});

// Endpoint for judges to submit scores for speakers
app.post('/api/score', (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.APP_SECRET);
    if (decoded.app_role !== 'judge') {
      return res.status(403).json({ error: 'Only judges can score' });
    }

    const { speakerId, score } = req.body;
    if (!speakerId || typeof score !== 'number') {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    if (!scores[speakerId]) {
      scores[speakerId] = [];
    }
    scores[speakerId].push(score);
    res.json({ success: true });
  } catch (err) {
    console.error('Score submission failed:', err.message);
    res.status(400).json({ error: 'Score submission failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
