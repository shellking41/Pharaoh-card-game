import {createContext, useEffect, useRef, useState} from 'react';
import SockJS from 'sockjs-client';
import {Client} from '@stomp/stompjs';

export const NotificationContext = createContext();

// Provider komponens
export const NotificationContextProvider = ({children}) => {

    const [notifications, setNotifications] = useState([]);

    const showNotification = (message, type, duration = 5000) => {
        const id = Date.now() + Math.random();
        setNotifications((prev) => ([...prev, {message, id, type}]))

        setTimeout(() => {
            removeNotification(id)
        }, duration)
    }
    const removeNotification = (id) => {
        setNotifications((prev) => (prev.filter((notification) => notification.id !== id)))
    }
    const contextValue = {
        notifications,
        showNotification,
        removeNotification
    }

    return <NotificationContext.Provider value={contextValue}>{children}</NotificationContext.Provider>;
};
