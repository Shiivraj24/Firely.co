// frontend_join_with_room_id.js
import React, { useEffect, useState ,useRef} from 'react';
import { HMSRoomProvider, useHMSActions } from '@100mslive/react-sdk';

function JoinButton() {
  const hmsActions = useHMSActions();
  const [token, setToken] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [status, setStatus] = useState("Fetching token...");
  const fetchedRef = useRef(false);

  useEffect(() => {
     if (fetchedRef.current) return; // prevent multiple calls
  fetchedRef.current = true;

    async function fetchToken() {

      try {
        const response = await fetch('http://localhost:3001/api/get-token');
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
  }, []);
const joinRoom = async () => {
  if (!token) return;
  try {
    setStatus("Joining room...");
    await hmsActions.join({ userName: 'shivraj', authToken: token });
    setStatus("Successfully joined the room!");
    console.log('🚪 Joined room:', roomId);
  } catch (error) {
    console.error('❌ Join room failed:', error.message, error);
    if (error && error.description) {
      console.error('🔍 Description:', error.description);
    }
    setStatus(`Join room failed: ${error.message}`);
  }
};


  return (
    <div>
      <p>Status: {status}</p>
      <p>Room ID: {roomId}</p>
      <button onClick={joinRoom} disabled={!token}>Join Debate Room</button>
    </div>
  );
}

function App() {
  return (
    <HMSRoomProvider>
      <JoinButton />
    </HMSRoomProvider>
  );
}

export default App;
