import React, { useEffect, useRef, useState } from 'react';

function DeckCard({ index, rotation, shouldAnimate = false, isMobile = false, onAnimationComplete,zIndex }) {
    const cardRef = useRef(null);
    const hasAnimatedRef = useRef(false);

    useEffect(() => {
        if (shouldAnimate && !hasAnimatedRef.current && cardRef.current) {
            const element = cardRef.current;

            // Played card pozíció
            const playedCardStart = {
                left: '45%',
                top: '50%',
            };

            // Deck pozíció
            const deckPos = {
                left: isMobile ? '45%' : '55%',
                top: isMobile ? `calc(${index * 1.2}px + 30%)` : `calc(${index * 1.2}px + 49%)`,
            };

            // Animáció keyframe-ek
            const keyframes = [
                {
                    left: playedCardStart.left,
                    top: playedCardStart.top,
                    transform: 'rotateY(0deg) rotateZ(0deg)',
                    offset: 0,
                },
                {
                    left: deckPos.left,
                    top: deckPos.top,
                    transform: `rotateY(180deg) rotateZ(${rotation || '0deg'})`,
                    offset: 1,
                }
            ];

            // Animáció indítása
            const animation = element.animate(keyframes, {
                duration: 500,
                easing: 'ease-in-out',
                fill: 'forwards',
            });

            animation.onfinish = () => {
                hasAnimatedRef.current = true;
                onAnimationComplete?.();
            };
        }
    }, [shouldAnimate, index, rotation, isMobile, onAnimationComplete]);

    const baseStyle = {
        position: 'absolute',
        width: '60px',
        height: '90px',
        transformOrigin: 'center center',
        padding: 0,
        boxSizing: 'border-box',
        border: 'none',
        background: 'transparent',
    };

    // Kezdő pozíció az animációhoz
    const initialStyle = shouldAnimate && !hasAnimatedRef.current ? {
        left: '45%',
        top: '50%',
        transform: 'rotateY(0deg) rotateZ(0deg)',
    } : {
        left: isMobile ? '45%' : '55%',
        top: isMobile ? `calc(${index * 1.2}px + 30%)` : `calc(${index * 1.2}px + 49%)`,
        transform: `rotateZ(${rotation || '0deg'})`,
    };

    return (
        <div
            ref={cardRef}
            style={{
                ...baseStyle,
                ...initialStyle,
                backgroundColor: '#2c5f2d',
                border: '1px solid #1a3a1b',
                borderRadius: '8px',
                display: 'flex',
                zIndex:zIndex?zIndex:200*(index+10),
                alignItems: 'center',
                justifyContent: 'center',
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)',
            }}
        >
            <div style={{
                color: '#fff',
                fontSize: 10,
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                pointerEvents: 'none',
                textAlign: 'center',
            }}>
                ?
            </div>
        </div>
    );
}

export default DeckCard;