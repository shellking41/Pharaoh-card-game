import React, {useContext, useEffect, useState} from 'react'
import {useNavigate, useParams} from "react-router-dom";
import {UserContext} from "../Contexts/UserContext.jsx";
import useWebsocket from "../hooks/useWebsocket.js";
import JoinRequestCard from "../components/JoinRequestCard.jsx";
import {RoomsDataContext} from "../Contexts/RoomsDataContext.jsx";
import useSubscribeToTopicByPage from "../hooks/useSubscribeToTopicByPage.js";
import {useApiCallHook} from "../hooks/useApiCallHook.js";
import {TokenContext} from "../Contexts/TokenContext.jsx";
import {NotificationContext} from "../Contexts/NotificationContext.jsx";
import BotView from "../components/Room/BotView.jsx";
import {GameSessionContext} from "../Contexts/GameSessionContext.jsx";

function RoomPage() {
    const {roomId} = useParams();
    const navigate = useNavigate();

    const {userCurrentStatus, setUserCurrentStatus} = useContext(UserContext);
    const {gameSession}=useContext(GameSessionContext);
    const {token} = useContext(TokenContext);
    const {post} = useApiCallHook();
    const {joinRequests, setJoinRequests} = useContext(RoomsDataContext);
    const {showNotification} = useContext(NotificationContext);

    useSubscribeToTopicByPage({page: "room", currentRoomId: roomId})

    const {subscribe} = useWebsocket();



    useEffect(() => {
        console.log(userCurrentStatus.currentRoom?.roomId, roomId)

        if (!userCurrentStatus.currentRoom?.roomId && userCurrentStatus.currentRoom?.roomId != roomId) {
            navigate("/");
        }


    }, [userCurrentStatus.currentRoom]);


    useEffect(() => {
        console.log(joinRequests)

    }, [joinRequests]);

    const leaveRoom = async () => {
        try {
            console.log(roomId)

            const userData = await post("http://localhost:8080/room/leave", {roomId}, token)
            setUserCurrentStatus(userData);
        } catch (e) {
            console.error(e)
        }

    }
    const addBot = async () => {
        try {
            const existingBots = userCurrentStatus.currentRoom?.bots || [];

            // Computer-X nevű botok számainak kiszedése
            const usedNumbers = existingBots
                .map((b) => {
                    const match = b.name.match(/^Computer-(\d+)$/);
                    return match ? parseInt(match[1], 10) : null;
                })
                .filter((num) => num !== null);

            // 1-4 között a legkisebb elérhető szám keresése
            let nextNumber = null;
            for (let i = 1; i <= 4; i++) {
                if (!usedNumbers.includes(i)) {
                    nextNumber = i;
                    break;
                }
            }

            const response = await post(
                "http://localhost:8080/bot/add",
                {
                    name: `Computer-${nextNumber}`,
                    difficulty: "EASY",
                    roomId: parseInt(roomId),
                },
                token
            );

            if (response?.success) {
                showNotification(response.message, "success");
            }
        } catch (e) {
            console.error(e);
        }
    };
    const startGame=async ()=>{
        try {
            const response = await post("http://localhost:8080/game/start", {roomId}, token)
        }catch (e) {
            console.error(e);
        }
    }

    return (
        <>
            <div>Room: {roomId}</div>
            {joinRequests
                .filter((req, index, self) =>
                    index === self.findIndex(r => r.username === req.username)
                )
                .map((request, index) => (
                    <JoinRequestCard key={index} {...request} />
                ))}
            <div>
                {userCurrentStatus.currentRoom?.participants.map((p,index)=>(
                    <div>{p.username}</div>
                ))}
            </div>
            {/*ezt a bot hozzaados editelos reszt egy kulon pomponenstba kellene rakni a edit,remove,addbot functionokkal egyutt*/}
            {/*TODO: EZT A COMPONENST UGY IS MEGLEHETNE CSINÁLNI HOGY PROPKÉNT MEGADJUK A LEHETSÉGES NEHÉZSÉGI FOKOZATOKAT*/}
            <div>
                {userCurrentStatus.currentRoom?.bots.map((b,index)=>

                    (
                        <BotView bot={b} roomId={roomId} difficulties={["EASY","MEDIUM","HARD"]}/>

                ))}
                <div>
                    <label>Add bot</label>
                    <button onClick={addBot}>+</button>
                </div>
            </div>
            {(userCurrentStatus.managedRoom?.roomId == roomId)&&<button onClick={()=> startGame()}>start game</button>}
            <button onClick={() => leaveRoom()}>leave Room</button>
        </>
    )

}

export default RoomPage
