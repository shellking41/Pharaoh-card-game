import React, { memo, forwardRef, useContext, useEffect, useMemo, useRef, useState, useImperativeHandle } from 'react';
import './Style/HungarianCard.css';
import { GameSessionContext } from '../../Contexts/GameSessionContext.jsx';




export function getPlayerPositionBySeat(playerSeat, selfSeat, totalPlayers) {
    // Saját játékos mindig bottom pozícióban van
    if (playerSeat === selfSeat) {
        return 'bottom';
    }

    // Relatív seat különbség kiszámítása (óramutató járása szerinti irányban)
    let relativeSeat = (playerSeat - selfSeat + totalPlayers) % totalPlayers;

    // Ha negatív lenne, korrigáljuk
    if (relativeSeat < 0) {
        relativeSeat += totalPlayers;
    }

    // 2 játékos esetén
    if (totalPlayers === 2) {
        // 0: bottom (self)
        // 1: top (opponent)
        return relativeSeat === 1 ? 'top' : 'bottom';
    }

    // 3 játékos esetén
    if (totalPlayers === 3) {
        // 0: bottom (self)
        // 1: left (első ellenfél - óramutató járásával következő)
        // 2: right (második ellenfél)
        switch (relativeSeat) {
            case 0: return 'bottom';
            case 1: return 'left';
            case 2: return 'right';
            default: return 'bottom';
        }
    }

    // 4 játékos esetén
    if (totalPlayers === 4) {
        // 0: bottom (self)
        // 1: left (első ellenfél - óramutató járásával következő)
        // 2: top (szemben ülő)
        // 3: right (harmadik ellenfél)
        switch (relativeSeat) {
            case 0: return 'bottom';
            case 1: return 'left';
            case 2: return 'top';
            case 3: return 'right';
            default: return 'bottom';
        }
    }

    return 'bottom';
}


export function getCardStyleForPosition(pos, cardIndex, cardsCount) {
    const spacing = 40
  const halfRow = ((Math.max(0, cardsCount - 1)) * spacing) /2;

  switch (pos) {
    case 'bottom':
      return {
        left: `calc(50% - ${halfRow}px + ${cardIndex * spacing}px)`,
        top: 'calc(100% - var(--card-height))',
        rotate: '0deg',
      };

    case 'top':
      return {
        left: `calc(45% - ${halfRow}px + ${cardIndex * spacing}px)`,
        top: '0px',
        rotate: '180deg',
      };

    case 'left':
      return {
        left: 'calc(var(--card-width) / 4)',
        top: `calc(50% - ${halfRow}px + ${cardIndex * spacing}px)`,
        rotate: '90deg',
      };

    case 'right':
      return {
        left: 'calc(100% - var(--card-width))',
        top: `calc(50% - ${halfRow}px + ${cardIndex * spacing}px)`,
        rotate: '270deg',
      };

    default:
      return {
        left: `calc(50% - ${halfRow}px + ${cardIndex * spacing}px)`,
        top: 'calc(100% - var(--card-height))',
        rotate: '0deg',
      };
  }
}

// Segédfüggvény a kártya kép elérési útjának generálásához
function getCardImagePath(suit, rank) {
  if(suit && rank) {
    const suitLower = suit.toLowerCase();
    const rankUpper = rank.toUpperCase();

  return `/src/assets/${suitLower}${rankUpper}.png`;
  }
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
    isAnimating
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
      transformStyle: 'preserve-3d',
      backfaceVisibility: "hidden"
  };
  // Kártya képpel
  const imagePath = getCardImagePath(cardData?.suit, cardData?.rank);

  // Hátlap (amikor nincs cardData)
  if (!cardData ) {
    return (
        <div
            ref={rootRef}
            className={"base-card"}
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



  return (
      <button
          ref={rootRef}
          onClick={onClick}
          className={`
          base-card
          ${isCardPlayable || !isAnimating ? 'selectable-card' : ''}
          ${ownCard ? 'own-card' : ''}
          ${(!isCardPlayable && ownCard) || isAnimating ? 'not-selectable-card' : ''}
        `}
          disabled={(ownCard && !isCardPlayable && !isAlreadySelected) || isAnimating}
          style={{
            ...baseStyle,
            border: isSelected && '3px solid #ffd700',
            borderRadius:  '8px',
            boxShadow: isSelected
                && '0 0 15px rgba(255, 215, 0, 0.8)'

          }}
      >
        <img
            data-played-card
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
