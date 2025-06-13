import React, { useState } from 'react';
import { HMSRoomProvider } from '@100mslive/react-sdk';
import CustomRoom from './components/CustomRoom';

function App() {
  const [role, setRole] = useState('audience');
  const [token, setToken] = useState('');
  const [roomId, setRoomId] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const joinRoom = async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <HMSRoomProvider>
      {token ? (
        <div style={{ height: '100vh' }}>
          <CustomRoom token={token} role={role} />
        </div>
      ) : (
        <div style={{ padding: '20px' }}>
          <h1>Join Debate Room</h1>
          <div>
            <label>
              Select your role:
              <select value={role} onChange={e => setRole(e.target.value)}>
                <option value="judge">Judge</option>
                <option value="speaker">Speaker</option>
                <option value="moderator">Moderator</option>
                <option value="audience">Audience</option>
              </select>
            </label>
            <button onClick={joinRoom} disabled={isLoading}>
              {isLoading ? 'Joining...' : 'Join Room'}
            </button>
            {status && <p>{status}</p>}
            {roomId && <p>Room ID: {roomId}</p>}
          </div>
        </div>
      )}
    </HMSRoomProvider>
  );
}

export default App;
