import React, { useState } from 'react';
import { useHMSStore, selectPeers } from '@100mslive/react-sdk';

function RoomPage({ role, token }) {
  const peers = useHMSStore(selectPeers);
  const [speakerId, setSpeakerId] = useState('');
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState('');

  const submitScore = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ speakerId, score: Number(score) }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed');
      }
      setMessage('Score submitted');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const speak = () => {
    setMessage('Speaking...');
  };

  return (
    <div>
      <h2>Debate Room</h2>
      {peers.map(peer => (
        <div key={peer.id}>
          {peer.name} {peer.isLocal ? '(You)' : ''}
        </div>
      ))}
      {role === 'speaker' && (
        <button onClick={speak}>Speak</button>
      )}
      {role === 'judge' && (
        <div>
          <input
            placeholder="Speaker ID"
            value={speakerId}
            onChange={e => setSpeakerId(e.target.value)}
          />
          <input
            type="number"
            value={score}
            onChange={e => setScore(e.target.value)}
          />
          <button onClick={submitScore}>Submit Score</button>
        </div>
      )}
      {message && <p>{message}</p>}
    </div>
  );
}

export default RoomPage;
