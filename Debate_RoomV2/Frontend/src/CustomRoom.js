import React, { useEffect } from 'react';
import {
  HMSRoomProvider,
  useHMSStore,
  useHMSActions,
  selectPeers,
  selectIsConnectedToRoom,
  useVideo
} from '@100mslive/react-sdk';

const PeerTile = ({ peer }) => {
  const { videoRef } = useVideo({ trackId: peer.videoTrack });
  return (
    <div style={{ display: 'inline-block', margin: '10px', textAlign: 'center' }}>
      <video ref={videoRef} autoPlay playsInline muted={peer.isLocal} style={{ width: '200px' }} />
      <div>{peer.name}</div>
    </div>
  );
};

const RoomInner = ({ token }) => {
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);

  useEffect(() => {
    if (token && !isConnected) {
      hmsActions.join({ authToken: token, userName: 'Guest' });
    }
  }, [token, isConnected, hmsActions]);

  if (!isConnected) {
    return <div>Joining room...</div>;
  }

  return (
    <div>
      {peers.map(peer => (
        <PeerTile key={peer.id} peer={peer} />
      ))}
    </div>
  );
};

export default function CustomRoom({ token }) {
  if (!token) return null;
  return (
    <HMSRoomProvider>
      <RoomInner token={token} />
    </HMSRoomProvider>
  );
}
