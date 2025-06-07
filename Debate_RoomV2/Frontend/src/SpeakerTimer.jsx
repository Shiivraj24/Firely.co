import React, { useEffect, useState } from 'react';
import { useHMSActions, useParticipants } from '@100mslive/react-sdk';

const DURATION = 120; // seconds per speaker

export default function SpeakerTimer() {
  const { participants: speakers } = useParticipants({ role: 'speaker' });
  const actions = useHMSActions();
  const [index, setIndex] = useState(0);
  const activeSpeaker = speakers[index];
  const [timeLeft, setTimeLeft] = useState(DURATION);

  useEffect(() => {
    setTimeLeft(DURATION);
  }, [activeSpeaker]);

  useEffect(() => {
    if (!activeSpeaker) return;
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [activeSpeaker]);

  useEffect(() => {
    if (timeLeft <= 0 && activeSpeaker) {
      if (activeSpeaker.isLocal) {
        actions.setLocalAudioEnabled(false);
      } else if (activeSpeaker.audioTrack) {
        actions.setRemoteTrackEnabled(activeSpeaker.audioTrack, false);
      }
      nextSpeaker();
    }
  }, [timeLeft, activeSpeaker, actions]);

  const nextSpeaker = () => {
    if (speakers.length === 0) return;
    setIndex((prev) => (prev + 1) % speakers.length);
  };

  const resetTimer = () => setTimeLeft(DURATION);

  if (!activeSpeaker) return null;

  return (
    <div style={{ position: 'absolute', top: 10, right: 10, background: '#0008', color: '#fff', padding: '10px', borderRadius: '4px' }}>
      <p>Speaker: {activeSpeaker.name}</p>
      <p>Time left: {timeLeft}s</p>
      <button onClick={resetTimer}>Reset</button>
      <button onClick={nextSpeaker} style={{ marginLeft: '4px' }}>Next</button>
    </div>
  );
}
