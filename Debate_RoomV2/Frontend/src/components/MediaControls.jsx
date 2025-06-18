import React from 'react';
import { useAVToggle, useScreenShare } from '@100mslive/react-sdk';

export const MediaControls = ({ 
  isConnected, 
  localPeer, 
  onLeaveRoom 
}) => {
  const { isLocalAudioEnabled, isLocalVideoEnabled, toggleAudio, toggleVideo } = useAVToggle();
  const { amIScreenSharing, toggleScreenShare } = useScreenShare();

  const handleAudioToggle = async () => {
    if (!isConnected) return;
    try {
      await toggleAudio();
    } catch (error) {
      console.error('Error toggling audio:', error);
    }
  };

  const handleVideoToggle = async () => {
    if (!isConnected) return;
    try {
      await toggleVideo();
    } catch (error) {
      console.error('Error toggling video:', error);
    }
  };

  const handleScreenShare = async () => {
    if (!isConnected) return;
    try {
      await toggleScreenShare();
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  };

  return (
    <div className="controls">
      <button onClick={handleAudioToggle} disabled={!localPeer}>
        {isLocalAudioEnabled ? 'Mute' : 'Unmute'}
      </button>
      <button onClick={handleVideoToggle} disabled={!localPeer}>
        {isLocalVideoEnabled ? 'Hide Video' : 'Show Video'}
      </button>
      <button onClick={handleScreenShare} disabled={!localPeer}>
        {amIScreenSharing ? 'Stop Share' : 'Share Screen'}
      </button>
      <button onClick={onLeaveRoom}>Leave Room</button>
    </div>
  );
}; 