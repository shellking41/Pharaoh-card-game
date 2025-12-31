import { useState, useCallback } from 'react';

function useCalculateReshuffleAnimation(spacing = 40) {
    const [animations, setAnimations] = useState([]);

    function normalizeCoord(val) {
        if (val == null) return undefined;
        if (typeof val === 'number') return `${val}px`;
        if (typeof val === 'string') {
            const s = val.trim();
            if (s.endsWith('px') || s.endsWith('%') || s.startsWith('calc(')) return s;
            if (!isNaN(parseFloat(s))) return `${parseFloat(s)}px`;
            return s;
        }
        return undefined;
    }

    const calculateReshuffleAnimation = useCallback(
        (playedCardPosition, deckPosition, deckCardNumber) => {
            console.log("[RESHUFFLE CALCULATION]", {
                playedCardPosition,
                deckPosition,
                deckCardNumber
            });

            const playedCardStart = {
                left: normalizeCoord(playedCardPosition.left),
                top: normalizeCoord(playedCardPosition.top),
            };

            const deckPos = {
                left: normalizeCoord(deckPosition.left),
                top: normalizeCoord(deckPosition.top),
            };

            console.log("[RESHUFFLE] Normalized positions:", {
                playedCardStart,
                deckPos
            });

            // Egyedi timestamp minden reshuffle batch-hez
            const batchId = Date.now();

            const animations = Array.from({ length: deckCardNumber }).map((_, index) => {
                return {
                    card: {
                        index: index,
                        // Egyedi refKey minden kártyához
                        refKey: `reshuffle-${batchId}-${index}`
                    },
                    waypoints: [
                        {
                            left: playedCardStart.left,
                            top: playedCardStart.top,
                            rotate: '0deg',
                            scale: 1,
                            offset: 0,
                        },
                        {
                            left: deckPos.left,
                            top: `calc(${index*1.2}px + 49%)`,
                            rotate: `${Math.random() * 20 - 10}deg`,
                            scale: 1,
                            offset: 1,
                        }
                    ],
                    delay: index * 50,
                    duration: 500,
                    zIndex: index * 100
                };
            });

            console.log("[RESHUFFLE] Generated animations:", animations.length);
            return animations;
        },
        []
    );

    return { calculateReshuffleAnimation, animations, setAnimations };
}

export default useCalculateReshuffleAnimation;