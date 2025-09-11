import {useContext, useState} from "react";
import {UserContext} from "../Contexts/UserContext.jsx";
import JoinRoomModal from "./JoinRoomModal.jsx";


export const RoomCard = ({roomId, roomName, playerCount}) => {

    const [openModal, setOpenModal] = useState(false);


    return (
        <>
            <div>
                <h2>{roomName}</h2>
                <p>Capacity: {playerCount || 0}/4</p>
                <p>{playerCount<4 ? 'Available' : 'Occupied'}</p>
                <button onClick={() => {
                    setOpenModal(true)
                }}>join
                </button>
            </div>

            <JoinRoomModal openModal={openModal} setOpenModal={setOpenModal}
                           roomAttributes={{
                               roomId,
                               roomName,

                           }}/>
        </>
    )
};