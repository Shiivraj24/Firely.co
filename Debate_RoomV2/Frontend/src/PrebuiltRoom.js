import React from 'react';

function PrebuiltRoom({ roomId, token }) {
  if (!roomId || !token) return null;
  const url = `https://app.100ms.live/preview/${roomId}?authToken=${token}&skip_preview=true`;
  return (
    <iframe
      src={url}
      title="100ms Prebuilt"
      style={{ width: '100%', height: '100vh', border: '0' }}
      allow="camera; microphone; fullscreen; display-capture"
    />
  );
}

export default PrebuiltRoom;

