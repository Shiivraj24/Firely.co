import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  useHMSStore,
  selectPeers,
  useHMSActions,
  selectLocalPeer,
  selectIsConnectedToRoom,
  selectHMSMessages,
  useAVToggle,
  useCustomEvent,
  selectRemotePeers,
  HMSLogLevel,
} from '@100mslive/react-sdk';
import PeerTile from './PeerTile';
import SpeakerQueue from './SpeakerQueue';
import Chat from './Chat';
import ScreenShare from './ScreenShare';
import { MediaControls } from './MediaControls';
import './CustomRoom.css';

const ROLES = ['judge', 'speaker', 'moderator', 'audience'];


function RoomInner({ token, role, userName }) {
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);
  const localPeer = useHMSStore(selectLocalPeer);
  const remotepeer = useHMSStore(selectRemotePeers);
  const messages = useHMSStore(selectHMSMessages);
  const { isLocalAudioEnabled } = useAVToggle();
  const [timers, setTimers] = useState({});
  const [pauseTimes, setPauseTimes] = useState({});
  const [isPaused, setIsPaused] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const joinAttempted = useRef(false);
  const [speakerQueue, setSpeakerQueue] = useState([]);

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

  const handleQueueEvent = useCallback((data) => {
    setSpeakerQueue(data.queue || []);
  }, []);

  const { sendEvent: sendQueueEvent } = useCustomEvent({
    type: 'SPEAKER_QUEUE',
    onEvent: handleQueueEvent,
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



  const endDebate = useCallback(async () => {
    try {
      await hmsActions.endRoom(false, 'Debate ended by moderator');
    } catch (error) {
      console.error('Error ending room:', error);
    }
  }, [hmsActions]);

  const moveSpeaker = useCallback((from, to) => {
    setSpeakerQueue(prev => {
      const updated = [...prev];
      if (to < 0 || to >= updated.length) return prev;
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      if (role === 'moderator') {
        sendQueueEvent({ queue: updated });
      }
      return updated;
    });
  }, [role, sendQueueEvent]);

  const addSpeaker = useCallback(
    peerId => {
      setSpeakerQueue(prev => {
        if (prev.includes(peerId)) return prev;
        const updated = [...prev, peerId];
        if (role === 'moderator') {
          sendQueueEvent({ queue: updated });
        }
        return updated;
      });
    },
    [role, sendQueueEvent]
  );

  const removeSpeaker = useCallback(
    peerId => {
      setSpeakerQueue(prev => {
        const updated = prev.filter(id => id !== peerId);
        if (role === 'moderator') {
          sendQueueEvent({ queue: updated });
        }
        return updated;
      });
    },
    [role, sendQueueEvent]
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
    [sendEvent, isConnected, activeSpeaker]
  );

  const startFromModerator = useCallback(
    peerId => {
      startSpeaker(peerId);
      setSpeakerQueue(prev => {
        const updated = prev.filter(id => id !== peerId);
        if (role === 'moderator') {
          sendQueueEvent({ queue: updated });
        }
        return updated;
      });
    },
    [startSpeaker, role, sendQueueEvent]
  );

  const leaveRoom = useCallback(async () => {
    if (!isConnected) return;
    try {
      joinAttempted.current = false;
      await hmsActions.leave();
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
    message => {
      if (!isConnected || !message.trim()) return;
      hmsActions.sendBroadcastMessage(message.trim());
    },
    [hmsActions, isConnected],
  );

  const startNextSpeaker = useCallback(() => {
    setSpeakerQueue(prev => {
      if (prev.length === 0) return prev;
      const [next, ...rest] = prev;
      startSpeaker(next);
      if (role === 'moderator') {
        sendQueueEvent({ queue: rest });
      }
      return rest;
    });
  }, [startSpeaker, role, sendQueueEvent]);

  // Use a ref to track if we've already started a speaker to prevent infinite loops
  const hasStartedSpeaker = useRef(false);

  // Keep the queue in sync when speakers leave
  useEffect(() => {
    if (!isConnected) return;
    const speakerPeers = peers.filter(p => p.roleName === 'speaker');
    setSpeakerQueue(prev => prev.filter(id => speakerPeers.some(p => p.id === id)));
  }, [peers, isConnected]);

  useEffect(() => {
    if (role !== 'moderator') return;
    if (!isConnected) return;
    sendQueueEvent({ queue: speakerQueue });
  }, [speakerQueue, role, isConnected, sendQueueEvent]);

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
        startNextSpeaker();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSpeaker, timers, pauseTimes, isPaused, peers, hmsActions, localPeer, isConnected, sendEvent, startNextSpeaker]);

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

      <MediaControls
        isConnected={isConnected}
        localPeer={localPeer}
        onLeaveRoom={leaveRoom}
        onToggleAudio={handleAudioToggle}
      />
      <div className="controls">
        <button onClick={() => setIsChatOpen(!isChatOpen)}>Chat</button>
        {role === 'moderator' && (
          <button onClick={endDebate}>End Debate</button>
        )}
      </div>

      <SpeakerQueue
        queue={speakerQueue}
        peers={peers}
        isModerator={role === 'moderator'}
        onMove={moveSpeaker}
        onStart={startFromModerator}
        onAdd={addSpeaker}
        onRemove={removeSpeaker}
      />

      {isChatOpen && (
        <Chat
          messages={messages}
          onSend={handleSendMessage}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  );
}

export default function CustomRoom({ token, role, userName }) {
  return <RoomInner token={token} role={role} userName={userName} />;
}

