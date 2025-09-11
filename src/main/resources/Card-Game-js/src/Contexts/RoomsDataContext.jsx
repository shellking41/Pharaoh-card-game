import {createContext, useEffect, useRef, useState} from 'react';
import SockJS from 'sockjs-client';
import {Client} from '@stomp/stompjs';

export const RoomsDataContext = createContext();

// Provider komponens
export const RoomsDataContextProvider = ({children}) => {
    const [rooms, setRooms] = useState([]);
    const [joinRequests, setJoinRequests] = useState([]);
    const contextValue = {rooms, setRooms, joinRequests, setJoinRequests}

    return <RoomsDataContext.Provider value={contextValue}>{children}</RoomsDataContext.Provider>;
};