import React, { useEffect, useLayoutEffect } from 'react';
import useCalculatePlayAnimation from './useCalculatePlayAnimation.js';
import { useMediaQuery } from '@mui/material';

function UseHandleOpponentsCardPlay(animationLockRef, setGameSession, gameSession, playerSelf, playedCardRef, animationTimingRef, setAnimatingCards, queueRef, setIsAnimating, animatingQueueItemIdRef, isMobile) {
  const { calculateAnimation } = useCalculatePlayAnimation();

  const attemptStartNextWithQueue = (queue) => {
    if (!queue?.length) {
      return;
    }
    if (animationLockRef.current) {
      return;
    }

    const next = queue[0];
    if (!next?.cards?.length) {

      setGameSession(prev => ({
        ...prev,
        playedCardsQueue: (prev.playedCardsQueue || []).slice(1),
      }));
      return;
    }

    // ha mi tettük le, azonnal feldolgozzuk (nem animálunk)
    if (next.playerId === playerSelf.playerId) {
      return;
    }

    // LOCK + előkészítés (ugyanaz, mint attemptStartNext)
    animationLockRef.current = true;
    setIsAnimating(true);
    animatingQueueItemIdRef.current = next.id;

    const dummyCards = next.cards.map((card, i) => ({
      refKey: `${next.playerId}-${card.cardId ?? 'nocard'}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      suit: card.suit,
      rank: card.rank,
      cardId: card.cardId,
    }));

    const lastPlayer = gameSession.players.find(p => p.playerId === next.playerId);
    if (!lastPlayer) {
      console.error('Last player not found for anim', next.playerId);
      animationLockRef.current = false;
      setIsAnimating(false);
      animatingQueueItemIdRef.current = null;
      return;
    }

    const playerHandCount = gameSession.playerHand?.otherPlayersCardCount?.[String(lastPlayer.playerId)] ?? 0;
    const playedCardElement = playedCardRef.current;
    if (!playedCardElement) {
      console.error('Played card element not found');
      animationLockRef.current = false;
      setIsAnimating(false);
      animatingQueueItemIdRef.current = null;
      return;
    }

    const animations = calculateAnimation(
      playerHandCount,
      dummyCards,
      playedCardElement.style,
      '0deg',
      lastPlayer,
      gameSession.players.length,
      playerSelf.seat,
      null,
      isMobile,
    );

    animationTimingRef.current = {
      animations,
      totalDelay: animations.reduce((max, a) => Math.max(max, (a.delay ?? 0) + (a.duration ?? 0)), 0),
      startTime: Date.now(),
      queueItemId: next.id,
    };

    // hozzáfűzzük az új animációs batch-et
    setAnimatingCards(prev => [...prev, ...animations]);
  };
  // Opponensek kártyaváltozásának figyelése — animáció indítása
  useLayoutEffect(() => {
    const q = gameSession?.playedCardsQueue ?? [];
    queueRef.current = q;

    // próbáljuk elindítani rögtön (ha nincs lock)
    if (!animationLockRef.current) {
      attemptStartNextWithQueue(q);
    }
  }, [gameSession?.playedCardsQueue]);

  return { attemptStartNextWithQueue };

}

export default UseHandleOpponentsCardPlay


