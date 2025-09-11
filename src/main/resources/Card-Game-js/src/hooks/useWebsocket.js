import {useCallback, useContext, useEffect, useRef} from 'react'
import {StompContext} from "../Contexts/StompContext.jsx";
import {UserContext} from "../Contexts/UserContext.jsx";
import {TokenContext} from "../Contexts/TokenContext.jsx";

function useWebsocket() {
    const {reconnecting, subscriptionRef, connected, clientRef} = useContext(StompContext);
    const messageQueueRef = useRef([]);
    const {token} = useContext(TokenContext);
    const isResubscribingRef = useRef(false);

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
                    console.error('[STOMP] Üzenet küldési hiba:', error);
                    // Ha hiba van, queue-ba tesszük
                    messageQueueRef.current.push(messageData);
                    return false;
                }
            } else {
                // Ha nincs kapcsolat, queue-ba tesszük
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
                        // Visszatesszük a queue-ba
                        messageQueueRef.current.push({destination, message, id, timestamp: Date.now()});
                    }

                })
            }
        },
        [clientRef, connected, reconnecting]);


    // Feliratkozás mentéssel és automatikus újrafeliratkozással
    const subscribe = useCallback((destination, callback, options = {}) => {
        const subscriptionId = `${destination}`;

        // Feliratkozás tárolása
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


                        // Ellenőrizzük, hogy a message.body JSON-nak tűnik-e
                        const messageBody = message.body.trim();

                        // Ha JSON-nak tűnik (kezdődik { vagy [ karakterrel)
                        if ((messageBody.startsWith('{') && messageBody.endsWith('}')) ||
                            (messageBody.startsWith('[') && messageBody.endsWith(']'))) {
                            try {
                                const parsedMessage = JSON.parse(messageBody);
                                callback(parsedMessage);


                            } catch (error) {
                                console.error('[STOMP] JSON parsing hiba:', error);
                                // Ha mégsem valid JSON, akkor string-ként kezeljük
                                callback(messageBody);

                            }
                        } else {
                            // Ha nem JSON formátum, akkor string-ként kezeljük
                            callback(messageBody);
                        }
                    }, {
                        Authorization: "Bearer " + token   // <-- Token ide kerül
                    });

                    // Subscription objektum mentése
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

        // Azonnali feliratkozás, ha van kapcsolat
        performSubscription();

        // Cleanup function visszaadása
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
    }, [clientRef, connected, token]);


    // Kapcsolat változás figyelése - egyszerűsített verzió
    useEffect(() => {

        if (connected && !reconnecting) {
            console.log('[STOMP] Kapcsolat helyreállt, újrafeliratkozás és queue feldolgozás...');

            // Rövid késleltetés a stabilitásért
            const timer = setTimeout(() => {
                sendQueuedMessages();
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [connected, reconnecting]); // Csak ezekre figyelünk, a callback függvényekre nem

    return {sendMessage, subscribe}
}

export default useWebsocket
