import React, { useContext, useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import HungarianCard from './HungarianCard';
import useWebsocket from '../../hooks/useWebsocket';
import { GameSessionContext } from '../../Contexts/GameSessionContext';

const DraggableHand = forwardRef(({
                                    initialCards = [],
                                    selectedCards = [],
                                    handleCardClick = () => {},
                                    spacing = 40,
                                    isAnimating,
                                    onReorder,
                                  }, ref) => {
  const [cards, setCards] = useState(initialCards);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  const { sendMessage } = useWebsocket();
  const { playerSelf } = useContext(GameSessionContext);

  const cardRefs = useRef({});


  useImperativeHandle(ref, () => ({
    getCardRefs: () => cardRefs.current
  }));

  useEffect(() => {
    setCards(initialCards);
    setHasChanges(false);
  }, [initialCards]);

  useEffect(() => {
    const handleDragEnd = () => {
      if (draggedIndex !== null) {
        setDraggedIndex(null);

        if (hasChanges) {
          sendReorderToBackend(cards);
          setHasChanges(false);
        }

        if (onReorder) {
          onReorder(cards);
        }
      }
    };

    document.addEventListener('dragend', handleDragEnd);

    return () => {
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, [draggedIndex, cards, onReorder, hasChanges]);

  const sendReorderToBackend = (reorderedCards) => {
    if (!playerSelf?.playerId) {
      console.error('Player ID not found');
      return;
    }

    const cardIds = reorderedCards.map(card => card.cardId);

    console.log('Sending reorder request:', {
      playerId: playerSelf.playerId,
      cardIds: cardIds
    });

    sendMessage('/app/game/reorder-cards', {
      playerId: playerSelf.playerId,
      cardIds: cardIds
    });
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (index) => {
    if (index === draggedIndex || draggedIndex === null) {
      return;
    }

    const newCards = [...cards];
    const [draggedCard] = newCards.splice(draggedIndex, 1);
    newCards.splice(index, 0, draggedCard);
    setCards(newCards);
    setDraggedIndex(index);
    setHasChanges(true);
  };

  // Helper fÃ¼ggvÃ©ny: ellenÅ‘rzi, hogy egy kÃ¡rtya ki van-e vÃ¡lasztva (cardId alapjÃ¡n)
  const isCardSelected = (card) => {
    return selectedCards.some(selected => selected.cardId === card.cardId);
  };

  return (
      <>
        {cards.map((card, index, arr) => (
            <div
                key={`fallback-${card.cardId}-${index}`}
                ref={(el) => {
                  if (el) {
                    cardRefs.current[card.cardId] = el;
                  }
                }}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => {
                  e.preventDefault();
                  handleDragOver(index);
                }}
                style={{
                  position: 'absolute',
                  left: `calc(45% - ${(Math.max(0, arr.length - 1) * spacing) / 2}px + ${index * spacing}px)`,
                  bottom: 'var(--card-height)',
                  transition: draggedIndex === index ? 'none' : 'left 0.2s ease-in-out',
                  transform: draggedIndex === index ? 'scale(1.05)' : 'scale(1)',
                  zIndex: draggedIndex === index ? 1000 : 1,
                  cursor: 'grab',
                }}
            >
              <HungarianCard
                  cardData={card}
                  ownCard={true}
                  onClick={() => handleCardClick(card)}
                  isAnimating={isAnimating}
                  isSelected={isCardSelected(card)}
              />
            </div>
        ))}
      </>
  );
});

DraggableHand.displayName = 'DraggableHand';

export default DraggableHand;