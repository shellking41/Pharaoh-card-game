import React, { useContext, useEffect, useState } from 'react';
import {GameSessionContext} from "../Contexts/GameSessionContext.jsx";
import {useNavigate, useParams} from "react-router-dom";
import useWebsocket from "../hooks/useWebsocket.js";
import useSubscribeToTopicByPage from "../hooks/useSubscribeToTopicByPage.js";
import HungarianCard from '../components/Game/HungarianCard.jsx';

function Game() {
    const {gameSession,playerSelf}=useContext(GameSessionContext);
    const {gameSessionId} = useParams();
    const {sendMessage}=useWebsocket();
    const navigate = useNavigate();

    useSubscribeToTopicByPage({page: "game"})
    const [selectedCards, setSelectedCards] = useState([]);
    useEffect(() => {
        console.log(gameSession);

    }, [gameSession]);
    useEffect(() => {
        console.log(gameSession.gameSessionId, gameSessionId)

        if (!gameSession.gameSessionId && gameSession.gameSessionId != gameSessionId) {
            navigate("/");
        }


    }, [gameSession.gameSessionId]);
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

    return (
        <>
            {gameSession.players.map((p)=>(
                <div>{p?.playerName}</div>
            ))}
            {gameSession.playerHand.ownCards.map((c,index)=>(
              <HungarianCard key={index}  cardData={c} onClick={() => handleCardClick(c)}  isSelected={selectedCards.includes(c)}/>
            ))}
            {gameSession.players.map((p) => {
                if (p.playerId === playerSelf.playerId) return null;

                // lekérdezzük a darabszámot — ha nincs, 0 a default
                const count = gameSession.playerHand?.otherPlayersCardCount?.[p.playerId] ?? 0;

                return (
                  <div key={p.playerId}>
                      <div>{p.playerName}</div>
                      {Array.from({ length: count }).map((_, i)=> (
                        <HungarianCard />
                      ))}
                  </div>
                );
            })}
                <HungarianCard cardData={gameSession.playedCards[gameSession.playedCards.length-1]}></HungarianCard>
            <button onClick={drawCard}>draw</button>
        </>
    )
}

export default Game
