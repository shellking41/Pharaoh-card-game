
export const handleDrawAnimationComplete = (cardId, setAnimatingDrawCards, setGameSession) => {
    setAnimatingDrawCards(prev => {
        const filtered = prev.filter(c => (c.card.cardId || c.card.refKey) !== cardId);


        if (filtered.length === 0) {

            console.log("All draw animations completed");
        }

        return filtered;
    });
};