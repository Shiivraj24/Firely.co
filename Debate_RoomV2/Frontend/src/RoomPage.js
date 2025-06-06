import React from 'react';
import { useHMSStore, selectPeers } from '@100mslive/react-sdk';

function RoomPage() {
  const peers = useHMSStore(selectPeers);

  return (
    <div>
      <h2>Debate Room</h2>
      {peers.map(peer => (
        <div key={peer.id}>
          {peer.name} {peer.isLocal ? '(You)' : ''}
        </div>
      ))}
    </div>
  );
}

export default RoomPage;
