import React, { useState, useEffect } from 'react';
import { useVideo } from '@100mslive/react-sdk';

// Separate Timer component to avoid re-rendering the main component
const Timer = ({ startTime, isActive }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!isActive || !startTime) {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      const diff = Math.max(0, 120 - Math.floor((Date.now() - startTime) / 1000));
      const mins = String(Math.floor(diff / 60)).padStart(2, '0');
      const secs = String(diff % 60).padStart(2, '0');
      setTimeLeft(`${mins}:${secs}`);
    };

    updateTimer(); // Update immediately
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime, isActive]);

  if (!isActive || !timeLeft) return null;

  return <div className="peer-timer">{timeLeft}</div>;
};

export const PeerTile = ({ 
  peer, 
  isLocal, 
  userName, 
  activeSpeaker, 
  timers
}) => {
  const { videoRef } = useVideo({
    trackId: peer.videoTrack,
  });

  // Show timer for the active speaker regardless of whether it's local or remote
  const start = timers[activeSpeaker];
  const isActiveSpeaker = peer.id === activeSpeaker;

  const displayName = isLocal ? userName : peer.name;

  return (
    <div className={`peer-tile ${peer.id === activeSpeaker ? 'active' : ''}`}>
      <video
        ref={videoRef}
        autoPlay
        muted={isLocal}
        playsInline
        controls={false}
        className="peer-video"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: '8px',
          backgroundColor: '#1a1a1a',
          transform: 'scaleX(-1)'
        }}       
      />
      <div className="peer-info">
        <span className="peer-name">{displayName}</span>
        <span className="peer-role">{peer.roleName}</span>
      </div>
      <Timer startTime={start} isActive={isActiveSpeaker} />
    </div>
  );
}; 