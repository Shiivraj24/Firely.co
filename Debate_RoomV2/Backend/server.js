require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { getCurrentRoom } = require('./utils/roomService');
const { generateToken, ROLE_MAP } = require('./utils/tokenService');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

app.get('/api/get-token', async (req, res) => {
  try {
    const forceNew = req.query.new === 'true';
    const appRole = req.query.role || 'audience';
    const roomIdParam = req.query.roomId;

    if (!ROLE_MAP[appRole]) {
      return res.status(400).json({ error: 'invalid role' });
    }

    const room = roomIdParam ? { id: roomIdParam } : await getCurrentRoom(forceNew);
    const userId = `user-${Date.now()}`;
    const token = generateToken(userId, room.id, appRole);

    res.json({ token, roomId: room.id });
  } catch (err) {
    console.error('Token generation failed:', err.response?.data || err.message);
    res.status(400).json({ error: 'Token generation failed', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
