import { useState, useCallback } from 'react';
import {getCardStyleForPosition, getPlayerPositionBySeat} from "../HungarianCard.jsx";

function useCalculatePlayAnimation(spacing = 40) {
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

    const calculateAnimation = useCallback(
        (playerHandCount, cards, goToRef, targetRotation = '0deg', lastPlayer, playersCount, selfSeat, allCardsInHand = null) => {

            let targetLeft = undefined;
            let targetTop = undefined;

            if (!goToRef) {
                targetLeft = undefined;
                targetTop = undefined;
            } else if (goToRef instanceof CSSStyleDeclaration) {
                targetLeft = goToRef.left;
                targetTop = goToRef.top;
            } else {
                targetLeft = goToRef.left;
                targetTop = goToRef.top;
            }

            const target = {
                left: normalizeCoord(targetLeft),
                top: normalizeCoord(targetTop),
                width: goToRef?.width,
                height: goToRef?.height,
            };

            const playerPosition = getPlayerPositionBySeat(lastPlayer.seat, selfSeat, playersCount);

            const playCount = cards.length;
            const handCount = Math.max(1, Number(playerHandCount) || playCount);

            const cardsInitPositionStyle = cards.map((card, i) => {
                let cardIndexForLayout;
                console.log(playerPosition,allCardsInHand)

                // Ha saját kártyákat játszunk és van hivatkozásunk a teljes kézre
                if (playerPosition === 'bottom' && allCardsInHand) {
                    // Keressük meg a kártya eredeti indexét a teljes kézben
                    cardIndexForLayout = allCardsInHand.findIndex(c => c.cardId === card.cardId);
                    cardIndexForLayout=cardIndexForLayout-cards.length>-1?cardIndexForLayout-cards.length:-1
                    console.log(cardIndexForLayout)


                } else {
                    // Ellenfelek kártyáinál: középre igazított elrendezés
                    const startIndex = Math.max(0, Math.floor((handCount - playCount) / 2));
                    cardIndexForLayout = startIndex + i;
                }

                return getCardStyleForPosition(playerPosition, cardIndexForLayout, handCount);
            });

            return cardsInitPositionStyle.map((style, index) => {
                return {
                    to: {
                        left: target.left,
                        top: target.top,
                    },
                    from: {
                        left: normalizeCoord(style.left),
                        right: normalizeCoord(style.right),
                        top: normalizeCoord(style.top && `${style.top}`),
                        bottom: normalizeCoord(style.bottom),
                    },
                    duration: 500,
                    delay: index * 150,
                    startRotation: style.rotate,
                    targetRotation,
                    card: cards[index],
                };
            });
        },
        [],
    );

    return { calculateAnimation, animations, setAnimations };
}
export default useCalculatePlayAnimation;