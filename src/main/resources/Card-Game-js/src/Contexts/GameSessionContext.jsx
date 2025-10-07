import {createContext, useContext, useState} from "react";

export const GameSessionContext = createContext();

// Provider komponens
export const GameSessionContextProvider = ({ children }) => {
    const [gameSession,setGameSession]=useState({
        gameSessionId:null,
        players:[],
        playerHand:[],
        playedCards:[],
        gameStatus:"",
        playedCardsSize:0,
        deckSize:0,
        gameData:{}
    });
    const [playerSelf,setPlayerSelf]=useState({
        playerId:null,
        seat:null,
        userId:null,

    });

    const [turn,setTurn]=useState({
        currentSeat: null,
        yourTurn: false
    })
    const contextValue={
        gameSession,
        setGameSession,
        playerSelf,
        setPlayerSelf,
        turn,
        setTurn
    }

    return <GameSessionContext.Provider value={contextValue}>{children}</GameSessionContext.Provider>;
};
