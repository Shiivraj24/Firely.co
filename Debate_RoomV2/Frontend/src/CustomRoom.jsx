import React, { useEffect, useState, useCallback } from 'react';
import {
  HMSRoomProvider,
  useHMSActions,
  useHMSStore,
  selectPeers,
  selectLocalPeer,
  selectIsConnectedToRoom,
  selectCameraStreamByPeerID,
  selectHMSMessages,
  useVideo,
  useAVToggle,
  useScreenShare,
  useCustomEvent,
} from '@100mslive/react-sdk';

function RoomInner({ token, role }) {
  const actions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);
  const localPeer = useHMSStore(selectLocalPeer);
  const messages = useHMSStore(selectHMSMessages);
  const { isLocalAudioEnabled, isLocalVideoEnabled, toggleAudio, toggleVideo } = useAVToggle();
  const { amIScreenSharing, screenShareVideoTrackId, toggleScreenShare } = useScreenShare();
  const [chatInput, setChatInput] = useState('');
  const [timers, setTimers] = useState({});

  const { sendEvent } = useCustomEvent({
    type: 'TIMER',
    onEvent: data => {
      setTimers(prev => ({ ...prev, [data.peerId]: data.start }));
    },
  });

  useEffect(() => {
    if (token && !isConnected) {
      actions.join({ authToken: token, userName: role });
    }
  }, [token, isConnected, actions, role]);

  const leaveRoom = () => {
    actions.leave();
  };

  const sendChat = useCallback(
    e => {
      e.preventDefault();
      if (chatInput.trim()) {
        actions.sendBroadcastMessage(chatInput.trim());
        setChatInput('');
      }
    },
    [chatInput, actions],
  );

  const startTimer = () => {
    if (!localPeer) return;
    const start = Date.now();
    sendEvent({ peerId: localPeer.id, start });
    setTimers(prev => ({ ...prev, [localPeer.id]: start }));
  };

  const PeerTile = ({ peer }) => {
    const videoTrack = useHMSStore(selectCameraStreamByPeerID(peer.id));
    const { videoRef } = useVideo({ trackId: videoTrack?.id });
    const start = timers[peer.id];
    let remaining = null;
    if (start) {
      const diff = Math.max(0, 60 - Math.floor((Date.now() - start) / 1000));
      const mins = String(Math.floor(diff / 60)).padStart(2, '0');
      const secs = String(diff % 60).padStart(2, '0');
      remaining = `${mins}:${secs}`;
    }
    return (
      <div style={{ display: 'inline-block', margin: '0 10px', textAlign: 'center' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={peer.isLocal}
          style={{ width: '200px', height: '150px', background: 'black' }}
        />
        <div>{peer.name} {peer.isLocal ? '(You)' : ''}</div>
        {remaining && <div>Timer: {remaining}</div>}
      </div>
    );
  };

  if (!isConnected) {
    return <div>Joining...</div>;
  }

  return (
    <div>
      <div>
        {peers.map(peer => (
          <PeerTile key={peer.id} peer={peer} />
        ))}
      </div>
      <div style={{ marginTop: '10px' }}>
        <button onClick={toggleAudio}>{isLocalAudioEnabled ? 'Mute' : 'Unmute'}</button>
        <button onClick={toggleVideo}>{isLocalVideoEnabled ? 'Hide Video' : 'Show Video'}</button>
        <button onClick={() => toggleScreenShare()}>{amIScreenSharing ? 'Stop Share' : 'Share Screen'}</button>
        <button onClick={leaveRoom}>Leave</button>
        {role === 'speaker' && <button onClick={startTimer}>Start Timer</button>}
      </div>
      {screenShareVideoTrackId && (
        <div style={{ marginTop: '10px' }}>
          <h3>Screen Share</h3>
          <ScreenShareView trackId={screenShareVideoTrackId} />
        </div>
      )}
      <div style={{ marginTop: '10px' }}>
        <div style={{ maxHeight: '150px', overflow: 'auto', border: '1px solid #ccc', padding: '5px' }}>
          {messages.map((m, i) => (
            <div key={i}>{m.senderName}: {m.message}</div>
          ))}
        </div>
        <form onSubmit={sendChat} style={{ marginTop: '5px' }}>
          <input value={chatInput} onChange={e => setChatInput(e.target.value)} />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}

function ScreenShareView({ trackId }) {
  const { videoRef } = useVideo({ trackId });
  return <video ref={videoRef} autoPlay playsInline style={{ width: '400px', height: '300px', background: 'black' }} />;
}

export default function CustomRoom({ token, role }) {
  return (
    <HMSRoomProvider>
      <RoomInner token={token} role={role} />
    </HMSRoomProvider>
  );
}
