import {createContext, useEffect, useRef, useState} from 'react';
import SockJS from 'sockjs-client';
import {Client} from '@stomp/stompjs';

export const ErrorContext = createContext();

// Provider komponens
export const ErrorContextProvider = ({children}) => {
    const [errorLog, setErrorLog] = useState({
        message: "",
        error: false,

    })
    const contextValue = {errorLog, setErrorLog}

    return <ErrorContext.Provider value={contextValue}>{children}</ErrorContext.Provider>;
};
