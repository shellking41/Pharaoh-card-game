import {createContext, useContext, useState} from "react";

export const GameSessionContext = createContext();

// Provider komponens
export const GameSessionContextProvider = ({ children }) => {
    const [gameSession,setGameSession]=useState({
        gameSessionId:null,
        players:[],
        gameStatus:"",
    });
    const [playerSelf,setPlayerSelf]=useState({
        playerId:null,
        seat:null,
        userId:null,
    });
    const contextValue={
        gameSession,
        setGameSession,
        playerSelf,
        setPlayerSelf
    }

    return <GameSessionContext.Provider value={contextValue}>{children}</GameSessionContext.Provider>;
};
