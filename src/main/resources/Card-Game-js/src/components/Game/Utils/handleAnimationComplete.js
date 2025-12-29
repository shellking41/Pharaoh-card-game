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

                    //
                    setTimeout(() => {
                        queueRef.current = newQueue;
                        attemptStartNextWithQueue(newQueue);
                    }, 0);


                    console.log(addedPlayedCards,"addedpalyedCards")

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
        console.log(totalDelay)


        setTimeout(() => {
            setGameSession(prev => {
                const [first, ...rest] = prev.playedCardsQueue || [];
                console.log("first?.cards",first?.cards)
                queueRef.current =rest
                return {
                    ...prev,
                    playedCards: [...(prev.playedCards || []), ...(first?.cards || [])],
                    playedCardsSize: (prev.playedCardsSize ?? 0) + (first?.cards?.length ?? 0),
                    playedCardsQueue: rest,
                };

            });

                setAnimationOwnCards([])

        }, totalDelay+150);
    }
};