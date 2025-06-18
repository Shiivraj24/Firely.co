import { useEffect, useState, useCallback } from 'react';
import { useCustomEvent } from '@100mslive/react-sdk';

export const useSpeakerManager = (isConnected, hmsActions, peers, localPeer, isLocalAudioEnabled) => {
  const [timers, setTimers] = useState({});
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [now, setNow] = useState(Date.now());

  const { sendEvent } = useCustomEvent({
    type: 'ACTIVE_SPEAKER',
    onEvent: data => {
      setActiveSpeaker(data.peerId);
      setTimers({ [data.peerId]: data.start });
    },
  });

  // Update current time every second
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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

  // Handle audio state changes
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

  // Auto-start first speaker
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

  // Update audio state based on active speaker
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

  // Timer management and speaker rotation
  useEffect(() => {
    if (!isConnected || !activeSpeaker || !localPeer) return;
    if (localPeer.roleName !== 'speaker') return;
    
    const start = timers[activeSpeaker];
    if (!start || activeSpeaker !== localPeer.id) return;

    const interval = setInterval(() => {
      if (now - start >= 120000) { // 2 minutes
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

  const resetSpeakerState = useCallback(() => {
    setTimers({});
    setActiveSpeaker(null);
  }, []);

  return {
    activeSpeaker,
    timers,
    now,
    startSpeaker,
    resetSpeakerState
  };
}; 