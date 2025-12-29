import {useState, useCallback, useContext} from 'react';
import {getCardStyleForPosition, getPlayerPositionBySeat} from "../HungarianCard.jsx";
import {GameSessionContext} from "../../../Contexts/GameSessionContext.jsx";

function useCalculatePlayAnimation(spacing = 40) {
    const [animations, setAnimations] = useState([]);
    const {playerSelf}=useContext(GameSessionContext)
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

                if (playerPosition === 'bottom' && allCardsInHand) {
                    cardIndexForLayout = allCardsInHand.findIndex(c => c.cardId === card.cardId);
                    cardIndexForLayout = cardIndexForLayout - cards.length > -1 ? cardIndexForLayout - cards.length : -1;
                } else {
                    const startIndex = Math.max(0, Math.floor((handCount - playCount) / 2));
                    cardIndexForLayout = startIndex + i;
                }

                return getCardStyleForPosition(playerPosition, cardIndexForLayout, handCount);
            });

            return cardsInitPositionStyle.map((style, index) => {
                // Offset értékek számítása (0 és 1 között egyenlően elosztva)
                return {
                    card: cards[index],
                    waypoints: [
                        {
                            left: normalizeCoord(style.left),
                            top: normalizeCoord(style.top && `${style.top}`),
                            rotate: style.rotate || '0deg',
                            scale: 1,
                            transform:   playerSelf.playerId!==lastPlayer.playerId && 'rotateY(180deg)',

                            offset: 0,
                        },
                        {
                            left: target.left,
                            top: target.top,
                            rotate: targetRotation,
                            scale: 1,
                            transform: playerSelf.playerId!==lastPlayer.playerId && 'rotateY(0deg)',

                            offset: 1,
                        }
                    ],
                    delay: index * 100,
                    duration: 600,
                };
            });
        },
        [],
    );

    return { calculateAnimation, animations, setAnimations };
}

export default useCalculatePlayAnimation;