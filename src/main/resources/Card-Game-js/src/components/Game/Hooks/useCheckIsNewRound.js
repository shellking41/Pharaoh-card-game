import React, {useContext, useEffect, useState} from 'react'
import {GameSessionContext} from "../../../Contexts/GameSessionContext.jsx";

export default function useCheckIsNewRound() {
    const {gameSession, setGameSession,setIsNewRound,isNewRound} = useContext(GameSessionContext)

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

    const handleNextRoundAnimationComplete = () => {
        setShouldShowNotification(false);
    };

    return {
        isNewRound,
        shouldShowNotification,
        handleNextRoundAnimationComplete
    }
}