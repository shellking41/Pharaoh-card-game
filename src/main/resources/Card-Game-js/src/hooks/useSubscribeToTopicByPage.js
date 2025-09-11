import React, {useContext, useEffect} from 'react'
import UseWebsocket from "./useWebsocket.js";
import {UserContext} from "../Contexts/UserContext.jsx";
import {NotificationContext} from "../Contexts/NotificationContext.jsx";
import useWebsocket from "./useWebsocket.js";
import {RoomsDataContext} from "../Contexts/RoomsDataContext.jsx";
import {GameSessionContext} from "../Contexts/GameSessionContext.jsx";


const getPageSubscriptions = (contexts) => {

    const {
        userCurrentStatus, setUserCurrentStatus,
        gameSession,setGameSession,
        playerSelf,setPlayerSelf,
        setJoinRequests,
        showNotification,
        currentRoomId
    } = contexts;

    return {
        "home": [{
            destination: "/user/queue/room-creation-response",
            callback: (message) => {

                if (message.status.success) {
                    setUserCurrentStatus((prev) => ({
                        ...prev,
                        currentRoom: message.currentRoom,
                        managedRoom: message.managedRoom
                    }))

                }
            }

        }, {
            destination: "/user/queue/join-response",
            callback: (message) => {


                if (message.confirmed === true) {
                    showNotification(message.message, "success");
                    setUserCurrentStatus((prev) => ({...prev, currentRoom: message.currentRoom}))

                    return
                } else if (message.confirmed === false) {
                    showNotification(message.message, "error");
                    return
                }

                showNotification(message.message, message.success ? "success" : "error");

            }
        }],

        "room": [{
            condition: (userCurrentStatus.managedRoom?.roomId == currentRoomId),
            destination: "/user/queue/join-requests",
            callback: (message) => {


                setJoinRequests((prev) => [...prev, message]);
            },

        }, {
            destination: `/topic/room/${currentRoomId}/end`,
            callback: (message) => {
                showNotification(message, "warning");
            }
        }, {
            destination: "/user/queue/user-status",
            callback: (message) => {
                setUserCurrentStatus(message);
            }
        }, {
            destination: `/topic/room/${currentRoomId}/participant-update`,
            callback: (message) => {
                const oldParticipants = userCurrentStatus.currentRoom?.participants || [];
                const newParticipants = message?.participants || [];

                const removedParticipants = oldParticipants.filter(oldParticipant =>
                    !newParticipants.some(newParticipant =>
                        newParticipant.userId === oldParticipant.userId // vagy bármilyen egyedi azonosító
                    )
                );
                setUserCurrentStatus((prev)=>({...prev, currentRoom:message}))
                if(removedParticipants.username) showNotification(`${removedParticipants.username} has left`, "warning");
            }
        },{
            destination: `/user/queue/game/start`,
            callback:(message)=>{


                const self= message.players.find((m)=>m.userId===userCurrentStatus.userInfo.userId)

                if(self?.playerId){
                    setPlayerSelf(self)
                }
                setGameSession(message);

            }
        }],
        "game":[{
                destination: "/user/queue/game/draw",
                callback:(message)=>{
                    console.log(message);

                }
            }],

        "about": [{
            destination: "/user/queue/test",
            callback: (ms) => {

            }
        }],


    };
};


function UseSubscribeToTopicByPage({page, currentRoomId}) {



    const {subscribe} = useWebsocket();
    const {userCurrentStatus, setUserCurrentStatus} = useContext(UserContext);
    const {gameSession,setGameSession,playerSelf,setPlayerSelf}=useContext(GameSessionContext);
    const {setRooms, joinRequests, setJoinRequests} = useContext(RoomsDataContext);
    const {showNotification} = useContext(NotificationContext);


    useEffect(() => {
        const newUnsubscribeFunctions = [];

        const context = {
            userCurrentStatus,
            setUserCurrentStatus,
            setJoinRequests,
            showNotification,
            currentRoomId,
            gameSession,
            setGameSession,
            playerSelf,
            setPlayerSelf
        }
        const pageSubscriptions = getPageSubscriptions(context);
        const subscriptionsForPage = pageSubscriptions[page];

        subscriptionsForPage.forEach((sub) => {


            if (sub.condition && typeof sub.condition === 'function' && !sub.condition()) {
                console.log(`[PAGE-SUBSCRIPTION] Condition not met for topic: ${sub.destination}`);
                return;
            }
            const subscription = subscribe(sub.destination, sub.callback);
            newUnsubscribeFunctions.push(subscription);

        })
        return () => {
            console.log(`[PAGE-SUBSCRIPTION] Cleaning up ${page} subscriptions`);
            newUnsubscribeFunctions.forEach(unsubscribe => {
                try {
                    unsubscribe();
                } catch (error) {
                    console.error('[PAGE-SUBSCRIPTION] Error during cleanup:', error);
                }
            });
        };
    }, [page,
        currentRoomId,
        userCurrentStatus.authenticated, subscribe]);
}

export default UseSubscribeToTopicByPage
