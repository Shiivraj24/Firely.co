import React, { useState, useEffect } from 'react';
import { HMSRoomProvider } from '@100mslive/react-sdk';
import CustomRoom from './components/CustomRoom';
import InviteLink from './components/InviteLink';


function App() {
  const [role, setRole] = useState('audience');
  const [token, setToken] = useState('');
  const [roomId, setRoomId] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get('roomId');
    const r = params.get('role');
    if (rid) setRoomId(rid);
    if (r) setRole(r);
  }, []);

  const joinRoom = async () => {
    if (!userName.trim()) {
      setStatus('Please enter your name');
      return;
    }
    setIsLoading(true);
    setStatus('Fetching token...');
    try {
      const roomParam = roomId ? `&roomId=${roomId}` : '';
      const resp = await fetch(
        `http://localhost:3001/api/get-token?role=${role}${roomParam}&name=${encodeURIComponent(userName.trim())}`
      );
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
          <InviteLink roomId={roomId} />
          <CustomRoom token={token} role={role} userName={userName} />
        </div>
      ) : (
        <div className="join-container">
          <div className="join-card">
            <h1>Join Debate Room</h1>
            <div className="form-group">
              <label>
                Your name
                <input
                  type="text"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="Your name"
                />
              </label>
            </div>
            <div className="form-group">
              <label>
                Select your role
                <select value={role} onChange={e => setRole(e.target.value)}>
                  <option value="judge">Judge</option>
                  <option value="speaker">Speaker</option>
                  <option value="moderator">Moderator</option>
                  <option value="audience">Audience</option>
                </select>
              </label>
            </div>
            <button className="join-button" onClick={joinRoom} disabled={isLoading}>
              {isLoading ? 'Joining...' : 'Join Room'}
            </button>
            {status && <p className="status-message">{status}</p>}
            {roomId && (
              <p className="room-info">
                Room ID: <code>{roomId}</code>
              </p>
            )}
          </div>
        </div>
      )}
    </HMSRoomProvider>
  );
}

export default App;
