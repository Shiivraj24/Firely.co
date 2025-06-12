import React, { useState } from 'react';
import CustomRoom from './CustomRoom';

function App() {
  const [role, setRole] = useState('audience');
  const [token, setToken] = useState('');
  const [roomId, setRoomId] = useState('');
  const [status, setStatus] = useState('');

  const joinRoom = async () => {
    setStatus('Fetching token...');
    try {
      const resp = await fetch(`http://localhost:3001/api/get-token?role=${role}`);
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to fetch token');
      }
      setToken(data.token);
      setRoomId(data.roomId);
      setStatus('');
    } catch (err) {
      console.error('Token fetch failed', err);
      setStatus('Token fetch failed');
    }
  };

  if (token) {
    return (
      <div style={{ height: '100vh' }}>
        <CustomRoom token={token} role={role} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      <label>
        Role:
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="judge">Judge</option>
          <option value="speaker">Speaker</option>
          <option value="moderator">Moderator</option>
          <option value="audience">Audience</option>
        </select>
      </label>
      <button onClick={joinRoom} style={{ marginLeft: '10px' }}>Join Room</button>
      {roomId && <p>Room: {roomId}</p>}
      {status && <p>{status}</p>}
    </div>
  );
}

export default App;
