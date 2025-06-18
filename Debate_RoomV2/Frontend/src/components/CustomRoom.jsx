import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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

// Separate Timer component to avoid re-rendering the main component
const Timer = ({ startTime, isActive, pauseTime, isPaused }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!isActive || !startTime) {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      let elapsedTime;
      if (isPaused && pauseTime) {
        // If paused, calculate elapsed time up to when it was paused
        elapsedTime = Math.floor((pauseTime - startTime) / 1000);
      } else {
        // If not paused, calculate current elapsed time
        elapsedTime = Math.floor((Date.now() - startTime) / 1000);
      }
      
      const diff = Math.max(0, 120 - elapsedTime);
      const mins = String(Math.floor(diff / 60)).padStart(2, '0');
      const secs = String(diff % 60).padStart(2, '0');
      setTimeLeft(`${mins}:${secs}`);
    };

    updateTimer(); // Update immediately
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime, isActive, pauseTime, isPaused]);

  if (!isActive || !timeLeft) return null;

  return (
    <div className="peer-timer">
      {timeLeft}
      {isPaused && <span style={{ fontSize: '0.8em', marginLeft: '5px' }}>(PAUSED)</span>}
    </div>
  );
};

// Separate PeerTile component to prevent re-creation on every render
const PeerTile = ({ peer, isLocal, userName, activeSpeaker, timers, pauseTimes, isPaused }) => {
  const { videoRef } = useVideo({
    trackId: peer.videoTrack,
  });

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
          transform: 'scaleX(-1)'
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
};

// Display and optionally control the speaking order
const SpeakingOrder = ({ order, peers, isModerator, onMove, onStart }) => {
  const getPeer = id => peers.find(p => p.id === id);
  return (
    <div className="speaking-order">
      <h3>Speaking Order</h3>
      <ol>
        {order.map((id, idx) => {
          const peer = getPeer(id);
          if (!peer) return null;
          return (
            <li key={id}>
              {peer.name}
              {isModerator && (
                <>
                  <button onClick={() => onMove(idx, idx - 1)} disabled={idx === 0}>↑</button>
                  <button onClick={() => onMove(idx, idx + 1)} disabled={idx === order.length - 1}>↓</button>
                  <button onClick={() => onStart(id)}>Start</button>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

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
  const [pauseTimes, setPauseTimes] = useState({});
  const [isPaused, setIsPaused] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const joinAttempted = useRef(false);
  const [speakerOrder, setSpeakerOrder] = useState([]);

  // Configure logging
  useEffect(() => {
    hmsActions.setLogLevel(HMSLogLevel.ERROR);
  }, [hmsActions]);

  // Memoize the onEvent callback to prevent infinite re-renders
  const handleCustomEvent = useCallback((data) => {
    setActiveSpeaker(data.peerId);
    setTimers({ [data.peerId]: data.start });
    // Reset pause state when a new speaker starts
    setPauseTimes({});
    setIsPaused(false);
  }, []);

  const { sendEvent } = useCustomEvent({
    type: 'ACTIVE_SPEAKER',
    onEvent: handleCustomEvent,
  });

  const handleOrderEvent = useCallback((data) => {
    setSpeakerOrder(data.order || []);
  }, []);

  const { sendEvent: sendOrderEvent } = useCustomEvent({
    type: 'SPEAKER_ORDER',
    onEvent: handleOrderEvent,
  });

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

  const handleAudioToggle = useCallback(async () => {
    if (!isConnected) return;
    try {
      await hmsActions.setLocalAudioEnabled(!isLocalAudioEnabled);
      
      // Handle timer pause/resume for active speaker
      if (activeSpeaker === localPeer?.id) {
        if (isLocalAudioEnabled) {
          // Speaker is about to be muted - pause the timer
          setPauseTimes(prev => ({
            ...prev,
            [activeSpeaker]: Date.now()
          }));
          setIsPaused(true);
        } else {
          // Speaker is about to be unmuted - resume the timer
          const pauseTime = pauseTimes[activeSpeaker];
          if (pauseTime) {
            // Calculate how much time was paused and adjust the start time
            const pausedDuration = Date.now() - pauseTime;
            const originalStart = timers[activeSpeaker];
            const adjustedStart = originalStart + pausedDuration;
            
            // Update the timer with the adjusted start time
            setTimers(prev => ({
              ...prev,
              [activeSpeaker]: adjustedStart
            }));
          }
          
          // Clear the pause time
          setPauseTimes(prev => {
            const newPauseTimes = { ...prev };
            delete newPauseTimes[activeSpeaker];
            return newPauseTimes;
          });
          setIsPaused(false);
        }
      }
    } catch (error) {
      console.error('Error toggling audio:', error);
    }
  }, [hmsActions, isLocalAudioEnabled, isConnected, activeSpeaker, localPeer, pauseTimes, timers]);

  const handleScreenShare = useCallback(async () => {
    if (!isConnected) return;
    try {
      await toggleScreenShare();
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  }, [toggleScreenShare, isConnected]);

  const moveSpeaker = useCallback((from, to) => {
    setSpeakerOrder(prev => {
      const updated = [...prev];
      if (to < 0 || to >= updated.length) return prev;
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      if (role === 'moderator') {
        sendOrderEvent({ order: updated });
      }
      return updated;
    });
  }, [role, sendOrderEvent]);

  const startFromModerator = useCallback(peerId => {
    startSpeaker(peerId);
    if (role === 'moderator') {
      sendOrderEvent({ order: speakerOrder });
    }
  }, [startSpeaker, role, sendOrderEvent, speakerOrder]);

  const leaveRoom = useCallback(async () => {
    if (!isConnected) return;
    try {
      joinAttempted.current = false;
      await hmsActions.leave();
      setChatInput('');
      setTimers({});
      setPauseTimes({});
      setIsPaused(false);
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
      // Prevent starting the same speaker again
      if (activeSpeaker === peerId) return;
      
      const start = Date.now();
      sendEvent({ peerId, start });
      setActiveSpeaker(peerId);
      setTimers({ [peerId]: start });
      // Reset pause state for new speaker
      setPauseTimes({});
      setIsPaused(false);
    },
    [sendEvent, isConnected, activeSpeaker],
  );

  // Use a ref to track if we've already started a speaker to prevent infinite loops
  const hasStartedSpeaker = useRef(false);

  // Maintain the list of speaker IDs as peers join or leave
  useEffect(() => {
    if (!isConnected) return;
    const speakerPeers = peers.filter(p => p.roleName === 'speaker');
    setSpeakerOrder(prev => {
      let order = prev.filter(id => speakerPeers.some(p => p.id === id));
      speakerPeers.forEach(p => {
        if (!order.includes(p.id)) order.push(p.id);
      });
      return order;
    });
  }, [peers, isConnected]);

  useEffect(() => {
    if (role !== 'moderator') return;
    if (!isConnected) return;
    sendOrderEvent({ order: speakerOrder });
  }, [speakerOrder, role, isConnected, sendOrderEvent]);

  useEffect(() => {
    if (!isConnected || activeSpeaker || !localPeer || hasStartedSpeaker.current) return;
    if (localPeer.roleName !== 'speaker') return;
    const moderators = peers.filter(p => p.roleName === 'moderator');
    if (moderators.length > 0) return; // wait for moderator to start

    const speakerPeers = peers
      .filter(p => p.roleName === 'speaker')
      .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));

    if (speakerPeers.length > 0 && localPeer.id === speakerPeers[0].id) {
      hasStartedSpeaker.current = true;
      const start = Date.now();
      sendEvent({ peerId: localPeer.id, start });
      setActiveSpeaker(localPeer.id);
      setTimers({ [localPeer.id]: start });
    }
  }, [peers, activeSpeaker, localPeer, isConnected, sendEvent]);

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
    if (!isConnected || !activeSpeaker || !localPeer) return;
    if (localPeer.roleName !== 'speaker') return;
    
    const start = timers[activeSpeaker];
    if (!start || activeSpeaker !== localPeer.id) return;

    const interval = setInterval(() => {
      // Calculate elapsed time accounting for pauses
      let elapsedTime = Date.now() - start;
      const pauseTime = pauseTimes[activeSpeaker];
      if (isPaused && pauseTime) {
        // If paused, only count time up to when it was paused
        elapsedTime = pauseTime - start;
      }
      
      if (elapsedTime >= 120000) {
        hmsActions.setLocalAudioEnabled(false);
        setActiveSpeaker(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSpeaker, timers, pauseTimes, isPaused, peers, hmsActions, localPeer, isConnected, sendEvent]);

  if (!isConnected) {
    return <div>Connecting to room...</div>;
  }

  return (
    <div className="room-container">
      <div className="peers-grid">
        {peers
          .filter(peer => !peer.isLocal)
          .map(peer => (
            <PeerTile 
              key={peer.id} 
              peer={peer} 
              isLocal={false} 
              userName={userName} 
              activeSpeaker={activeSpeaker} 
              timers={timers} 
              pauseTimes={pauseTimes} 
              isPaused={isPaused} 
            />
          ))}
        {localPeer && (
          <PeerTile 
            peer={localPeer} 
            isLocal={true} 
            userName={userName} 
            activeSpeaker={activeSpeaker} 
            timers={timers} 
            pauseTimes={pauseTimes} 
            isPaused={isPaused} 
          />
        )}
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

      <SpeakingOrder
        order={speakerOrder}
        peers={peers}
        isModerator={role === 'moderator'}
        onMove={moveSpeaker}
        onStart={startFromModerator}
      />

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

