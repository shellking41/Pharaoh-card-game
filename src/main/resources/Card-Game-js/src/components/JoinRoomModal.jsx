import React, {useContext, useState} from 'react'
import {Box, Modal} from "@mui/material";
import useWebsocket from "../hooks/useWebsocket.js";
import {UserContext} from "../Contexts/UserContext.jsx";
import {NotificationContext} from "../Contexts/NotificationContext.jsx";

function JoinRoomModal({setOpenModal, roomAttributes, openModal}) {
    const {subscribe, sendMessage} = useWebsocket();

    const {userCurrentStatus, setUserCurrentStatus} = useContext(UserContext);
    const {showNotification} = useContext(NotificationContext);

    const [roomPassword, setRoomPassword] = useState("");
    const [message, setMessage] = useState("");

    const joinRoom = async (roomId) => {


        try {
            // await subscribe("/user/queue/join-response", (message) => {
            //     console.log('Chat message:', message);
            //
            //     if (message.confirmed === true) {
            //         showNotification(message.message, "success");
            //         setUserInfo((prev) => ({...prev, currentRoom: message.currentRoom}))
            //
            //         return
            //     } else if (message.confirmed === false) {
            //         showNotification(message.message, "error");
            //     }
            //
            //     showNotification(message.message, message.success ? "success" : "error");
            //
            // })

            sendMessage("/app/join-room-request", {
                roomId: roomId,
                roomPassword,
                username: userCurrentStatus.userInfo.username,
                message,
                userId: userCurrentStatus.userInfo.userId
            })
        } catch (e) {
            console.error("Something went wrong", e)
        }


    }
    return (
        <Modal
            open={openModal}
            aria-labelledby="join-modal-title"
            aria-describedby="join-modal-description"
        >
            <Box>
                <button onClick={() => setOpenModal(false)}>close</button>
                <span>capacity: {roomAttributes.capacity}</span>
                <h1>To join {roomAttributes.roomName}, you have to type the password</h1>
                <label htmlFor={"room-password"}>Room password</label>
                <input type={"password"} name={"room-password"} onChange={(e) => setRoomPassword(e.target.value)}/>
                <label htmlFor={"message"}>Message to the Admin</label>
                <input type={"text"} name={"message"} onChange={(e) => setMessage(e.target.value)}/>
                <button onClick={() => joinRoom(roomAttributes.roomId)}>join</button>
            </Box>
        </Modal>
    )
}

export default JoinRoomModal
