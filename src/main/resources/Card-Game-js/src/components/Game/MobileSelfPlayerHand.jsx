import React, {
  useContext,
  useEffect,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import HungarianCard from './HungarianCard.jsx';
import { GameSessionContext } from '../../Contexts/GameSessionContext.jsx';

const MobileSelfPlayerHand = forwardRef(({
  initialCards = [],
  selectedCards = [],
  handleCardClick = () => {},
  selectedCardsOrder = [],
  isAnimating,
  onOpenStateChange, // callback az állapotváltozáshoz
                                             currentRoundKey = 0
}, ref) => {
  const [cards, setCards] = useState(initialCards);
  const [isOpen, setIsOpen] = useState(false);
  const { turn, animatingDrawCards } = useContext(GameSessionContext);

  const cardRefs = useRef({});
  const clicked = useRef(false);

  // Expose getCardRefs method to parent component
  useImperativeHandle(ref, () => ({
    getCardRefs: () => cardRefs.current,
    isOpen: () => isOpen, // Expose current open state
  }));

  useEffect(() => {
    setCards(initialCards);
  }, [initialCards]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (turn?.yourTurn) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    }, 1300);

    if (clicked.current) {
      clearTimeout(id);
      clicked.current = false;
    }
  }, [turn, animatingDrawCards]);

  // Notify parent when isOpen changes
  useEffect(() => {
    if (onOpenStateChange) {

      setTimeout(() => { onOpenStateChange(isOpen);}, 300);
    }
  }, [isOpen, onOpenStateChange]);

  const handleToggle = () => {
    clicked.current = true;
    const newState = !isOpen;
    setIsOpen(newState);

    if (onOpenStateChange) {
      onOpenStateChange(newState);

    }
  };

  return (
    <>
      <button
        className={'toggle-button'}
        onClick={handleToggle}
        style={{
          position: 'absolute',
          bottom: isOpen ? '110px' : '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          width: '60px',
          height: '40px',
          borderRadius: '20px 20px 0 0',
          backgroundColor: 'rgb(var(--main-color))',
          border: '2px solid #1a3a1b',
          borderBottom: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: 'rgba(0, 0, 0, 0.3) 1px -8px 6px 0px',
          transition: 'bottom 0.3s ease-in-out',
        }}
      >
        {isOpen ? <ChevronDown size={24}/> : <ChevronUp size={24}/>}
      </button>

      {/* Cards Container */}
      <div
        className="mobile-card-hand"
        style={{
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s ease-in-out',
          backgroundColor: 'rgb(var(--main-color))',
          borderTop: '2px solid #1a3a1b',
          paddingTop: '10px',
          paddingBottom: '10px',
        }}
      >
        {cards.map((card, index) => {
            const uniqueKey = `mobile-round-${currentRoundKey}-${card.cardId}-${index}`;

            // Keressük meg a kártya sorszámát a selectedCardsOrder tömbben
          const orderIndex = selectedCardsOrder.findIndex(c => c.cardId === card.cardId);
          const orderNumber = orderIndex >= 0 ? orderIndex + 1 : null;

          return (
            <div
                key={uniqueKey}
              className="mobile-card-container"
              ref={(el) => {
                if (el) {
                  cardRefs.current[card.cardId] = el;
                }
              }}
            >
              <div style={{ position: 'relative' }}>
                <HungarianCard
                  cardData={card}
                  ownCard={true}
                  isAnimating={isAnimating}
                  onClick={() => handleCardClick(card)}
                  isSelected={selectedCards.includes(card)}
                  selectedOrderNumber={orderNumber}
                />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
});

MobileSelfPlayerHand.displayName = 'MobileSelfPlayerHand';

export default MobileSelfPlayerHand;