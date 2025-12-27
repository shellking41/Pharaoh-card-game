import React, {useContext, useEffect, useState} from 'react'
import {GameSessionContext} from "../../../Contexts/GameSessionContext.jsx";

export default function useCheckIsNewRound() {
    const {gameSession, setGameSession} = useContext(GameSessionContext)

    const [isNewRound, setIsNewRound] = useState(false)
    const [shouldShowNotification, setShouldShowNotification] = useState(false)

    useEffect(() => {
        if (
            gameSession.newRound &&
            gameSession.newRound !== 1 &&
            gameSession.gameData?.currentRound !== gameSession.newRound
        ) {
            console.log("CHANGED", gameSession.newRound, gameSession.gameData?.currentRound)

            setGameSession(prev => ({
                ...prev,
                gameData: {
                    ...prev.gameData,
                    currentRound: gameSession.newRound
                },
            }));
            setIsNewRound(true)
        }
    }, [gameSession.newRound]);

    useEffect(() => {
        console.log("valtozott", gameSession.gameData?.currentRound, gameSession.newRound)
    }, [gameSession.gameData?.currentRound, gameSession.newRound]);

    useEffect(() => {
        console.log("valtozott", isNewRound)
        if (isNewRound) {
            // Várunk, amíg az összes animáció befejeződik
            // Ez az idő a leghosszabb kártyaletétel animáció ideje + buffer
            const animationDelay = 1000; // 1 másodperc buffer az animációk befejezéséhez

            const timer = setTimeout(() => {
                 setShouldShowNotification(true);
                 setIsNewRound(false);
            }, animationDelay);

            return () => clearTimeout(timer);
        }
    }, [isNewRound]);

    const handleAnimationComplete = () => {
        setShouldShowNotification(false);
    };

    return {
        isNewRound,
        shouldShowNotification,
        handleAnimationComplete
    }
}