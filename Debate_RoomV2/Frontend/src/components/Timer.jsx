import React, { useState, useEffect } from 'react';

export default function Timer({ startTime, isActive, pauseTime, isPaused }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!isActive || !startTime) {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      let elapsedTime;
      if (isPaused && pauseTime) {
        elapsedTime = Math.floor((pauseTime - startTime) / 1000);
      } else {
        elapsedTime = Math.floor((Date.now() - startTime) / 1000);
      }

      const diff = Math.max(0, 120 - elapsedTime);
      const mins = String(Math.floor(diff / 60)).padStart(2, '0');
      const secs = String(diff % 60).padStart(2, '0');
      setTimeLeft(`${mins}:${secs}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime, isActive, pauseTime, isPaused]);

  if (!isActive || !timeLeft) return null;

  return (
    <div className="peer-timer">
      {timeLeft}
      {isPaused && (
        <span style={{ fontSize: '0.8em', marginLeft: '5px' }}>(PAUSED)</span>
      )}
    </div>
  );
}
