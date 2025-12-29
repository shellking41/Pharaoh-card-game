export const handleReshuffleAnimationComplete = (index, setAnimatingReshuffle, setGameSession, setDeckRotations, totalCards) => {
    console.log('[RESHUFFLE COMPLETE] Card finished:', index, 'Total cards:', totalCards);

    setAnimatingReshuffle(prev => {
        // Megkeressük az aktuális animációt hogy megkapjuk a végső rotációt
        const currentAnim = prev.find(c => c.card.index === index);
        const finalRotation = currentAnim?.waypoints?.[1]?.rotate || '0deg';

        console.log('[RESHUFFLE COMPLETE] Final rotation for index', index, ':', finalRotation);

        // Tároljuk el a rotation értéket a megfelelő indexen
        setDeckRotations(prevRotations => {
            const newRotations = [...prevRotations];
            newRotations[index] = finalRotation;
            console.log('[RESHUFFLE COMPLETE] Updated rotations array:', newRotations);
            return newRotations;
        });

        // Számoljuk meg a befejezett animációkat
        const completedCount = prev.filter(c => c.card.index !== index).length;
        console.log('[RESHUFFLE COMPLETE] Completed animations:', totalCards - completedCount - 1, 'of', totalCards);

        // Csak akkor töröljük az összes animációt, ha ez az utolsó
        if (completedCount === 0) {
            console.log("[RESHUFFLE COMPLETE] All reshuffle animations completed - clearing all");

            // Frissítjük a deckSize-t a newDeckSize-ra
            setGameSession(prev => ({
                ...prev,
                deckSize: prev.newDeckSize ?? prev.deckSize,
                newDeckSize: undefined,
            }));

            // Töröljük az összes animációt egyszerre
            return [];
        }

        // Még vannak hátralevő animációk, megtartjuk az összeset
        console.log('[RESHUFFLE COMPLETE] Still animating, keeping all cards. Remaining:', completedCount);
        return prev;
    });
};