import { useMemo } from 'react'

function useDetermineCardsPlayability(playedCards, ownCards, selectedCards,suitChangedTo) {
    const compareSuitsAndRanks = (firstCard, secondCard) => {



        if (!firstCard || !secondCard) return false;
        //ha szín váltós kártyát tesz le akkor akármire leteheti
        if(secondCard.rank=== "OVER") return true;
        //a fáreóra lelehet tenni mindent
        if(firstCard.rank==="JACK" && firstCard.suit=== "LEAVES") return true;

        if((secondCard.rank==="JACK" && secondCard.suit==="LEAVES") && firstCard.rank==="VII") return true;


        if(suitChangedTo!=null){
            return secondCard.suit === suitChangedTo;
        }
        return firstCard.rank === secondCard.rank || firstCard.suit === secondCard.suit;
    };

    const compareRanks=(firstCard, secondCard) => {
        if (!firstCard || !secondCard) return false;
        return firstCard.rank === secondCard.rank ;
    };
    const getLastCard = (cards) => cards?.[cards.length - 1];

    return useMemo(() => {
        if (!ownCards || ownCards.length === 0) return [];

        const lastPlayedCard = getLastCard(playedCards);
        if (!lastPlayedCard) return ownCards.map(() => false);

        if (selectedCards.length === 0) {
            return ownCards.map((c) => compareSuitsAndRanks(lastPlayedCard, c));
        } else {
            const lastSelectedCard = getLastCard(selectedCards);
            if (!lastSelectedCard) return ownCards.map(() => false);
            return ownCards.map((c) => compareRanks(lastSelectedCard, c));
        }
    }, [ownCards, playedCards, selectedCards,suitChangedTo]);
}

export default useDetermineCardsPlayability;
