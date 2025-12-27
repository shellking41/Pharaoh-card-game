import React, {memo, useEffect, useRef} from 'react';
import HungarianCard from './HungarianCard';

// AnimatingCard.jsx
const AnimatingCard = memo(function AnimatingCard({
                                                      card,
                                                      waypoints = [],
                                                      duration,
                                                      delay = 0,
                                                      onComplete,
                                                  }) {
    const cardRef = useRef(null);
    const animationStartedRef = useRef(false);
    const animationRef = useRef(null);
    const timeoutIdRef = useRef(null);

    useEffect(() => {
        if (animationStartedRef.current) return;
        if (!cardRef.current || waypoints.length === 0) return;

        const element = cardRef.current;
        animationStartedRef.current = true;

        const keyframes = waypoints.map(wp => {
            const transforms = [];

            if (wp.scale) {
                transforms.push(`scale(${wp.scale})`);
            }

            if (wp.rotate && wp.rotate !== '0deg') {
                transforms.push(`rotate(${wp.rotate})`);
            }

            if (wp.transform && wp.transform.includes('rotateY')) {
                const match = wp.transform.match(/rotateY\(([^)]+)\)/);
                if (match) {
                    transforms.push(`rotateY(${match[1]})`);
                }
            }

            return {
                left: wp.left || '0px',
                top: wp.top || '0px',
                transform: transforms.length > 0 ? transforms.join(' ') : 'none',
                offset: wp.offset,
            };
        });

        const totalDuration = duration || 0;

        timeoutIdRef.current = setTimeout(() => {
            animationRef.current = element.animate(keyframes, {
                duration: totalDuration,
                easing: 'linear',
                fill: 'forwards',
            });

            animationRef.current.onfinish = () => {
                setTimeout(() => {
                    onComplete?.(card.cardId || card.refKey);
                }, 100);
            };
        }, delay);

        return () => {
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
            }
            if (animationRef.current) {
                animationRef.current.cancel();
            }
        };
    }, []); // Üres dependency array!

    const firstWaypoint = waypoints[0] || {};
    const initialTransforms = [];

    if (firstWaypoint.scale) {
        initialTransforms.push(`scale(${firstWaypoint.scale})`);
    }
    if (firstWaypoint.rotate && firstWaypoint.rotate !== '0deg') {
        initialTransforms.push(`rotate(${firstWaypoint.rotate})`);
    }
    if (firstWaypoint.transform && firstWaypoint.transform.includes('rotateY')) {
        const match = firstWaypoint.transform.match(/rotateY\(([^)]+)\)/);
        if (match) {
            initialTransforms.push(`rotateY(${match[1]})`);
        }
    }

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

    return (
        <div
            ref={cardRef}
            style={{
                position: 'absolute',
                left: firstWaypoint.left || '0px',
                top: firstWaypoint.top || '0px',
                width: '60px',
                height: '90px',
                transform: initialTransforms.length > 0 ? initialTransforms.join(' ') : 'none',
                zIndex: 9999,
                pointerEvents: 'none',
                transformStyle: 'preserve-3d',
                transformOrigin: 'center center',
            }}
        >
            <div
                style={{
                    ...baseStyle,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(0deg)',
                }}
            >
                <HungarianCard cardData={card.cardId || card.refKey ? card : null}/>
            </div>

            <div
                style={{
                    ...baseStyle,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    backgroundColor: '#2c5f2d',
                    border: '2px solid #1a3a1b',
                    borderRadius: '8px',
                    display: 'flex',
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
        </div>
    );
}, (prevProps, nextProps) => {
    // TRUE = NEM renderelődik újra
    // FALSE = újrarenderelődik
    return (
        prevProps.card.cardId === nextProps.card.cardId &&
        prevProps.card.refKey === nextProps.card.refKey
    );
});

export default AnimatingCard;