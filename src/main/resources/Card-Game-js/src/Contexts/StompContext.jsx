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

    const {userCurrentStatus} = useContext(UserContext); // UserContext hozzáadása
    const {token} = useContext(TokenContext);
    const {setRooms} = useContext(RoomsDataContext);


    const [connected, setConnected] = useState(false);
    const [reconnecting, setReconnecting] = useState(false);
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
                Authorization: "Bearer " + token  // <-- Itt küldöd
            },
            webSocketFactory: () => socket,
            reconnectDelay: 0,
            onConnect: () => {
                console.log('[STOMP] Kapcsolódva');
                setConnected(true);
                clientRef.current.subscribe("/topic/rooms", (message) => {
                    const parsed = JSON.parse(message.body);
                    setRooms((prev) => ([...prev, parsed]))
                }, {
                    Authorization: "Bearer " + token   // <-- Token ide kerül
                })
            },

            onDisconnect: () => {
                console.log('[STOMP] Kapcsolat megszakadt');
                setConnected(false);
            },
            onStompError: (frame) => {
                console.error('[STOMP] Hiba:', frame.headers['message'], frame.body);
            },
            debug: (str) => {
                console.log('[STOMP Debug]:', str); // EZ MEGMUTATJA A STOMP FORGALMAT
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
    };
// Automatikus csatlakozás/lecsatlakozás az authentication állapot alapján
//     useEffect(() => {
//         if (userInfo.authenticated && token && !connected) {
//             console.log('User authenticated, connecting to WebSocket');
//             connectToSocket();
//         } else if (!userInfo.authenticated && connected) {
//             console.log('User not authenticated, disconnecting from WebSocket');
//             disconnectFromSocket();
//         }
//     }, [userInfo.authenticated, token]); // Figyeljük az auth állapotot és a token változást

    useEffect(() => {
        console.log(userCurrentStatus.authenticated, token, connected)

        if (userCurrentStatus.authenticated && token && !connected) {
            console.log('Token changed, connecting to WebSocket');
            connectToSocket();
        }
    }, [userCurrentStatus.authenticated, token]); // Csak a token változását figyeljük
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
        setReconnecting

    };


    return <StompContext.Provider value={contextValue}>{children}</StompContext.Provider>;
};
