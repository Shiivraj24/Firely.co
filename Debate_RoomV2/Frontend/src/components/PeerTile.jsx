import React from 'react';
import { useVideo } from '@100mslive/react-sdk';

export const PeerTile = ({ 
  peer, 
  isLocal, 
  userName, 
  activeSpeaker, 
  timers, 
  now 
}) => {
  const { videoRef } = useVideo({
    trackId: peer.videoTrack,
  });

  // Show timer for the active speaker regardless of whether it's local or remote
  const start = timers[activeSpeaker];
  let remaining = null;
  if (start && peer.id === activeSpeaker) {
    const diff = Math.max(0, 120 - Math.floor((now - start) / 1000));
    const mins = String(Math.floor(diff / 60)).padStart(2, '0');
    const secs = String(diff % 60).padStart(2, '0');
    remaining = `${mins}:${secs}`;
  }

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
      {remaining && <div className="peer-timer">{remaining}</div>}
    </div>
  );
}; 