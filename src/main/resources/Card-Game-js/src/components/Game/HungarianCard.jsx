import React, { memo, forwardRef, useContext, useEffect, useMemo, useRef, useState, useImperativeHandle } from 'react';
import './Style/HungarianCard.css';
import { GameSessionContext } from '../../Contexts/GameSessionContext.jsx';

export const spacing = 40;

export function getPlayerPositionBySeat(seatIndex, playersCount) {
  if (playersCount === 2) {
    if (seatIndex === 0) {
      return 'bottom';
    }
    if (seatIndex === 1) {
      return 'top';
    }
  }
  if (playersCount === 3) {
    if (seatIndex === 0) {
      return 'bottom';
    }
    if (seatIndex === 1) {
      return 'left';
    }
    if (seatIndex === 2) {
      return 'right';
    }
  }
  if (playersCount === 4) {
    if (seatIndex === 0) {
      return 'bottom';
    }
    if (seatIndex === 1) {
      return 'left';
    }
    if (seatIndex === 2) {
      return 'top';
    }
    if (seatIndex === 3) {
      return 'right';
    }
  }
  return 'bottom';
}

export function getCardStyleForPosition(pos, cardIndex, cardsCount) {
  const halfRow = ((Math.max(0, cardsCount - 1)) * spacing) / 2;

  switch (pos) {
    case 'bottom':
      return {
        left: `calc(50% - ${halfRow}px + ${cardIndex * spacing}px)`,
        bottom: '0px',
        top: 'auto',
        right: 'auto',
        rotate: '0deg',
      };
    case 'top':
      return {
        left: `calc(50% - ${halfRow}px + ${cardIndex * spacing}px)`,
        top: '0px',
        bottom: 'auto',
        right: 'auto',
        rotate: '180deg',
      };
    case 'left':
      return {
        top: `calc(50% - ${halfRow}px + ${cardIndex * spacing}px)`,
        left: '0px',
        bottom: 'auto',
        right: 'auto',
        rotate: '90deg',
      };
    case 'right':
      return {
        top: `calc(50% - ${halfRow}px + ${cardIndex * spacing}px)`,
        right: '0px',
        bottom: 'auto',
        left: 'auto',
        rotate: '270deg',
      };
    default:
      return {
        left: `calc(50% - ${halfRow}px + ${cardIndex * spacing}px)`,
        bottom: '0px',
        top: 'auto',
        right: 'auto',
        rotate: '0deg',
      };
  }
}

// Segédfüggvény a kártya kép elérési útjának generálásához
function getCardImagePath(suit, rank) {
  const suitLower = suit.toLowerCase();
  const rankUpper = rank.toUpperCase();

  return `/src/assets/${suitLower}${rankUpper}.png`;
}

const HungarianCardInner = ({
                              cardData,
                              onClick,
                              isSelected,
                              top,
                              left,
                              bottom,
                              right,
                              rotate,
                              ownCard,
                            }, forwardedRef) => {
  const { validPlays, selectedCards } = useContext(GameSessionContext);
  const [isCardPlayable, setIsCardPlayable] = useState(false);

  const rootRef = useRef(null);

  useImperativeHandle(forwardedRef, () => rootRef.current, [rootRef.current]);

  useEffect(() => {
    if (ownCard && cardData) {
      const isAlreadySelected = selectedCards.some(c => c.cardId === cardData.cardId);

      if (isAlreadySelected) {
        setIsCardPlayable(true);
        return;
      }

      const selectedCount = selectedCards.length;

      let relevantPlays = validPlays.filter(vp => {
        return selectedCards.every(selected =>
            vp.some(card => card.cardId === selected.cardId),
        );
      });

      relevantPlays.sort((a, b) => b.length - a.length);

      const isPlayable = relevantPlays.some(vp => {
        if (selectedCount === 0) {
          return vp[0].cardId === cardData.cardId;
        }
        return vp.some(card => card.cardId === cardData.cardId);
      });

      setIsCardPlayable(isPlayable);
    }
  }, [validPlays, selectedCards, cardData, ownCard]);

  const isAlreadySelected = useMemo(() => {
    return selectedCards.some(c => c.cardId === cardData?.cardId);
  }, [selectedCards, cardData]);

  const transformRotate = rotate ? `rotate(${rotate})` : undefined;

  const baseStyle = {
    position: 'absolute',
    width: '60px',
    height: '90px',
    left: left ?? undefined,
    right: right ?? undefined,
    top: top ?? undefined,
    bottom: bottom ?? undefined,
    transform: transformRotate ?? undefined,
    transformOrigin: 'center center',
    padding: 0,
    boxSizing: 'border-box',
    cursor: isCardPlayable === false ? 'not-allowed' : 'pointer',
    border: 'none',
    background: 'transparent',
  };

  // Hátlap (amikor nincs cardData)
  if (!cardData) {
    return (
        <div
            ref={rootRef}
            style={{
              ...baseStyle,
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
    );
  }

  // Kártya képpel
  const imagePath = getCardImagePath(cardData.suit, cardData.rank);

  return (
      <button
          ref={rootRef}
          onClick={onClick}
          className={isCardPlayable ? 'selectable-card' : ownCard && 'not-selectable-card'}
          disabled={ownCard && !isCardPlayable && !isAlreadySelected}
          style={{
            ...baseStyle,
            border: isSelected ? '3px solid #ffd700' : 'none',
            borderRadius: isSelected ? '8px' : '0',
            boxShadow: isSelected
                ? '0 0 15px rgba(255, 215, 0, 0.8)'
                : '0 2px 4px rgba(0,0,0,0.2)',
          }}
      >
        <img
            src={imagePath}
            alt={`${cardData.suit} ${cardData.rank}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '6px',
              pointerEvents: 'none',
            }}
            onError={(e) => {
              console.error(`Failed to load card image: ${imagePath}`);
              e.target.style.display = 'none';
              // ha a kép nem tölt be akkor a szülő elembe írunk fallback tartalmat
              const parent = e.target.parentElement;
              if (parent) {
                parent.style.backgroundColor = '#333';
                parent.innerHTML = `<div style="color: white; font-size: 10px; text-align: center;">${cardData.suit}<br/>${cardData.rank}</div>`;
              }
            }}
        />
      </button>
  );
};

// wrap forwardRef with memo for performance
const HungarianCard = memo(forwardRef(HungarianCardInner));
export default HungarianCard;
