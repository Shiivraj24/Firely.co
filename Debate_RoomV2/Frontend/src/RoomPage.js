import React, { useState } from 'react';
import {
  useHMSStore,
  selectPeers,
  selectCameraStreamByPeerID,
  useVideo,
  useAVToggle,
  useScreenShare,
} from '@100mslive/react-sdk';

function RoomPage({ role, token }) {
  const peers = useHMSStore(selectPeers);
  const [speakerId, setSpeakerId] = useState('');
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState('');
  const { isLocalAudioEnabled, isLocalVideoEnabled, toggleAudio, toggleVideo } =
    useAVToggle();
  const {
    amIScreenSharing,
    screenShareVideoTrackId,
    toggleScreenShare,
  } = useScreenShare();

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

  const PeerTile = ({ peer }) => {
    const videoTrack = useHMSStore(selectCameraStreamByPeerID(peer.id));
    const { videoRef } = useVideo({ trackId: videoTrack?.id });
    return (
      <div style={{ display: 'inline-block', margin: '0 10px' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={peer.isLocal}
          style={{ width: '200px', height: '150px', background: 'black' }}
        />
        <div>{peer.name} {peer.isLocal ? '(You)' : ''}</div>
      </div>
    );
  };

  const Controls = () => (
    <div style={{ marginTop: '10px' }}>
      {toggleAudio && (
        <button onClick={toggleAudio}>
          {isLocalAudioEnabled ? 'Mute' : 'Unmute'}
        </button>
      )}
      {toggleVideo && (
        <button onClick={toggleVideo}>
          {isLocalVideoEnabled ? 'Hide Camera' : 'Show Camera'}
        </button>
      )}
      {toggleScreenShare && (
        <button onClick={() => toggleScreenShare()}>
          {amIScreenSharing ? 'Stop Share' : 'Share Screen'}
        </button>
      )}
    </div>
  );

  const ScreenShareView = () => {
    const { videoRef } = useVideo({ trackId: screenShareVideoTrackId });
    if (!screenShareVideoTrackId) return null;
    return (
      <div style={{ marginTop: '10px' }}>
        <h3>Screen Share</h3>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ width: '400px', height: '300px', background: 'black' }}
        />
      </div>
    );
  };

  return (
    <div>
      <h2>Debate Room</h2>
      <div>
        {peers.map(peer => (
          <PeerTile key={peer.id} peer={peer} />
        ))}
      </div>
      <Controls />
      <ScreenShareView />
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
