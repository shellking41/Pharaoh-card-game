import React, {useContext, useEffect} from 'react'
import {GameSessionContext} from "../Contexts/GameSessionContext.jsx";
import {useNavigate, useParams} from "react-router-dom";
import useWebsocket from "../hooks/useWebsocket.js";
import useSubscribeToTopicByPage from "../hooks/useSubscribeToTopicByPage.js";

function Game() {
    const {gameSession,playerSelf}=useContext(GameSessionContext);
    const {gameSessionId} = useParams();
    const {sendMessage}=useWebsocket();
    const navigate = useNavigate();

    useSubscribeToTopicByPage({page: "game"})

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
    return (
        <>
            {gameSession.players.map((p)=>(
                <div>{p?.playerName}</div>
            ))}
            <button onClick={drawCard}>draw</button>
        </>
    )
}

export default Game
