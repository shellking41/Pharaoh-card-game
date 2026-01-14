import {
  createContext, useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { TokenContext } from './TokenContext.jsx';
import { UserContext } from './UserContext.jsx';
import { RoomsDataContext } from './RoomsDataContext.jsx';

export const StompContext = createContext(null);

export const StompContextProvider = ({ children }) => {

  const { userCurrentStatus } = useContext(UserContext);
  const { token } = useContext(TokenContext);
  const { setRooms } = useContext(RoomsDataContext);

  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const subscriptionRef = useRef(new Map);
  const clientRef = useRef(null);

  // Token tracking
  const lastTokenRef = useRef(null);

  const connectToSocket = () => {
    console.log('[STOMP] Connecting with token:', token?.substring(0, 20) + '...');

    if (clientRef.current) {
      console.log('[STOMP] Cleaning up previous connection');
      setReconnecting(true);
      clientRef.current.deactivate();
      clientRef.current = null;
    }

    const socket = new SockJS(`http://localhost:8080/gs-guide-websocket?token=${token}`);

    const client = new Client({
      connectHeaders: {
        Authorization: 'Bearer ' + token,
      },
      webSocketFactory: () => socket,
      reconnectDelay: 0,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        console.log('[STOMP] Connected successfully');
        setConnected(true);
        setHasError(false);
        setReconnecting(false);

        lastTokenRef.current = token;

        clientRef.current.subscribe('/topic/rooms', (message) => {
          const parsed = JSON.parse(message.body);
          setRooms((prev) => ([...prev, parsed]));
        }, {
          Authorization: 'Bearer ' + token,
        });
      },

      onDisconnect: () => {
        console.log('[STOMP] Disconnected');
        setConnected(false);
        setHasError(true);
      },

      onStompError: (frame) => {
        console.error('[STOMP] STOMP Error:', frame.headers['message'], frame.body);
        setHasError(true);
        setConnected(false);
      },

      onWebSocketClose: (event) => {
        console.log('[STOMP] WebSocket closed:', event.code, event.reason);
        setConnected(false);
        setHasError(true);
      },

      onWebSocketError: (error) => {
        console.error('[STOMP] WebSocket error:', error);
        setHasError(true);
        setConnected(false);
      },

      debug: (str) => {
        console.log('[STOMP Debug]:', str);
      },
    });

    client.activate();
    clientRef.current = client;
  };

  const disconnectFromSocket = () => {
    console.log('[STOMP] Manual disconnect');
    if (clientRef.current) {
      try {
        clientRef.current.deactivate();
      } catch (error) {
        console.error('[STOMP] Disconnect error:', error);
      }
      clientRef.current = null;
    }
    setConnected(false);
    setHasError(false);
    setReconnecting(false);
    lastTokenRef.current = null;
  };

  useEffect(() => {
    console.log('[STOMP Effect] Auth:', userCurrentStatus.authenticated,
      'Token:', !!token,
      'Connected:', connected,
      'Token changed:', lastTokenRef.current !== token);

    if (userCurrentStatus.authenticated && token && !connected) {
      const isNewToken = lastTokenRef.current !== token;

      if (isNewToken || !clientRef.current) {
        console.log('[STOMP] Connecting - New token or no client');
        connectToSocket();
      } else {
        console.log('[STOMP] Skipping reconnect - Same token, client exists');
      }
    }

    // Disconnect ha nincs token
    if (!token && (connected || clientRef.current)) {
      console.log('[STOMP] No token, disconnecting');
      disconnectFromSocket();
    }
  }, [userCurrentStatus.authenticated, token, connected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[STOMP] Component unmounting, cleaning up');
      disconnectFromSocket();
    };
  }, []);

  const contextValue = {
    clientRef,
    connected,
    connectToSocket,
    subscriptionRef,
    reconnecting,
    setReconnecting,
    hasError,
    disconnectFromSocket,
  };

  return <StompContext.Provider
    value={contextValue}>{children}</StompContext.Provider>;
};