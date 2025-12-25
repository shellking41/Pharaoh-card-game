
// AnimatingCard.jsx
import React, { useEffect, useState } from 'react';
import HungarianCard from './HungarianCard';

function AnimatingCard({
                           card,
                           from,
                           to,
                           duration = 400,
                           delay = 0,
                           startRotation = '0deg',
                           targetRotation = '0deg',
                           onComplete,
                       }) {
    const [position, setPosition] = useState(from);
    const [rotation, setRotation] = useState(startRotation);
    const [isAnimating, setIsAnimating] = useState(false);
    useEffect(() => {
        console.log(position,card)

    }, [position]);
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsAnimating(true);
            setPosition(to);
            setRotation(targetRotation);
        }, delay);

        const completeTimer = setTimeout(() => {
            onComplete?.(card.cardId || card.refKey);
        }, delay + duration);

        return () => {
            clearTimeout(timer);
            clearTimeout(completeTimer);
        };
    }, [from, to, delay, duration, targetRotation, card.refKey]); // <= ha props változnak, újraindul

    return (
        <div
            style={{
                position: 'absolute',
                left: position.left,
                top: position.top,
                right:position.right,
                bottom:position.bottom,
                transform: ` rotate(${rotation})`,
                transition: isAnimating ? `
                    left ${duration}ms ease-in-out,
                    top ${duration}ms ease-in-out,
                    right ${duration}ms ease-in-out,
                    bottom ${duration}ms ease-in-out,
                    transform ${duration}ms ease-in-out
                ` : 'none',
                zIndex: 9999 + (delay / 10), // különböző z-index a rétegezéshez
                pointerEvents: 'none',
                willChange: 'left, top, transform',
            }}
        >
            <HungarianCard cardData={card.cardId || card.refKey ? card : null} />
        </div>
    );
}


export default AnimatingCard;