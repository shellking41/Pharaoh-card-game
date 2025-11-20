import React, { useEffect, useState } from 'react';
import HungarianCard from './HungarianCard';

export default function DraggableHand({
  initialCards = [],
  selectedCards = [],
  isCardsPlayable = [],
  handleCardClick = () => {},
  spacing = 40,
  onReorder,
}) {
  const [cards, setCards] = useState(initialCards);
  const [draggedIndex, setDraggedIndex] = useState(null);

  useEffect(() => {
    setCards(initialCards);
    console.log(initialCards);

  }, [initialCards]);

  //todo: ha leteszeek egy kartyat akkor vissza rendezi a kartyakat
  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  //todo: ez még bugos mert ha nem huzzuk az egeret a kartya felé akkor nem fut le ez
  const handleDragOver = (index) => {
    if (index === draggedIndex || draggedIndex === null) {
      return;
    }
    const newCards = [...cards];
    const [draggedCard] = newCards.splice(draggedIndex, 1);
    newCards.splice(index, 0, draggedCard);
    setCards(newCards);
    setDraggedIndex(index);
  };

  const handleDrop = () => {
    setDraggedIndex(null);
    if (onReorder) {
      onReorder(cards);
    }

  };

  return (
    <>
      {cards.map((card, index, arr) => (
        <div
          key={card.cardId ?? index}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => {
            e.preventDefault();
            handleDragOver(index);
          }}
          onDrop={handleDrop}
          style={{
            position: 'absolute',
            left: `calc(50% - ${(Math.max(0, arr.length - 1) * spacing) / 2}px + ${index * spacing}px)`,
            bottom: '0',
            transition: 'left 0.2s ease-in-out, transform 0.15s ease',
            zIndex: draggedIndex === index ? 1000 : 1,
          }}
        >
          <HungarianCard
            cardData={card}
            ownCard={true}
            onClick={() => handleCardClick(card)}
            isSelected={selectedCards.includes(card)}
            isPlayable={isCardsPlayable[index]}
          />
        </div>
      ))}
    </>
  );

}
