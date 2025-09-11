import React, {useContext, useState} from 'react'
import {Box, Modal} from "@mui/material";
import {UserContext} from "../Contexts/UserContext.jsx";
import useWebsocket from "../hooks/useWebsocket.js";
import {RoomsDataContext} from "../Contexts/RoomsDataContext.jsx";
import {useNavigate} from "react-router-dom";

function CreateRoomModal({setOpenModal, openModal}) {
    const navigate = useNavigate();

    const {userCurrentStatus, setUserCurrentStatus} = useContext(UserContext);
    const {rooms} = useContext(RoomsDataContext)

    const {subscribe, sendMessage} = useWebsocket();

    const [roomName, setRoomName] = useState();
    const [roomPassword, setRoomPassword] = useState();


    const createRoom = () => {

        // subscribe("/user/queue/room-creation-response", (message) => {
        //     console.log(message);
        //     if (message.status.success) {
        //         setUserInfo((prev) => ({...prev, currentRoom: message.currentRoom, managedRoom: message.managedRoom}))
        //
        //     }
        // })
        sendMessage("/app/create", {username: userCurrentStatus.username, roomName, roomPassword})
        console.log(rooms)

    }


    return (
        <Modal
            open={openModal}
            aria-labelledby="join-modal-title"
            aria-describedby="join-modal-description"
        >
            <Box>
                <button onClick={() => setOpenModal(false)}>close</button>

                <h1>Room Creation</h1>
                <label htmlFor={"room-name"}>Room Name</label>
                <input type={"text"} name={"room-name"} onChange={(e) => setRoomName(e.target.value)}/>
                <label htmlFor={"room-password"}>Room password</label>
                <input type={"password"} name={"room-password"} onChange={(e) => setRoomPassword(e.target.value)}/>
                <button onClick={() => createRoom()}>Create</button>
            </Box>
        </Modal>
    )
}

export default CreateRoomModal
