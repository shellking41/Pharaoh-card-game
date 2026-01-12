import React, { useEffect, useRef } from 'react';
import HungarianCard from './HungarianCard';

const AnimatingCard = function AnimatingCard({
  card,
  waypoints = [],
  duration,
  delay = 0,
  onComplete,
  rotation,
  zIndex,
  linear,
}) {
  const cardRef = useRef(null);
  const animationStartedRef = useRef(false);
  const animationRef = useRef(null);
  const timeoutIdRef = useRef(null);
  const completedRef = useRef(false);

  useEffect(() => {
    console.log('[animation calculation started]');

    if (animationStartedRef.current || completedRef.current) {
      return;
    }
    console.log('[animation calculation started 1]');
    if (!cardRef.current || waypoints.length === 0) {
      return;
    }
    console.log('[animation calculation started 2]');

    const element = cardRef.current;
    animationStartedRef.current = true;

    const keyframes = waypoints.map(wp => {
      const transforms = [];

      if (wp.scale) {
        transforms.push(`scale(${wp.scale})`);
      }

      // FIX: Használjuk a waypoint saját rotate értékét, ha van
      // A rotation prop csak reshuffle animációnál van használva
      const rotateValue = rotation || wp.rotate;
      if (rotateValue && rotateValue !== '0deg') {
        transforms.push(`rotate(${rotateValue})`);
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

    console.log('[ANIMATION START]', {
      cardId: card.cardId || card.refKey,
      delay,
      duration: totalDuration,
      keyframes,
    });

    timeoutIdRef.current = setTimeout(() => {
      console.log('[ANIMATION STARTING NOW]', card.cardId || card.refKey);

      animationRef.current = element.animate(keyframes, {
        duration: totalDuration,
        easing: !linear ? 'cubic-bezier(0.2, 0.65, 0.3, 1)' : 'linear',
        fill: 'forwards',
      });

      animationRef.current.onfinish = () => {
        if (!completedRef.current) {
          completedRef.current = true;

          console.log('[ANIMATION COMPLETE]', {
            cardId: card.cardId || card.refKey,
            completed: true,
            timestamp: Date.now(),
          });

          setTimeout(() => {
            console.log('[CALLING onComplete]', card.cardId || card.refKey);
            onComplete?.(card.cardId || card.refKey);
          }, 100);
        }
      };
    }, delay);

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, []);

  const firstWaypoint = waypoints[0] || {};
  const initialTransforms = [];

  if (firstWaypoint.scale) {
    initialTransforms.push(`scale(${firstWaypoint.scale})`);
  }

  // FIX: Használjuk a rotation prop-ot vagy az első waypoint rotate értékét
  const initialRotate = rotation || firstWaypoint.rotate;
  if (initialRotate && initialRotate !== '0deg') {
    initialTransforms.push(`rotate(${initialRotate})`);
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
    transition: `
            left 0.35s ease,
            top 0.35s ease,
            transform 0.35s ease
        `,
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
        zIndex: zIndex ? zIndex : 99,
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
        <HungarianCard cardData={card.cardId || card.refKey ? card : null}
                       zIndex={zIndex}/>
      </div>

      <div
        style={{
          ...baseStyle,
          position: 'absolute',
          top: 0,
          left: 0,
          backfaceVisibility: 'hidden',
          transform: rotation ? 'rotateY(0deg)' : 'rotateY(180deg)',
          backgroundColor: 'rgb(var(--main-color))',
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
};

export default AnimatingCard;