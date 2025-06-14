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
  selectRemotePeers,
} from '@100mslive/react-sdk';
import './CustomRoom.css';

function RoomInner({ token, role, userName }) {
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);
  const localPeer = useHMSStore(selectLocalPeer);
  const remotepeer = useHMSStore(selectRemotePeers);
  const messages = useHMSStore(selectHMSMessages);
  const { isLocalAudioEnabled, isLocalVideoEnabled, toggleAudio, toggleVideo } = useAVToggle();
  const { amIScreenSharing, screenShareVideoTrackId, toggleScreenShare } = useScreenShare();
  const [chatInput, setChatInput] = useState('');
  const [timers, setTimers] = useState({});
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  const { sendEvent } = useCustomEvent({
    type: 'ACTIVE_SPEAKER',
    onEvent: data => {
      setActiveSpeaker(data.peerId);
      setTimers({ [data.peerId]: data.start });
    },
  });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!token) return;
    hmsActions.join({ authToken: token, userName });

    return () => {
      hmsActions.leave();
    };
  }, [token, hmsActions, userName]);

  // Add effect to handle timer pause when active speaker mutes
  useEffect(() => {
    if (!activeSpeaker || !localPeer) return;

    const handleAudioStateChange = () => {
      if (activeSpeaker === localPeer.id && !isLocalAudioEnabled) {
        // Pause timer when active speaker mutes
        setTimers(prev => {
          const newTimers = { ...prev };
          delete newTimers[activeSpeaker];
          return newTimers;
        });
        setActiveSpeaker(null);
      }
    };

    handleAudioStateChange();
  }, [isLocalAudioEnabled, activeSpeaker, localPeer]);

  const handleAudioToggle = useCallback(async () => {
    try {
      await hmsActions.setLocalAudioEnabled(!isLocalAudioEnabled);
    } catch (error) {
      console.error('Error toggling audio:', error);
    }
  }, [hmsActions, isLocalAudioEnabled]);

  const handleScreenShare = useCallback(async () => {
    try {
      await toggleScreenShare();
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  }, [toggleScreenShare]);

  const leaveRoom = useCallback(async () => {
    try {
      await hmsActions.leave();
      // Reset all states
      setChatInput('');
      setTimers({});
      setActiveSpeaker(null);
      setIsChatOpen(false);
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }, [hmsActions]);

  const handleSendMessage = useCallback(
    e => {
      e.preventDefault();
      if (chatInput.trim()) {
        hmsActions.sendBroadcastMessage(chatInput.trim());
        setChatInput('');
      }
    },
    [chatInput, hmsActions],
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
    hmsActions.setLocalAudioEnabled(activeSpeaker === localPeer.id);
  }, [activeSpeaker, hmsActions, localPeer]);

  // timer to switch to next speaker after 2 minutes
  useEffect(() => {
    if (!activeSpeaker) return;
    const start = timers[activeSpeaker];
    if (!start) return;
    if (activeSpeaker !== localPeer.id) return; // only active speaker's client controls switch

    const interval = setInterval(() => {
      if (now - start >= 120000) {
        const speakerPeers = peers
          .filter(p => p.roleName === 'speaker')
          .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
        const currentIndex = speakerPeers.findIndex(p => p.id === activeSpeaker);
        const nextIndex = (currentIndex + 1) % speakerPeers.length;
        const nextPeerId = speakerPeers[nextIndex].id;
        hmsActions.setLocalAudioEnabled(false);
        startSpeaker(nextPeerId);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSpeaker, timers, peers, startSpeaker, hmsActions, localPeer]);

  const PeerTile = ({ peer, isLocal }) => {
    const { videoRef } = useVideo({
      trackId: peer.videoTrack,
    });

    const start = timers[peer.id];
    let remaining = null;
    if (start) {
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

  if (!isConnected) {
    return <div>Connecting to room...</div>;
  }

  return (
    <div className="room-container">
      <div className="peers-grid">
        {peers
          .filter(peer => !peer.isLocal)
          .map(peer => (
            <PeerTile key={peer.id} peer={peer} isLocal={false} />
          ))}
        {localPeer && <PeerTile peer={localPeer} isLocal={true} />}
      </div>

      <div className="controls">
        <button onClick={handleAudioToggle} disabled={!localPeer}>
          {isLocalAudioEnabled ? 'Mute' : 'Unmute'}
        </button>
        <button onClick={toggleVideo} disabled={!localPeer}>
          {isLocalVideoEnabled ? 'Hide Video' : 'Show Video'}
        </button>
        <button onClick={handleScreenShare} disabled={!localPeer}>
          {amIScreenSharing ? 'Stop Share' : 'Share Screen'}
        </button>
        <button onClick={() => setIsChatOpen(!isChatOpen)}>Chat</button>
        <button onClick={leaveRoom}>Leave Room</button>
      </div>

      {isChatOpen && (
        <div className="chat-container">
          <div className="chat-header">
            <span>Chat</span>
            <button onClick={() => setIsChatOpen(false)}>×</button>
          </div>
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className="message">
                <div className="sender">{msg.senderName}</div>
                <div className="content">{msg.message}</div>
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Type a message..."
              onKeyPress={e => e.key === 'Enter' && handleSendMessage(e)}
            />
            <button onClick={handleSendMessage}>Send</button>
          </div>
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

export default function CustomRoom({ token, role, userName }) {
  return <RoomInner token={token} role={role} userName={userName} />;
}

