import React, {useContext, useEffect, useLayoutEffect, useState} from 'react';
import {GameSessionContext} from "../Contexts/GameSessionContext.jsx";
import {useNavigate, useParams} from "react-router-dom";
import useWebsocket from "../hooks/useWebsocket.js";
import useSubscribeToTopicByPage from "../hooks/useSubscribeToTopicByPage.js";
import HungarianCard from '../components/Game/HungarianCard.jsx';
import {useApiCallHook} from "../hooks/useApiCallHook.js";
import {TokenContext} from "../Contexts/TokenContext.jsx";
import {UserContext} from "../Contexts/UserContext.jsx";



function Game() {
    const {gameSession,playerSelf,turn,setTurn}=useContext(GameSessionContext);
    const {gameSessionId} = useParams();
    const {sendMessage}=useWebsocket();
    const {userCurrentStatus}=useContext(UserContext);
    const {token} = useContext(TokenContext);
    const {get,post} = useApiCallHook();
    const navigate = useNavigate();

    useSubscribeToTopicByPage({page: "game"})
    const [selectedCards, setSelectedCards] = useState([]);

    useEffect(() => {

        const getCurrentTurn=async ()=>{

            console.log("baj")
            const turn= await get("http://localhost:8080/game/current-turn",token);
            setTurn(turn);

        }
        getCurrentTurn();
    }, []);




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
    const leaveGame=()=>{
        console.log("asd")

        post("http://localhost:8080/game/leave",{gameSessionId:gameSession.gameSessionId},token)
    }

    return (
        <>
            {gameSession.players.map((p)=>(
                <div>{p?.playerName}</div>
            ))}
            {gameSession.playerHand?.ownCards?.map((c,index)=>(
              <HungarianCard key={index}  cardData={c} onClick={() => handleCardClick(c)}  isSelected={selectedCards.includes(c)}/>
            ))}
            {gameSession.players.map((p) => {
                if (p.playerId === playerSelf.playerId) return null;

                // lekérdezzük a darabszámot — ha nincs, 0 a default
                const count = gameSession.playerHand?.otherPlayersCardCount[String(p.playerId)] ?? 0;

                return (
                  <div key={p.playerId}>
                      <div>{p.playerName}</div>
                      {count}
                      {Array.from({ length: count }).map((_, i)=> (

                        <HungarianCard />
                      ))}
                  </div>
                );
            })}
                <br/>
                <HungarianCard cardData={gameSession.playedCards[gameSession.playedCards.length-1]}></HungarianCard>
            <button onClick={drawCard}>draw</button>
            {selectedCards.length!==0 && <button onClick={playCards}>play cards</button>}
            {turn?.yourTurn && <div>Te vagy</div>}
            {turn?.currentSeat && <div>current seat :{ turn.currentSeat}</div>}
            <button onClick={()=>leaveGame()}>leave</button>
        </>
    )
}

export default Game
