export const handleReshuffleAnimationComplete = (
    index,
    setAnimatingReshuffle,
    setGameSession,
    setDeckRotations,
    totalCards
) => {
    console.log('[RESHUFFLE COMPLETE] Card finished:', index, 'Total cards:', totalCards);

    setAnimatingReshuffle(prev => {
        // Find the current animation by index
        const currentAnim = prev.find(c => c.card.index === index);

        if (!currentAnim) {
            console.warn('[RESHUFFLE COMPLETE] Animation not found for index:', index);
            return prev;
        }

        const finalRotation = currentAnim?.waypoints?.[1]?.rotate || '0deg';
        console.log('[RESHUFFLE COMPLETE] Final rotation for index', index, ':', finalRotation);

        // Update deck rotation immediately
        setDeckRotations(prevRotations => {
            const newRotations = [...prevRotations];
            newRotations[index] = finalRotation;
            console.log('[RESHUFFLE COMPLETE] Updated rotations array at index', index);
            return newRotations;
        });

        // KRITIKUS RÉSZ: Jelöljük meg a kártyát befejezettként, de NE távolítsuk el
        const updatedAnimations = prev.map(anim => {
            if (anim.card.index === index) {
                return {
                    ...anim,
                    completed: true // Jelölés, hogy befejeződött
                };
            }
            return anim;
        });

        // Számoljuk meg, hány animáció fejeződött be
        const completedCount = updatedAnimations.filter(a => a.completed).length;
        console.log('[RESHUFFLE COMPLETE] Completed:', completedCount, 'of', totalCards);

        // Csak akkor töröljünk mindent, ha MINDEN kártya befejezte az animációt
        if (completedCount === totalCards) {
            console.log("[RESHUFFLE COMPLETE] All reshuffle animations completed - clearing all");

            setTimeout(() => {
                setGameSession(prev => ({
                    ...prev,
                    deckSize: prev.newDeckSize ?? prev.deckSize,
                    newDeckSize: undefined,
                }));
            }, 100);

            // Most már törölhetjük az összes animációt
            return [];
        }

        // Még nem fejeződött be minden animáció, megtartjuk az összeset
        console.log('[RESHUFFLE COMPLETE] Still animating. Remaining:', totalCards - completedCount);
        return updatedAnimations;
    });
};