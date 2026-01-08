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
    const refreshTokenCallbackRef = useRef(null);
    const tabIdRef = useRef(`tab-${Date.now()}-${Math.random()}`);
    const isRefreshingRef = useRef(false);

    useEffect(() => {
        channelRef.current = new BroadcastChannel('auth-sync');

        channelRef.current.onmessage = async (event) => {
            const { type, senderId } = event.data;

            // ✅ Saját üzeneteinket ignoráljuk
            if (senderId === tabIdRef.current) {
                return;
            }

            switch (type) {
                case 'LOGIN':
                    console.log('[AuthSync] Login detected - refreshing token...',refreshTokenCallbackRef.current,!isRefreshingRef.current);

                    window.location.reload()
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
                    // ✅ KRITIKUS VÁLTOZÁS: NE hívjunk refresh-t!
                    // Csak log-oljuk, hogy valaki más refresh-elt
                    console.log('[AuthSync] Another tab refreshed token - we will auto-refresh when ours expires');
                    // ❌ NE: await refreshTokenCallbackRef.current();
                    break;

                default:
                    break;
            }
        };

        return () => {
            channelRef.current?.close();
        };
    }, [setToken, setUserCurrentStatus, disconnectFromSocket]);

    const registerRefreshCallback = (callback) => {
        refreshTokenCallbackRef.current = callback;
    };

    const broadcastLogin = () => {
        console.log('[AuthSync] Broadcasting login');
        channelRef.current?.postMessage({
            type: 'LOGIN',
            senderId: tabIdRef.current
        });
    };

    const broadcastLogout = () => {
        console.log('[AuthSync] Broadcasting logout');
        channelRef.current?.postMessage({
            type: 'LOGOUT',
            senderId: tabIdRef.current
        });
    };

    const broadcastTokenRefresh = () => {
        console.log('[AuthSync] Broadcasting token refresh');
        channelRef.current?.postMessage({
            type: 'TOKEN_REFRESH',
            senderId: tabIdRef.current
        });
    };

    return (
        <AuthSyncContext.Provider value={{
            broadcastLogin,
            broadcastLogout,
            broadcastTokenRefresh,
            registerRefreshCallback
        }}>
            {children}
        </AuthSyncContext.Provider>
    );
};