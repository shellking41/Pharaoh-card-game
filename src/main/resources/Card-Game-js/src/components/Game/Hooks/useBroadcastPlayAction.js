import {useEffect, useCallback, useRef} from 'react';

/**
 * Hook to broadcast and listen to play card actions across browser tabs
 */
function useBroadcastPlayAction() {
    const CHANNEL_NAME = 'game-play-action';
    const channelRef = useRef(null);

    useEffect(() => {
        // Create BroadcastChannel for cross-tab communication
        channelRef.current = new BroadcastChannel(CHANNEL_NAME);

        return () => {
            channelRef.current?.close();
        };
    }, []);


    const broadcastPlayAction = useCallback((data) => {
        if (channelRef.current) {
            channelRef.current.postMessage({
                type: 'PLAY_CARDS',
                ...data,
                timestamp: Date.now(),
            });
            console.log('[BROADCAST] Play action sent:', data);
        }
    }, []);


    const onPlayAction = useCallback((callback) => {
        if (!channelRef.current) return;

        const handler = (event) => {
            if (event.data.type === 'PLAY_CARDS') {
                console.log('[BROADCAST] Play action received:', event.data);
                callback(event.data);
            }
        };

        channelRef.current.addEventListener('message', handler);

        return () => {
            channelRef.current?.removeEventListener('message', handler);
        };
    }, []);

    return { broadcastPlayAction, onPlayAction };
}

export default useBroadcastPlayAction;