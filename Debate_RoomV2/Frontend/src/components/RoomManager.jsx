import { useEffect, useState, useRef } from 'react';
import { useHMSActions, useHMSStore, selectIsConnectedToRoom, HMSLogLevel } from '@100mslive/react-sdk';

export const useRoomManager = (token, userName) => {
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const [isJoining, setIsJoining] = useState(false);
  const joinAttempted = useRef(false);

  // Configure logging
  useEffect(() => {
    hmsActions.setLogLevel(HMSLogLevel.ERROR);
  }, [hmsActions]);

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

  const leaveRoom = async () => {
    if (!isConnected) return;
    try {
      joinAttempted.current = false;
      await hmsActions.leave();
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  };

  return {
    isConnected,
    isJoining,
    hmsActions,
    leaveRoom
  };
}; 