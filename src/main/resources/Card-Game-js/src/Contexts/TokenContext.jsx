import {createContext, useEffect, useRef, useState} from 'react';
import SockJS from 'sockjs-client';
import {Client} from '@stomp/stompjs';

export const TokenContext = createContext();

// Provider komponens
export const TokenContextProvider = ({children}) => {
    const [token, setToken] = useState("");
    const contextValue = {
        token, setToken
    }

    return <TokenContext.Provider value={contextValue}>{children}</TokenContext.Provider>;
};
