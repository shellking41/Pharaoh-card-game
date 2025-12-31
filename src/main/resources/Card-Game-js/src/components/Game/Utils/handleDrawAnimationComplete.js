export const handleDrawAnimationComplete = (
    cardId,
    setAnimatingDrawCards
) => {
    console.log('[DRAW COMPLETE] Card finished:', cardId);

    setAnimatingDrawCards(prev => {
        // Megszámoljuk, hány animáció maradna EZ UTÁN
        const remainingCount = prev.filter(anim => {
            const animId = anim.card.cardId || anim.card.refKey;
            return animId !== cardId;
        }).length;

        const totalCards = prev.length;

        console.log(
            '[DRAW COMPLETE] Completed:',
            totalCards - remainingCount,
            'of',
            totalCards
        );


        if (remainingCount === 0) {
            console.log('[DRAW COMPLETE] All draw animations completed – clearing all');
            return [];
        }


        console.log(
            '[DRAW COMPLETE] Still animating, keeping all. Remaining:',
            remainingCount
        );
        return prev;
    });
};
