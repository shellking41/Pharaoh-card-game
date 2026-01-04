import React, { useLayoutEffect, useRef, useEffect } from 'react';

function DeckCard({ index, rotation, shouldAnimate = false, isMobile = false, onAnimationComplete, zIndex }) {
    const cardRef = useRef(null);
    const hasAnimatedRef = useRef(false);
    const animationRef = useRef(null);
    const isAnimatingRef = useRef(false);
    const lastIsMobileRef = useRef(isMobile);

    // Külön useEffect az isMobile változás kezelésére
    useEffect(() => {
        if (lastIsMobileRef.current !== isMobile && hasAnimatedRef.current && cardRef.current) {
            console.log('[DECK CARD] isMobile changed, updating position', { isMobile });
            const element = cardRef.current;
            const deckPos = {
                left: isMobile ? '45%' : '55%',
                top: isMobile ? `calc(${index * 1.2}px + 30%)` : `calc(${index * 1.2}px + 49%)`,
            };
            element.style.left = deckPos.left;
            element.style.top = deckPos.top;
            lastIsMobileRef.current = isMobile;
        }
    }, [isMobile, index]);

    // useLayoutEffect — fut render után, de paint előtt => megszünteti a "flash" race condition-t
    useLayoutEffect(() => {
        // Ha már animál, ne csináljunk semmit
        if (isAnimatingRef.current) {
            return;
        }

        // Ha már animált és nem változott az isMobile, skip
        if (hasAnimatedRef.current && lastIsMobileRef.current === isMobile) {
            return;
        }

        if (shouldAnimate && cardRef.current && !hasAnimatedRef.current) {
            console.log('[DECK CARD] Starting animation (layout effect) for last card');
            isAnimatingRef.current = true;

            const element = cardRef.current;

            // Biztosítsuk, hogy az elem ne villanjon — kezdetben opacity 0 a renderben, itt állítjuk 1-re
            element.style.opacity = '1';

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
            animationRef.current = element.animate(keyframes, {
                duration: 500,
                easing: 'ease-in-out',
            });

            animationRef.current.onfinish = () => {
                console.log('[DECK CARD] Animation completed');
                hasAnimatedRef.current = true;
                isAnimatingRef.current = false;
                lastIsMobileRef.current = isMobile;
                onAnimationComplete?.();
            };
        }
    }, [shouldAnimate, index, rotation, isMobile, onAnimationComplete]);

    // Cleanup: ha a komponens unmountol, állítsuk le az animációt
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                animationRef.current.cancel();
            }
        };
    }, []);

    const baseStyle = {
        position: 'absolute',
        width: '60px',
        height: '90px',
        transformOrigin: 'center center',
        padding: 0,
        boxSizing: 'border-box',
        border: 'none',
        background: 'transparent',
        willChange: 'left, top, transform, opacity',
    };

    // Ha kell animálni és még nem animált, render kezdetben legyen rejtett (opacity: 0)
    const shouldUseInitialPosition = shouldAnimate && !hasAnimatedRef.current;

    const initialStyle = shouldUseInitialPosition ? {
        left: isMobile ? '45%' : '55%',
        top: isMobile ? '30%': '50%',
        transform: 'rotateY(0deg) rotateZ(0deg)',
        opacity: 0,
    } : {
        left: isMobile ? '45%' : '55%',
        top: isMobile ? `calc(${index * 1.2}px + 30%)` : `calc(${index * 1.2}px + 49%)`,
        transform: `rotateY(0deg) rotateZ(${rotation || '0deg'})`,
        opacity: 1,
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
                zIndex: zIndex ? zIndex : 20 * (index + 10),
                alignItems: 'center',
                justifyContent: 'center',
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)',
                transition: 'left 0.3s ease, top 0.3s ease',
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

export default React.memo(DeckCard);