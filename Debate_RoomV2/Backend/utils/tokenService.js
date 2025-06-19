const jwt = require('jsonwebtoken');

const ROLE_MAP = {
  judge: 'judge',
  speaker: 'speaker',
  moderator: 'moderator',
  audience: 'audience'
};

function generateToken(userId, roomId, appRole = 'audience') {
  const hmsRole = ROLE_MAP[appRole] || 'guest';
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    access_key: process.env.APP_ACCESS_KEY,
    room_id: roomId,
    user_id: userId,
    role: hmsRole,
    app_role: appRole,
    type: 'app',
    version: 2,
    iat: now - 30,
    exp: now + 60 * 60,
    jti: `${userId}-${Date.now()}`
  };

  return jwt.sign(payload, process.env.APP_SECRET, { algorithm: 'HS256' });
}

module.exports = { generateToken, ROLE_MAP };
