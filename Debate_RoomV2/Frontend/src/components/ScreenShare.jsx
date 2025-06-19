import React from 'react';
import { useVideo } from '@100mslive/react-sdk';

export default function ScreenShare({ trackId }) {
  const { videoRef } = useVideo({ trackId });
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      controls={false}
      style={{ width: '100%', maxHeight: '70vh' }}
    />
  );
}
