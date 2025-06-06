// frontend_join_with_room_id.js
import React, { useEffect, useState } from 'react';
import { useHMSActions } from '@100mslive/react-sdk';
import RoomPage from './RoomPage';

function JoinButton() {
  const hmsActions = useHMSActions();
  const [token, setToken] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [status, setStatus] = useState("Fetching token...");
  const [joined, setJoined] = useState(false);
  const [role, setRole] = useState('audience');
  useEffect(() => {
    async function fetchToken() {

      try {
        const response = await fetch(`http://localhost:3001/api/get-token?role=${role}`);
        const data = await response.json();

        if (!response.ok || !data.token || !data.roomId) {
          throw new Error("Invalid token or roomId response");
        }

        console.log('📦 Full response from backend:', data);
        console.log('✅ Token:', data.token);
        console.log('🏷️ Room ID:', data.roomId);

        setToken(data.token);
        setRoomId(data.roomId);
        setStatus("Token ready. Click to join.");
      } catch (err) {
        console.error('❌ Fetch failed:', err);
        setStatus("Token fetch failed");
      }
    }

    fetchToken();
  }, [role]);
const joinRoom = async () => {
  if (!token) return;
  try {
    setStatus("Joining room...");
    await hmsActions.join({ userName: role, authToken: token });
    setStatus("Successfully joined the room!");
    console.log('🚪 Joined room:', roomId);
    setJoined(true);
  } catch (error) {
    console.error('❌ Join room failed:', error.message, error);
    if (error && error.description) {
      console.error('🔍 Description:', error.description);
    }
    setStatus(`Join room failed: ${error.message}`);
  }
};


  if (joined) {
    return <RoomPage role={role} token={token} />;
  }

  return (
    <div>
      <p>Status: {status}</p>
      <p>Room ID: {roomId}</p>
      <label>
        Role:
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="judge">Judge</option>
          <option value="speaker">Speaker</option>
          <option value="moderator">Moderator</option>
          <option value="audience">Audience</option>
        </select>
      </label>
      <button onClick={joinRoom} disabled={!token}>Join Debate Room</button>
    </div>
  );
}

function App() {
  return <JoinButton />;
}

export default App;
