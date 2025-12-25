import React, {useContext, useEffect, useState} from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import HungarianCard from "./HungarianCard.jsx";
import {GameSessionContext} from "../../Contexts/GameSessionContext.jsx";

export  default function MobileSelfPlayerHand({
                                  initialCards = [],
                                  selectedCards = [],
                                  handleCardClick = () => {}
                              }) {
    const [cards, setCards] = useState(initialCards);
    const [isOpen, setIsOpen] = useState(false);
    const {turn}=useContext(GameSessionContext)

   useEffect(() => {
        console.log(initialCards);
        setCards(initialCards);
    }, [initialCards]);
    useEffect(() => {
        setTimeout(()=>{
            if(turn?.yourTurn){
                setIsOpen(true)
            }else{
                setIsOpen(false)
            }
        },200)

    }, [turn]);

    return (
        <>

            <button
                className={"toggle-button"}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'absolute',
                    bottom: isOpen ? '110px' : '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000,
                    width: '60px',
                    height: '40px',
                    borderRadius: '20px 20px 0 0',
                    backgroundColor: '#2c5f2d',
                    border: '2px solid #1a3a1b',
                    borderBottom: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: 'rgba(0, 0, 0, 0.3) 1px -8px 6px 0px',
                    transition: 'bottom 0.3s ease-in-out'
                }}
            >
                {isOpen ? <ChevronDown size={24} /> : <ChevronUp size={24} />}
            </button>

            {/* Cards Container */}
            <div
                className="mobile-card-hand"
                style={{
                    transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
                    transition: 'transform 0.3s ease-in-out',
                    backgroundColor: 'rgba(44, 95, 45)',
                    borderTop: '2px solid #1a3a1b',
                    paddingTop: '10px',
                    paddingBottom: '10px'
                }}
            >
                {cards.map((card, index) => (
                    <div key={card.cardId || index} className="mobile-card-container">
                        <HungarianCard
                            cardData={card}
                            ownCard={true}
                            onClick={() => handleCardClick(card)}
                            isSelected={selectedCards.includes(card)}
                        />
                    </div>
                ))}
            </div>
        </>
    );
}