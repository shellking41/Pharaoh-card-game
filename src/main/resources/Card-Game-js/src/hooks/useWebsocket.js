import {useCallback, useContext, useEffect, useRef, useState} from 'react'
import {StompContext} from "../Contexts/StompContext.jsx";
import {UserContext} from "../Contexts/UserContext.jsx";
import {TokenContext} from "../Contexts/TokenContext.jsx";

function useWebsocket() {
    const {reconnecting, subscriptionRef, connected, clientRef, hasError} = useContext(StompContext);
    const messageQueueRef = useRef([]);
    const {token} = useContext(TokenContext);
    const isResubscribingRef = useRef(false);
    const disconnectTimerRef = useRef(null);
    const [showRefreshPrompt, setShowRefreshPrompt] = useState(false);

    const sendMessage = useCallback(
        (destination, message) => {
            const messageData = {
                destination,
                message,
                timestamp: Date.now(),
                id: Math.random().toString(36).substr(2, 9)
            };
            if (clientRef.current && connected && !reconnecting) {
                try {
                    clientRef.current.publish({
                        destination,
                        body: JSON.stringify(message),
                        headers: {
                            Authorization: "Bearer " + token
                        },
                    });
                    console.log(`[STOMP] Üzenet elküldve: ${destination}`, message);
                    return true;
                } catch (error) {
                    messageQueueRef.current.push(messageData);
                    return false;
                }
            } else {
                console.log(`[STOMP] Nincs kapcsolat, üzenet queue-ba téve: ${destination}`);
                messageQueueRef.current.push(messageData);
                return false;
            }
        }, [clientRef, connected, reconnecting, token]
    );

    const sendQueuedMessages = useCallback(
        () => {
            if (clientRef.current && connected && !reconnecting) {
                const queue = [...messageQueueRef.current];
                messageQueueRef.current = [];

                queue.forEach(({destination, message, id}) => {
                    try {
                        clientRef.current.publish({
                            destination,
                            body: JSON.stringify(message),
                            headers: {
                                Authorization: "Bearer " + token
                            },
                        });
                        console.log(`[STOMP] Queue-ból elküldve: ${destination}`, message);
                    } catch (error) {
                        console.error('[STOMP] Queue üzenet küldési hiba:', error);
                        messageQueueRef.current.push({destination, message, id, timestamp: Date.now()});
                    }
                })
            }
        },
        [clientRef, connected, reconnecting, token]);

    const subscribe = useCallback((destination, callback, options = {}) => {
        const subscriptionId = `${destination}`;

        subscriptionRef.current.set(subscriptionId, {
            destination,
            callback,
            options,
            subscription: null
        });

        sessionStorage.setItem("callback", JSON.stringify({callback, destination}));

        const performSubscription = () => {
            if (clientRef.current && connected) {
                try {
                    const subscription = clientRef.current.subscribe(destination, (message) => {
                        const messageBody = message.body.trim();

                        if ((messageBody.startsWith('{') && messageBody.endsWith('}')) ||
                            (messageBody.startsWith('[') && messageBody.endsWith(']'))) {
                            try {
                                const parsedMessage = JSON.parse(messageBody);
                                callback(parsedMessage);
                            } catch (error) {
                                console.error('[STOMP] JSON parsing hiba:', error);
                                callback(messageBody);
                            }
                        } else {
                            callback(messageBody);
                        }
                    }, {
                        Authorization: "Bearer " + token
                    });

                    const stored = subscriptionRef.current.get(subscriptionId);
                    if (stored) {
                        stored.subscription = subscription;
                    }

                    console.log(`[STOMP] Feliratkozva: ${destination} (${subscriptionId})`);
                    return subscription;
                } catch (error) {
                    console.error('[STOMP] Feliratkozási hiba:', error);
                    return null;
                }
            }
            return null;
        };

        performSubscription();

        return () => {
            const stored = subscriptionRef.current.get(subscriptionId);
            if (stored?.subscription) {
                try {
                    stored.subscription.unsubscribe();
                    console.log(`[STOMP] Leiratkozva: ${destination} (${subscriptionId})`);
                } catch (error) {
                    console.error('[STOMP] Leiratkozási hiba:', error);
                }
            }
            subscriptionRef.current.delete(subscriptionId);
        };
    }, [clientRef, connected, token, subscriptionRef]);

    // ✅ JAVÍTOTT - Egyszerűsített refresh prompt logika
    useEffect(() => {
        // Ha kapcsolódva van és nincs hiba, elrejtjük a promptot és töröljük a timert
        if (connected && !hasError) {
            setShowRefreshPrompt(false);

            if (disconnectTimerRef.current) {
                clearTimeout(disconnectTimerRef.current);
                disconnectTimerRef.current = null;
            }

            return; // ✅ Nem ad vissza cleanup függvényt
        }

        // Ha nincs kapcsolat VAGY van hiba
        if (!connected || hasError) {
            console.warn('[STOMP] Kapcsolat megszakadt vagy error történt, prompt időzítő indítása...');

            // 10 másodperc múlva megjelenik a refresh prompt
            disconnectTimerRef.current = setTimeout(() => {
                if (!connected || hasError) {
                    console.warn('[STOMP] Kapcsolat nem állt helyre, refresh prompt megjelenítése...');
                    setShowRefreshPrompt(true);
                }
            }, 10000);

            // ✅ Cleanup függvény visszaadása
            return () => {
                if (disconnectTimerRef.current) {
                    clearTimeout(disconnectTimerRef.current);
                    disconnectTimerRef.current = null;
                }
            };
        }
    }, [connected, hasError]);

    // Refresh függvény
    const handleRefresh = useCallback(() => {
        window.location.reload();
    }, []);

    return {
        sendMessage,
        subscribe,
        showRefreshPrompt,
        handleRefresh
    }
}

export default useWebsocket