import React, { useEffect, useState, useCallback } from 'react';
import {
  useHMSStore,
  selectPeers,
  useHMSActions,
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
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const { sendEvent } = useCustomEvent({
    type: 'ACTIVE_SPEAKER',
    onEvent: data => {
      setActiveSpeaker(data.peerId);
      setTimers({ [data.peerId]: data.start });
    },
  });

  useEffect(() => {
    if (token && !isConnected) {
      actions.join({ authToken: token, userName: role });
    }

    // Cleanup function
    return () => {
      if (isConnected) {
        actions.leave();
      }
    };
  }, [token, isConnected, actions, role]);

  const leaveRoom = useCallback(async () => {
    try {
      await actions.leave();
      // Reset all states
      setChatInput('');
      setTimers({});
      setIsChatOpen(false);
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }, [actions]);

  const handleScreenShare = useCallback(async () => {
    try {
      await toggleScreenShare();
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  }, [toggleScreenShare]);

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

  const startSpeaker = useCallback(
    peerId => {
      const start = Date.now();
      sendEvent({ peerId, start });
      setActiveSpeaker(peerId);
      setTimers({ [peerId]: start });
    },
    [sendEvent],
  );

  // determine speaker order and start the first speaker automatically
  useEffect(() => {
    const speakerPeers = peers
      .filter(p => p.roleName === 'speaker')
      .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
    if (!activeSpeaker && speakerPeers.length > 0 && localPeer) {
      if (localPeer.id === speakerPeers[0].id) {
        startSpeaker(localPeer.id);
      }
    }
  }, [peers, activeSpeaker, startSpeaker, localPeer]);

  // automatically mute/unmute local peer based on active speaker
  useEffect(() => {
    if (!localPeer) return;
    actions.setLocalAudioEnabled(activeSpeaker === localPeer.id);
  }, [activeSpeaker, actions, localPeer]);

  // timer to switch to next speaker after 2 minutes
  useEffect(() => {
    if (!activeSpeaker) return;
    const start = timers[activeSpeaker];
    if (!start) return;
    if (activeSpeaker !== localPeer.id) return; // only active speaker's client controls switch

    const interval = setInterval(() => {
      if (Date.now() - start >= 120000) {
        const speakerPeers = peers
          .filter(p => p.roleName === 'speaker')
          .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
        const currentIndex = speakerPeers.findIndex(p => p.id === activeSpeaker);
        const nextIndex = (currentIndex + 1) % speakerPeers.length;
        const nextPeerId = speakerPeers[nextIndex].id;
        actions.setLocalAudioEnabled(false);
        startSpeaker(nextPeerId);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSpeaker, timers, peers, startSpeaker, actions, localPeer]);

  const PeerTile = ({ peer, isLocal }) => {
    const videoTrack = useHMSStore(selectCameraStreamByPeerID(peer.id));
    const { videoRef } = useVideo({ trackId: videoTrack?.id });
    const start = timers[peer.id];
    let remaining = null;
    if (start) {
      const diff = Math.max(0, 120 - Math.floor((Date.now() - start) / 1000));
      const mins = String(Math.floor(diff / 60)).padStart(2, '0');
      const secs = String(diff % 60).padStart(2, '0');
      remaining = `${mins}:${secs}`;
    }

    return (
      <div style={{ position: 'relative', width: isLocal ? '160px' : '100%' }}>
        <div style={{ 
          width: '100%', 
          height: isLocal ? '120px' : 'auto',
          transform: isLocal ? 'scaleX(-1)' : 'none',
        }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
        <div style={{ 
          position: 'absolute', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          background: 'rgba(0,0,0,0.5)', 
          color: 'white', 
          padding: '4px',
        }}>
          {peer.name} {isLocal ? '(You)' : ''}
        </div>
        {remaining && (
          <div style={{ 
            position: 'absolute', 
            top: 4, 
            right: 4, 
            background: 'orange', 
            padding: '2px 4px', 
            borderRadius: '4px',
          }}>
            {remaining}
          </div>
        )}
      </div>
    );
  };

  if (!isConnected) {
    return <div>Connecting to room...</div>;
  }

  return (
    <div>
      <div style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>
        <h2>Debate Room - {role}</h2>
        <div>
          <button onClick={toggleAudio}>{isLocalAudioEnabled ? 'Mute' : 'Unmute'}</button>
          <button onClick={toggleVideo}>{isLocalVideoEnabled ? 'Hide Video' : 'Show Video'}</button>
          <button onClick={handleScreenShare}>{amIScreenSharing ? 'Stop Share' : 'Share Screen'}</button>
          <button onClick={() => setIsChatOpen(!isChatOpen)}>Chat</button>
          <button onClick={leaveRoom}>Leave Room</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '10px' }}>
        {peers.map(peer => (
          <PeerTile key={peer.id} peer={peer} isLocal={peer.isLocal} />
        ))}
      </div>

      {screenShareVideoTrackId && (
        <div style={{ padding: '10px' }}>
          <h3>Screen Share</h3>
          <ScreenShareView trackId={screenShareVideoTrackId} />
        </div>
      )}

      {isChatOpen && (
        <div style={{ position: 'fixed', right: '10px', top: '80px', bottom: '10px', width: '300px', background: 'white', border: '1px solid #ccc' }}>
          <div style={{ height: 'calc(100% - 50px)', overflowY: 'auto', padding: '10px' }}>
            {messages.map((m, i) => (
              <div key={i}>
                <strong>{m.senderName}:</strong> {m.message}
              </div>
            ))}
          </div>
          <form onSubmit={sendChat} style={{ padding: '10px', borderTop: '1px solid #ccc' }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Type your message..."
              style={{ width: 'calc(100% - 60px)' }}
            />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
    </div>
  );
}

function ScreenShareView({ trackId }) {
  const { videoRef } = useVideo({ trackId });
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      style={{ width: '100%', maxHeight: '70vh' }}
    />
  );
}

export default function CustomRoom({ token, role }) {
  return <RoomInner token={token} role={role} />;
} 