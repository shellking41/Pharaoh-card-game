import React, { memo } from 'react';

function HungarianCard({cardData,onClick,isSelected,isPlayable }) {
  if (!cardData) {
    return (
      <span  style={{
        width: "40px",
        height: "60px",
        backgroundColor: "gray",
        border: "1px solid grey",
        borderRadius: "4px",
      }}>
        Hátlap
      </span>
    );
  }

  // magyar színekhez szín hozzárendelés
  const suitColors = {
    HEARTS: "red",
    ACORNS: "orange",
    BELLS: "brown",
    LEAVES: "green",
  };

  const color = suitColors[cardData.suit] || "black";

  return (
    <button
      onClick={onClick}
      disabled={isPlayable===false}
      style={{
        backgroundColor: color,
        border: isSelected ? "3px solid yellow" : "1px solid black",
        borderRadius: "4px",

        cursor: "pointer",

      }}
    >
      <div>{cardData.suit}</div>
      <div>{cardData.rank}</div>
    </button>
  );

}

export default memo(HungarianCard);