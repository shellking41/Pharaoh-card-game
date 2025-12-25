export const handleAnimationComplete = (cardId,setAnimatingCards,setGameSession,animatingQueueItemIdRef,animationLockRef,setIsAnimating,animationTimingRef,queueRef,attemptStartNextWithQueue,ownCards,setAnimationOwnCards,animationOwnCards) => {
    if(!ownCards){
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

                // Hívjuk meg a nextet a kalkulált newQueue-val (azonnal)
                // használjunk kis késleltetést 0ms, hogy a React folyamattal kompatibilis legyen:
                setTimeout(() => {
                    queueRef.current = newQueue;
                    attemptStartNextWithQueue(newQueue);
                }, 0);

                // végül térjünk vissza a frissített state-tel
                return {
                    ...prev,
                    playedCardsSize: (prev.playedCardsSize ?? 0) + (addedPlayedCards.length),
                    playedCards: [...(prev.playedCards ?? []), ...addedPlayedCards],
                    playedCardsQueue: newQueue,
                };
            });
        }

        return filtered;
    });}
    else{
        const totalDelay = animationOwnCards.reduce((max, a) => {
            const finish = (a.delay ?? 0) + (a.duration ?? 0);
            return Math.max(max, finish);
        }, 0);
        setTimeout(() => {
         setAnimationOwnCards([])
        }, totalDelay);
    }
};