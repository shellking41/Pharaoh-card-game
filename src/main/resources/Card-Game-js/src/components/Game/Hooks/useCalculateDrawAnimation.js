import { useState, useCallback, useContext } from 'react';
import { getCardStyleForPosition } from "../HungarianCard.jsx";
import { GameSessionContext } from "../../../Contexts/GameSessionContext.jsx";

function useCalculateDrawAnimation(spacing = 40) {
    const [animations, setAnimations] = useState([]);
    const { playerSelf } = useContext(GameSessionContext);

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

    const calculateDrawAnimation = useCallback(
        (drawnCards, deckPosition, playerHandCount, playerPosition = 'bottom', isSelfPlayer = true) => {
            // Deck starting position
            const deckStart = {
                left: normalizeCoord(deckPosition.left),
                top: normalizeCoord(deckPosition.top),
            };

            return drawnCards.map((card, index) => {
                // Calculate the final position in the player's hand
                const finalHandCount = playerHandCount + drawnCards.length;
                const cardIndexInHand = playerHandCount + index;

                const finalStyle = getCardStyleForPosition(playerPosition, cardIndexInHand, finalHandCount);

                return {
                    card: {
                        ...card,
                        refKey: `draw-${card.cardId}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
                    },
                    waypoints: [
                        {
                            left: deckStart.left,
                            top: deckStart.top,
                            rotate: '0deg',
                            scale: 1,
                            transform: isSelfPlayer ? 'rotateY(180deg)' : 'rotateY(180deg)',
                            offset: 0,
                        },
                        {
                            left: normalizeCoord(finalStyle.left),
                            top: normalizeCoord(finalStyle.top),
                            rotate: finalStyle.rotate || '0deg',
                            scale: 1,
                            transform: isSelfPlayer ? 'rotateY(0deg)' : 'rotateY(180deg)',
                            offset: 1,
                        }
                    ],
                    delay: index * 150,
                    duration: 600,
                };
            });
        },
        []
    );

    return { calculateDrawAnimation, animations, setAnimations };
}

export default useCalculateDrawAnimation;