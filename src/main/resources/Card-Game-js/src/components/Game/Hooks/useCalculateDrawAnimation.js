import { useState, useCallback, useContext } from 'react';
import { getCardStyleForPosition } from "../HungarianCard.jsx";
import { GameSessionContext } from "../../../Contexts/GameSessionContext.jsx";

function useCalculateDrawAnimation(spacing = 40) {
    const [animations, setAnimations] = useState([]);
    const { playerSelf, deckRotations } = useContext(GameSessionContext);

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
        (drawnCards, deckPosition, playerHandCount, playerPosition = 'bottom', isSelfPlayer = true, isMobile = false) => {
            console.log("isMobile",isMobile)

            // Deck starting position
            const deckStart = {
                left: normalizeCoord(deckPosition.left),
                top: normalizeCoord(deckPosition.top),
            };

            // Mobil kártya méret (kisebb kezdőméret)
            const mobileCardSize = {
                width: 40,  // Kisebb szélesség mobilon
                height: 60  // Kisebb magasság mobilon
            };

            // Normál kártya méret
            const normalCardSize = {
                width: 60,
                height: 90
            };


            const scaleX = mobileCardSize.width / normalCardSize.width;  // 40/60 = 0.667
            const scaleY = mobileCardSize.height / normalCardSize.height; // 60/90 = 0.667

            return drawnCards.map((card, index) => {
                // Calculate the final position in the player's hand
                const finalHandCount = playerHandCount + drawnCards.length;
                const cardIndexInHand = playerHandCount + index;

                const finalStyle = getCardStyleForPosition(playerPosition, cardIndexInHand, finalHandCount);

                // Get the rotation from the last deck card, fallback to '0deg'
                const initialRotate = deckRotations && deckRotations.length > 0
                    ? deckRotations[deckRotations.length - (1 + index)]
                    : '0deg';

                // Ha mobil és saját játékos, akkor scaling animáció
                const shouldScale = isMobile;

                return {
                    card: {
                        ...card,
                        refKey: `draw-${card.cardId}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
                    },
                    waypoints: [
                        {
                            left: deckStart.left,
                            top: deckStart.top,
                            rotate: initialRotate,
                            scale: 1,
                            transform: isSelfPlayer ? 'rotateY(180deg)' : 'rotateY(180deg)',
                            // Mobil esetén kisebb méret
                            ...(shouldScale && {
                                cardWidth: normalCardSize.width,
                                cardHeight: normalCardSize.height

                            }),
                            offset: 0,
                        },
                        {
                            left: normalizeCoord(finalStyle.left),
                            top: normalizeCoord(finalStyle.top),
                            rotate: finalStyle.rotate || '0deg',
                            scale: shouldScale ? scaleX : 1, // Kisebb méret mobilon
                            transform: isSelfPlayer ? 'rotateY(0deg)' : 'rotateY(180deg)',
                            // Mobil esetén vissza a normál méretre

                            offset: 1,
                        }
                    ],
                    delay: index * 150,
                    duration: 900,
                    // Flag hogy mobil scaling szükséges
                    isMobileScaling: shouldScale,
                };
            });
        },
        [deckRotations]
    );

    return { calculateDrawAnimation, animations, setAnimations };
}

export default useCalculateDrawAnimation;