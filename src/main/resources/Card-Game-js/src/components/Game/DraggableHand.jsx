import React, { useContext, useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import HungarianCard, {getCardStyleForPosition} from './HungarianCard';
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

  const stateRef = useRef({ draggedIndex: null, hasChanges: false, cards: [] });

  useEffect(() => {
    stateRef.current = { draggedIndex, hasChanges, cards };
  }, [draggedIndex, hasChanges, cards]);

  useEffect(() => {
    const handleDragEnd = () => {
      const { draggedIndex, hasChanges, cards } = stateRef.current;

      if (draggedIndex !== null) {
        setDraggedIndex(null);

        if (hasChanges) {
          sendReorderToBackend(cards);
          setHasChanges(false);
        }

        onReorder?.(cards);
      }
    };

    document.addEventListener('dragend', handleDragEnd);
    return () => document.removeEventListener('dragend', handleDragEnd);
  }, []);

  const sendReorderToBackend = (reorderedCards) => {
    if (!playerSelf?.playerId) {
      console.error('Player ID not found');
      return;
    }

    const cardIds = reorderedCards.map(card => card.cardId);



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


  const isCardSelected = (card) => {
    return selectedCards.some(selected => selected.cardId === card.cardId);
  };



  return (
      <>
        {cards.map((card, index) => {
          const orderIndex = selectedCards.findIndex(c => c.cardId === card.cardId);
          const orderNumber = orderIndex >= 0 ? orderIndex + 1 : null;
          const cardStyle = getCardStyleForPosition("bottom", index, cards.length);

          return (
              <div
                  key={`card-container-${card.cardId}`}
                  ref={(el) => {
                    if (el) {
                      cardRefs.current[card.cardId] = el;
                    }
                  }}
                  className={`own-card-container ${draggedIndex !== null ? 'dragging' : ''}`}
                  draggable={!isAnimating}
                  onDragStart={() => !isAnimating && handleDragStart(index)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!isAnimating) handleDragOver(index);
                  }}
                  style={{
                    position: 'absolute',
                    left: cardStyle.left,
                    top: cardStyle.top,
                    transition: `
                left 0.35s ease,
                top 0.35s ease,
                transform 0.35s ease
              `,
                    transform: `rotate(${cardStyle.rotate}) scale(1)`,
                    zIndex: index + 1,
                    cursor: isAnimating ? 'not-allowed' : 'grab',
                  }}
              >
                <HungarianCard
                    cardData={card}
                    ownCard={true}
                    onClick={() => handleCardClick(card)}
                    selectedOrderNumber={orderNumber}
                    isAnimating={isAnimating}
                    isSelected={isCardSelected(card)}
                />
              </div>
          );
        })}
      </>
  );

});

DraggableHand.displayName = 'DraggableHand';

export default DraggableHand;