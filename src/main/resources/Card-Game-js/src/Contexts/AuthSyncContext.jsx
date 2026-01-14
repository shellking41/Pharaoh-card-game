import React, { createContext, useContext, useEffect, useRef } from 'react';
import { TokenContext } from './TokenContext';
import { UserContext } from './UserContext';
import { StompContext } from './StompContext';

export const AuthSyncContext = createContext(null);

export const AuthSyncProvider = ({ children }) => {
  const { setToken } = useContext(TokenContext);
  const { setUserCurrentStatus } = useContext(UserContext);
  const { disconnectFromSocket } = useContext(StompContext);
  const channelRef = useRef(null);
  const tabIdRef = useRef(`tab-${Date.now()}-${Math.random()}`);

  useEffect(() => {
    channelRef.current = new BroadcastChannel('auth-sync');

    channelRef.current.onmessage = async (event) => {
      const { type, senderId, accessToken } = event.data;

      if (senderId === tabIdRef.current) {
        return;
      }

      switch (type) {
        case 'LOGIN':
          console.log('[AuthSync] Login detected with new token - reloading...');

          if (accessToken) {
            setToken(accessToken);
          }

          window.location.reload();
          break;

        case 'LOGOUT':
          console.log('[AuthSync] Logout detected');

          setToken(null);
          setUserCurrentStatus({
            userInfo: { userId: '', username: '', role: '' },
            currentRoom: null,
            managedRoom: null,
            authenticated: false,
          });

          if (disconnectFromSocket) {
            disconnectFromSocket();
          }

          break;

        case 'TOKEN_REFRESH':
          console.log('[AuthSync] Token refresh detected from another tab');

          // Frissítjük a tokent a másik tab-ból kapott értékkel
          if (accessToken) {
            setToken(accessToken);
          }

          break;

        default:
          break;
      }
    };

    return () => {
      channelRef.current?.close();
    };
  }, [setToken, setUserCurrentStatus, disconnectFromSocket]);

  const broadcastLogin = (accessToken) => {
    console.log('[AuthSync] Broadcasting login with access token');
    channelRef.current?.postMessage({
      type: 'LOGIN',
      senderId: tabIdRef.current,
      accessToken: accessToken,
    });
  };

  const broadcastLogout = () => {
    console.log('[AuthSync] Broadcasting logout');
    channelRef.current?.postMessage({
      type: 'LOGOUT',
      senderId: tabIdRef.current,
    });
  };

  const broadcastTokenRefresh = (accessToken) => {
    console.log('[AuthSync] Broadcasting token refresh with new token');
    channelRef.current?.postMessage({
      type: 'TOKEN_REFRESH',
      senderId: tabIdRef.current,
      accessToken: accessToken,
    });
  };

  return (
    <AuthSyncContext.Provider value={{
      broadcastLogin,
      broadcastLogout,
      broadcastTokenRefresh,
    }}>
      {children}
    </AuthSyncContext.Provider>
  );
};