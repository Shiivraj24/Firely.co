import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  HMSLogLevel,
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
  const [isJoining, setIsJoining] = useState(false);
  const joinAttempted = useRef(false);

  // Configure logging
  useEffect(() => {
    hmsActions.setLogLevel(HMSLogLevel.ERROR);
  }, [hmsActions]);

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
    let mounted = true;

    const joinRoom = async () => {
      if (!token || isJoining || isConnected || joinAttempted.current) return;
      
      try {
        setIsJoining(true);
        joinAttempted.current = true;
        await hmsActions.join({ authToken: token, userName });
      } catch (error) {
        console.error('Error joining room:', error);
        if (mounted) {
          joinAttempted.current = false;
        }
      } finally {
        if (mounted) {
          setIsJoining(false);
        }
      }
    };

    joinRoom();

    return () => {
      mounted = false;
      if (isConnected) {
        joinAttempted.current = false;
        hmsActions.leave();
      }
    };
  }, [token, hmsActions, userName, isConnected, isJoining]);

  const handleAudioStateChange = useCallback(() => {
    if (!activeSpeaker || !localPeer) return;
    if (localPeer.roleName !== 'speaker') return;
    if (activeSpeaker === localPeer.id && !isLocalAudioEnabled) {
      setTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[activeSpeaker];
        return newTimers;
      });
      setActiveSpeaker(null);
    }
  }, [activeSpeaker, localPeer, isLocalAudioEnabled]);

  useEffect(() => {
    handleAudioStateChange();
  }, [handleAudioStateChange]);

  const handleAudioToggle = useCallback(async () => {
    if (!isConnected) return;
    try {
      await hmsActions.setLocalAudioEnabled(!isLocalAudioEnabled);
    } catch (error) {
      console.error('Error toggling audio:', error);
    }
  }, [hmsActions, isLocalAudioEnabled, isConnected]);

  const handleScreenShare = useCallback(async () => {
    if (!isConnected) return;
    try {
      await toggleScreenShare();
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  }, [toggleScreenShare, isConnected]);

  const leaveRoom = useCallback(async () => {
    if (!isConnected) return;
    try {
      joinAttempted.current = false;
      await hmsActions.leave();
      setChatInput('');
      setTimers({});
      setActiveSpeaker(null);
      setIsChatOpen(false);
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }, [hmsActions, isConnected]);

  const handleSendMessage = useCallback(
    e => {
      e.preventDefault();
      if (!isConnected || !chatInput.trim()) return;
      hmsActions.sendBroadcastMessage(chatInput.trim());
      setChatInput('');
    },
    [chatInput, hmsActions, isConnected],
  );

  const startSpeaker = useCallback(
    peerId => {
      if (!isConnected) return;
      const start = Date.now();
      sendEvent({ peerId, start });
      setActiveSpeaker(peerId);
      setTimers({ [peerId]: start });
    },
    [sendEvent, isConnected],
  );

  useEffect(() => {
    if (!isConnected || activeSpeaker || !localPeer) return;
    if (localPeer.roleName !== 'speaker') return;

    const speakerPeers = peers
      .filter(p => p.roleName === 'speaker')
      .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));

    if (speakerPeers.length > 0 && localPeer.id === speakerPeers[0].id) {
      startSpeaker(localPeer.id);
    }
  }, [peers, activeSpeaker, startSpeaker, localPeer, isConnected]);

  const updateAudioState = useCallback(async () => {
    if (!isConnected || !localPeer) return;
    if (localPeer.roleName !== 'speaker') return;
    
    const shouldBeEnabled = activeSpeaker === localPeer.id;
    if (shouldBeEnabled !== isLocalAudioEnabled) {
      try {
        await hmsActions.setLocalAudioEnabled(shouldBeEnabled);
      } catch (error) {
        console.error('Error updating audio state:', error);
      }
    }
  }, [activeSpeaker, hmsActions, localPeer, isConnected, isLocalAudioEnabled]);

  useEffect(() => {
    updateAudioState();
  }, [updateAudioState]);

  useEffect(() => {
    if (!isConnected || !activeSpeaker || !localPeer) return;
    if (localPeer.roleName !== 'speaker') return;
    
    const start = timers[activeSpeaker];
    if (!start || activeSpeaker !== localPeer.id) return;

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
  }, [activeSpeaker, timers, peers, startSpeaker, hmsActions, localPeer, isConnected, now]);

  const PeerTile = ({ peer, isLocal }) => {
    const { videoRef } = useVideo({
      trackId: peer.videoTrack,
    });

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
      controls={false}
      style={{ width: '100%', maxHeight: '70vh' }}
    />
  );
}

export default function CustomRoom({ token, role, userName }) {
  return <RoomInner token={token} role={role} userName={userName} />;
}

