import React, {use, useContext, useEffect, useLayoutEffect, useState} from 'react';
import {GameSessionContext} from "../Contexts/GameSessionContext.jsx";
import {useNavigate, useParams} from "react-router-dom";
import useWebsocket from "../hooks/useWebsocket.js";
import useSubscribeToTopicByPage from "../hooks/useSubscribeToTopicByPage.js";
import HungarianCard from '../components/Game/HungarianCard.jsx';
import {useApiCallHook} from "../hooks/useApiCallHook.js";
import {TokenContext} from "../Contexts/TokenContext.jsx";
import {UserContext} from "../Contexts/UserContext.jsx";
import useDetermineCardsPlayability from "../components/Game/Hooks/useDetermineCardsPlayability.js";



function Game() {
    const {gameSession,playerSelf,turn,setTurn,setPlayerSelf}=useContext(GameSessionContext);
    const {gameSessionId} = useParams();
    const {sendMessage}=useWebsocket();
    const {userCurrentStatus}=useContext(UserContext);
    const {token} = useContext(TokenContext);
    const {get,post} = useApiCallHook();
    const navigate = useNavigate();

    useSubscribeToTopicByPage({page: "game"})

    const [selectedCards, setSelectedCards] = useState([]);

    const isCardsPlayable = useDetermineCardsPlayability(
        gameSession?.playedCards,
        gameSession?.playerHand?.ownCards,
        selectedCards
    );

    useEffect(() => {
        console.log(gameSession)

    }, [gameSession]);
    useEffect(() => {

        const getCurrentTurn=async ()=>{

            console.log("baj")
            const turn= await get("http://localhost:8080/game/current-turn",token);
            setTurn(turn);

        }
        getCurrentTurn();
    }, []);


    const canPlayAnyCard = () => {
        if (!isCardsPlayable || isCardsPlayable.length === 0) return false;
        return isCardsPlayable.some(playable => playable === true);
    };

    const canDrawCard = () => {
        return gameSession?.deckSize > 0;
    };

    const mustSkipTurn = () => {
        return turn?.yourTurn &&
            !canPlayAnyCard() &&
            !canDrawCard() &&
            gameSession?.playedCards?.length <= 1;
    };

    const drawCard=()=>{
        console.log(playerSelf)

        sendMessage("/app/game/draw",{playerId:playerSelf.playerId})
    }
    const handleCardClick = (card) => {
        setSelectedCards(prev => {
            const exists = prev.find(c => c === card); // vagy c.id, ha van egyedi azonosító
            if (exists) {
                // ha már benne van → eltávolítjuk
                return prev.filter(c => c !== card);
            } else {
                // ha nincs → hozzáadjuk
                return [...prev, card];
            }
        });
    }
    const playCards=()=> {
        console.log(selectedCards)
        const playCards = selectedCards.map(({ cardId, suit, rank,ownerId,position }) => ({
            cardId,
            suit,
            rank,
            ownerId,
            position
        }));

        console.log(playCards);
        sendMessage("/app/game/play-cards",{playCards,playerId:playerSelf.playerId})
        setSelectedCards([]);
    }
    const leaveGame=async ()=>{
        console.log("asd")

       const response=await post("http://localhost:8080/game/leave",{gameSessionId:gameSession.gameSessionId},token);
        console.log(response);

    }
    const drawStackOfCards=()=>{
        sendMessage("/app/game/draw-stack-of-cards",{playerId:playerSelf.playerId});
        setPlayerSelf((prev)=>({...prev,drawStackNumber:null}))
    }

    const skipTurn = () => {
        sendMessage("/app/game/skip", { playerId: playerSelf.playerId });
    };
    return (
        <>
            {gameSession.players.map((p) => (
                <div key={p.playerId}>{p?.playerName}</div>
            ))}

            {gameSession.playerHand?.ownCards?.map((c, index) => (
                <HungarianCard
                    key={index}
                    cardData={c}
                    onClick={() => handleCardClick(c)}
                    isSelected={selectedCards.includes(c)}
                    isPlayable={isCardsPlayable[index]}
                />
            ))}

            {gameSession.players.map((p) => {
                if (p.playerId === playerSelf.playerId) return null;

                const count = gameSession.playerHand?.otherPlayersCardCount[String(p.playerId)] ?? 0;

                return (
                    <div key={p.playerId}>
                        <div>{p.playerName}</div>
                        {count}
                        {Array.from({ length: count }).map((_, i) => (
                            <HungarianCard key={i} />
                        ))}
                    </div>
                );
            })}

            <br />
            <HungarianCard cardData={gameSession.playedCards?.[gameSession.playedCards.length - 1]} />

            {/* Deck size display */}
            <div>Deck size: {gameSession?.deckSize ?? 0}</div>
            <div>PlayedCards size: {gameSession?.playedCardsSize ?? 0}</div>
            {/* Action buttons */}
            {turn?.yourTurn && (
                <>
                    {<button onClick={drawCard}>Draw Card</button>}

                    {selectedCards.length !== 0 && canPlayAnyCard() && (
                        <button onClick={playCards}>Play Cards</button>
                    )}

                    {mustSkipTurn() && (
                        <button onClick={skipTurn} style={{ backgroundColor: 'orange' }}>
                            Skip Turn (Cannot Play or Draw)
                        </button>
                    )}
                </>
            )}

            {turn?.yourTurn && <div>Te vagy</div>}
            {turn?.currentSeat && <div>Current seat: {turn.currentSeat}</div>}
            {gameSession?.gameData?.drawStack?.[playerSelf.playerId] && <button onClick={drawStackOfCards}>have to draw : {gameSession?.gameData?.drawStack[playerSelf.playerId]}</button>}
            <button onClick={() => leaveGame()}>Leave</button>
        </>
    );
}

export default Game;