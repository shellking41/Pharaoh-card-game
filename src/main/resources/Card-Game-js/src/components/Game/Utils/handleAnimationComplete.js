export const handleAnimationComplete = (
    cardId,
    setAnimatingCards,
    animatingCards,
    setGameSession,
    animatingQueueItemIdRef,
    animationLockRef,
    setIsAnimating,
    animationTimingRef,
    queueRef,
    attemptStartNextWithQueue,
    ownCards,
    setAnimationOwnCards,
    animationOwnCards,
    gameSession
) => {
    if (!ownCards) {
        // Opponent card animation
        setAnimatingCards(prev => {
            const filtered = prev.filter(c => (c.card.cardId || c.card.refKey) !== cardId);

            if (filtered.length === 0) {
                setGameSession(prev => {
                    const queue = prev.playedCardsQueue ?? [];
                    const currentQueueId = animatingQueueItemIdRef.current;

                    const idx = queue.findIndex(q => q.id === currentQueueId);
                    let removed = null;
                    let newQueue = queue;
                    if (idx !== -1) {
                        removed = queue[idx];
                        newQueue = [...queue.slice(0, idx), ...queue.slice(idx + 1)];
                    } else {
                        if (queue.length > 0) {
                            removed = queue[0];
                            newQueue = queue.slice(1);
                        }
                    }

                    const addedPlayedCards = removed?.cards ?? [];
                    animatingQueueItemIdRef.current = null;

                    animationLockRef.current = false;
                    setIsAnimating(false);
                    animationTimingRef.current = { animations: null, totalDelay: 0 };

                    setTimeout(() => {
                        queueRef.current = newQueue;
                        attemptStartNextWithQueue(newQueue);
                    }, 0);


                    setTimeout(() => {
                        console.log('[OWN CARD COMPLETE] Clearing animating cards after delay');
                        setAnimatingCards([]);
                    }, 100);

                    return {
                        ...prev,
                        playedCardsSize: (prev.playedCardsSize ?? 0) + (addedPlayedCards.length),
                        playedCards: [...(prev.playedCards ?? []), ...addedPlayedCards],
                        playedCardsQueue: newQueue,
                    };
                });
                return prev;
            }

            return filtered;
        });
    } else {
        // Own card animation
        setAnimationOwnCards(prev => {
            const filtered = prev.filter(c => (c.card.cardId || c.card.refKey) !== cardId);

            console.log('[OWN CARD COMPLETE]', {
                completedCardId: cardId,
                remaining: filtered.length,
                total: prev.length
            });

            if (filtered.length === 0) {
                console.log('[OWN CARD COMPLETE] All animations finished, updating game state');

                // *** ELŐSZÖR frissítjük a gameSession-t (playedCards) ***
                setGameSession(prev => {
                    const [first, ...rest] = prev.playedCardsQueue || [];

                    queueRef.current = rest;

                    // Reset animation state
                    animationLockRef.current = false;
                    animatingQueueItemIdRef.current = null;
                    animationTimingRef.current = { animations: null, totalDelay: 0 };
                    setIsAnimating(false);

                    // Próbáljuk meg feldolgozni a következő queue elemet
                    attemptStartNextWithQueue(rest);

                    return {
                        ...prev,
                        playedCards: [...(prev.playedCards || []), ...(first?.cards || [])],
                        playedCardsSize: (prev.playedCardsSize ?? 0) + (first?.cards?.length ?? 0),
                        playedCardsQueue: rest,
                    };
                });


                setTimeout(() => {
                    console.log('[OWN CARD COMPLETE] Clearing animating cards after delay');
                    setAnimationOwnCards([]);
                }, 100);


                return prev;
            }

            return filtered;
        });
    }
};