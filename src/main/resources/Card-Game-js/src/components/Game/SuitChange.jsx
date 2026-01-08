import React, { useContext, useEffect, useState } from 'react';
import { GameSessionContext } from "../../Contexts/GameSessionContext.jsx";

// Suit képek mapping
const SUIT_IMAGES = {
    ACORNS: '/src/assets/ACORN.png',
    BELLS: '/src/assets/BELL.png',
    HEARTS: '/src/assets/HEARTS.png',
    LEAVES: '/src/assets/LEAVES.png'
};

function SuitChange() {
    const { gameSession } = useContext(GameSessionContext);

    const [visible, setVisible] = useState(false);
    const [currentSuit, setCurrentSuit] = useState(null);

    useEffect(() => {
        const changedSuit = gameSession?.gameData?.suitChangedTo;

        if (changedSuit && ['ACORNS', 'BELLS', 'HEARTS', 'LEAVES'].includes(changedSuit)) {
            setCurrentSuit(changedSuit);
            setVisible(true);

            // 2 másodperc után eltűntetjük
            const timeout = setTimeout(() => {
                 setVisible(false);
            }, 2000);

            return () => clearTimeout(timeout);
        } else {
             setVisible(false);
             setCurrentSuit(null);
        }
    }, [gameSession?.gameData?.suitChangedTo]);

    if (!currentSuit) return null;

    return (
        <div
            aria-hidden={!visible}
            style={{
                position: 'absolute',
                top: '52%',
                left: '45%',
                transform: ` scale(${visible ? 1 : 0})`,
                transition: 'transform 160ms ease, opacity 300ms ease',
                zIndex: 10000001,
                pointerEvents: 'none',
                background: 'rgba(0, 0, 0, 0.7)',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
            }}
        >
            <div
                style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#fff',
                    textShadow: '0 1px 3px rgba(0, 0, 0, 0.6)',
                    textAlign: 'center',
                }}
            >
            </div>
            <img
                src={SUIT_IMAGES[currentSuit]}
                alt={currentSuit}
                style={{
                    width: '60px',
                    height: '60px',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
                }}
                onError={(e) => {
                    console.error(`Failed to load suit image: ${SUIT_IMAGES[currentSuit]}`);
                    e.target.style.display = 'none';
                }}
            />
        </div>
    );
}

export default SuitChange;