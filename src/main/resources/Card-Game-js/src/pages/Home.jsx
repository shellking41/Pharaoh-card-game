import React, {useContext, useEffect, useState} from 'react';
import {Box, Button, CircularProgress, IconButton, TableCell, TableRow, Typography} from "@mui/material";
import {RoomsDataContext} from "../Contexts/RoomsDataContext.jsx";
import {UserContext} from "../Contexts/UserContext.jsx";

import {RoomCard} from "../components/RoomCard.jsx";
import CreateRoomModal from "../components/CreateRoomModal.jsx";
import useSubscribeToTopicByPage from "../hooks/useSubscribeToTopicByPage.js";
import {StompContext} from "../Contexts/StompContext.jsx";
import ProgressBar from "../service/ProgressBar.jsx";
import useAllRoom from "../components/Home/Hooks/useAllRoom.js";


function Home() {
    const {rooms} = useContext(RoomsDataContext);
    const {userCurrentStatus} = useContext(UserContext);
    const {connected, clientRef} = useContext(StompContext);
    const {getAllRoom, loading} = useAllRoom();
    const [openModal, setOpenModal] = useState(false)
    // Ha nincs bejelentkezve, semmit sem mutatunk


    useSubscribeToTopicByPage({page: "home"});

    useEffect(() => {
        console.log(rooms)

    }, [rooms]);

    useEffect(() => {
        console.log(userCurrentStatus);

    }, [userCurrentStatus])



    if (!userCurrentStatus.authenticated) {
        return null;
    }


    if (!clientRef.current && !connected) {
        return <ProgressBar/>;
    }



    // Ekkor biztos, hogy be van jelentkezve, és van legalább 1 room
    return (
        <>
            <h1>HIBAK: HA A JATEK ELINDULT AKKOR IS JELôZI A ROOMOT HOGY AVAILABLE,</h1>
            <h1>KELL FRONTENDRE IS VALAMI VERZIONINGET TENNIA GAMESTATE RE MERT HA VALAKI MÁS MÉG MODOSITJA MIELOTT VISSZA KAPNANK A MI EREDMENYUNKET AKKOR FELUL MIRHASSA A REGGEBBI VERZIORA</h1>
            <button onClick={()=> getAllRoom()  } disabled={loading}>Refresh</button>
            {/*todo ezt a részt valószínűleg egy komponensbe kell tenni mert akkor jobban el lesz különítve a logika ha ide ebbe a boxba több mindent akarok tenni */}
            <Box>

                {loading?<CircularProgress/>:rooms.map(room => (
                    <RoomCard key={room.roomId} {...room} />
                ))}
            </Box>
            {/*todo ezt a részt valószínűleg egy komponensbe kell tenni mert akkor jobban el lesz különítve a logika ha ide ebbe a boxba több mindent akarok tenni */}
            <Box>
                <button onClick={() => setOpenModal(true)}>create room</button>
                <CreateRoomModal openModal={openModal} setOpenModal={setOpenModal}/>
            </Box>
        </>
    );
};


export default Home;
