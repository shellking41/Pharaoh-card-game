import { useState, useCallback } from 'react';

function useCalculatePlayAnimation(spacing = 40) {
    const [animations, setAnimations] = useState([]);

    const calculateAnimation = useCallback((cards, cardRefs,goToRef) => {
        console.log(cards, cardRefs,goToRef)

        const target = {
            x: goToRef?.left,
            y: goToRef?.top
        };

        return cards.map((card) => {
            // Kártya DOM elem lekérése a ref-ből
            let cardElement;
            if(card.cardId){
                 cardElement = cardRefs[card.cardId];
            }else{
                //ha opponent kartyarol van szó akkor nincs cardId
                cardElement=cardRefs[card.refKey]
            }

            console.log(cardRefs[card.refKey])

            if (!cardElement) {
                return null;
            }

            // Kártya tényleges pozíciójának lekérése
            const rect = cardElement.getBoundingClientRect();
            const start = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };

            return {
                card: card?card:null,
                from: start,
                to: target,
                duration: 300,
                delay: cards.indexOf(card) * 150
            };
        }).filter(Boolean); // null értékek kiszűrése
    }, [spacing]);

    return { calculateAnimation, animations, setAnimations };
}

export default useCalculatePlayAnimation;