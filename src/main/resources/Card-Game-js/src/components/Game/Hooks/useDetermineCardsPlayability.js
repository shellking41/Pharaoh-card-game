import { useMemo } from 'react'

function useDetermineCardsPlayability(playedCards, ownCards, selectedCards) {
    const compareSuitsAndRanks = (firstCard, secondCard) => {
        if (!firstCard || !secondCard) return false;
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
    }, [ownCards, playedCards, selectedCards]);
}

export default useDetermineCardsPlayability;
