import {
    createContext, useContext,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import SockJS from 'sockjs-client';
import {Client} from '@stomp/stompjs';
import {TokenContext} from "./TokenContext.jsx";
import {UserContext} from "./UserContext.jsx";
import useWebsocket from "../hooks/useWebsocket.js";
import {RoomsDataContext} from "./RoomsDataContext.jsx";

export const StompContext = createContext(null);

// Provider komponens
export const StompContextProvider = ({children}) => {

    const {userCurrentStatus} = useContext(UserContext);
    const {token} = useContext(TokenContext);
    const {setRooms} = useContext(RoomsDataContext);

    const [connected, setConnected] = useState(false);
    const [reconnecting, setReconnecting] = useState(false);
    const [hasError, setHasError] = useState(false); // ✅ ÚJ ERROR STATE
    const subscriptionRef = useRef(new Map);

    const clientRef = useRef(null);

    const connectToSocket = () => {
        console.log(token)
        if (clientRef.current) {
            setReconnecting(true)
            clientRef.current.deactivate();
            clientRef.current = null;
        }

        const socket = new SockJS(`http://localhost:8080/gs-guide-websocket?token=${token}`);

        const client = new Client({
            connectHeaders: {
                Authorization: "Bearer " + token
            },
            webSocketFactory: () => socket,
            reconnectDelay: 0,
            onConnect: () => {
                console.log('[STOMP] Kapcsolódva');
                setConnected(true);
                setHasError(false); // ✅ Error törlése sikeres kapcsolódáskor

                clientRef.current.subscribe("/topic/rooms", (message) => {
                    const parsed = JSON.parse(message.body);
                    setRooms((prev) => ([...prev, parsed]))
                }, {
                    Authorization: "Bearer " + token
                })
            },

            onDisconnect: () => {
                console.log('[STOMP] Kapcsolat megszakadt');
                setConnected(false);
                setHasError(true); // ✅ Error beállítása disconnect-nél
            },

            onStompError: (frame) => {
                console.error('[STOMP] Hiba:', frame.headers['message'], frame.body);
                setHasError(true); // ✅ Error beállítása STOMP hibánál
                setConnected(false);
            },

            // ✅ ÚJ: WebSocket szintű error kezelés
            onWebSocketClose: (event) => {
                console.log('[STOMP] WebSocket bezárva:', event);
                setConnected(false);
                setHasError(true);
            },

            onWebSocketError: (error) => {
                console.error('[STOMP] WebSocket hiba:', error);
                setHasError(true);
                setConnected(false);
            },

            debug: (str) => {
                console.log('[STOMP Debug]:', str);
            }
        });

        client.activate();
        setReconnecting(false);
        clientRef.current = client;

        return () => {
            if (clientRef.current) {
                console.log("deactivate2")
                clientRef.current.deactivate();
                clientRef.current = null;
            }
            setConnected(false);
        };
    }

    const disconnectFromSocket = () => {
        console.log('Disconnecting from WebSocket');
        if (clientRef.current) {
            clientRef.current.deactivate();
            clientRef.current = null;
        }
        setConnected(false);
        setHasError(false); // ✅ Manuális disconnect nem error
    };

    useEffect(() => {
        console.log(userCurrentStatus.authenticated, token, connected)

        if (userCurrentStatus.authenticated && token && !connected) {
            console.log('Token changed, connecting to WebSocket');
            connectToSocket();
        }
    }, [userCurrentStatus.authenticated, token]);

    // Cleanup function
    useEffect(() => {
        return () => {
            console.log("deactivate")
            if (clientRef.current) {
                clientRef.current.deactivate();
            }
        };
    }, []);

    const contextValue = {
        clientRef,
        connected,
        connectToSocket,
        subscriptionRef,
        reconnecting,
        setReconnecting,
        hasError // ✅ hasError exportálása
    };

    return <StompContext.Provider value={contextValue}>{children}</StompContext.Provider>;
};