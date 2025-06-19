import React from 'react';
import { useVideo } from '@100mslive/react-sdk';
import Timer from './Timer';

export default function PeerTile({
  peer,
  isLocal,
  userName,
  activeSpeaker,
  timers,
  pauseTimes,
  isPaused,
}) {
  const { videoRef } = useVideo({ trackId: peer.videoTrack });

  const start = timers[activeSpeaker];
  const pauseTime = pauseTimes[activeSpeaker];
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
          transform: 'scaleX(-1)',
        }}
      />
      <div className="peer-info">
        <span className="peer-name">{displayName}</span>
        <span className="peer-role">{peer.roleName}</span>
      </div>

      <Timer
        startTime={start}
        isActive={isActiveSpeaker}
        pauseTime={pauseTime}
        isPaused={isPaused && isActiveSpeaker}
      />
    </div>
  );
}
