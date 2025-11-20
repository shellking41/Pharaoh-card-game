// AnimatingCard.jsx
import React, { useEffect, useState } from 'react';
import HungarianCard from './HungarianCard';

function AnimatingCard({ card, from, to, duration, onComplete,delay }) {
    const [position, setPosition] = useState(from);

    useEffect(() => {
        // Kis késleltetés hogy a CSS transition működjön
        const timer = setTimeout(() => {
            setPosition(to);
        }, 50 + (delay || 0)); // delay hozzáadása

        const completeTimer = setTimeout(() => {
            if (onComplete) onComplete(card.cardId);
        }, duration + 50 + (delay || 0));

        return () => {
            clearTimeout(timer);
            clearTimeout(completeTimer);
        };
    }, []);

    return (
        <div
            style={{
                position: 'fixed',
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: 'translate(-50%, -50%)',
                transition: `all ${duration}ms ease-in-out`,
                zIndex: 9999,
                pointerEvents: 'none'
            }}
        >
            <HungarianCard cardData={card} />
        </div>
    );
}

export default AnimatingCard;