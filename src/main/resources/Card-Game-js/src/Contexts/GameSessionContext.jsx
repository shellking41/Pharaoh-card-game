import { createContext, useContext, useState } from 'react';

export const GameSessionContext = createContext();

export const GameSessionContextProvider = ({ children }) => {
  const [gameSession, setGameSession] = useState({
    gameSessionId: null,
    players: [],
    playerHand: [],
    playedCards: [],
    gameStatus: '',
    playedCardsSize: 0,
    deckSize: 0,
    gameData: {},
  });
  const [selectedCards, setSelectedCards] = useState([]);
  const [validPlays, setValidPlays] = useState([]);
  const [isNewRound, setIsNewRound] = useState(false);
  const [animatingDrawCards, setAnimatingDrawCards] = useState([]);
  const [ animatingReshuffle, setAnimatingReshuffle] = useState([]);
  const [deckRotations,setDeckRotations]=useState([])
  const [skipTurn,setSkipTurn]=useState(null)
  const [skippedPlayers,setSkippedPlayers]=useState([])


  const [playerSelf, setPlayerSelf] = useState({
    playerId: null,
    seat: null,
    userId: null,
  });

  const [turn, setTurn] = useState({
    currentSeat: null,
    yourTurn: false,
  });

  const contextValue = {
    gameSession,
    setGameSession,
    playerSelf,
    setPlayerSelf,
    turn,
    setTurn,
    validPlays,
    setValidPlays,
    selectedCards,
    setSelectedCards,
    isNewRound,
    setIsNewRound,
    animatingDrawCards,
    setAnimatingDrawCards,
    animatingReshuffle,
    setAnimatingReshuffle,deckRotations,setDeckRotations,skipTurn,setSkipTurn,skippedPlayers,setSkippedPlayers
  };

  return <GameSessionContext.Provider value={contextValue}>{children}</GameSessionContext.Provider>;
};