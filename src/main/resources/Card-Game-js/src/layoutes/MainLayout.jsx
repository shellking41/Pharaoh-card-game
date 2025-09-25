import React, {useContext, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {Outlet, useNavigate, useParams} from 'react-router-dom';
import style from './styles/MainLayoutStyle.module.css';
import {Box, CircularProgress, Container, Tab, Tabs} from "@mui/material";
import userContext, {UserContext} from "../Contexts/UserContext.jsx";
import {NotificationContext} from "../Contexts/NotificationContext.jsx";
import Notification from "../components/Notification.jsx";
import {StompContext} from "../Contexts/StompContext.jsx";
import {GameSessionContext} from "../Contexts/GameSessionContext.jsx";

function MainLayout() {
    const [kikapcs, setKikapcs] = useState(true)

    const {userCurrentStatus} = useContext(UserContext);
    const {connected, clientRef} = useContext(StompContext)
    const {gameSession}=useContext(GameSessionContext);
    const {gameSessionId} = useParams();
    const {notifications, removeNotification} = useContext(NotificationContext);

    const navRef = useRef(0);

    const navigate = useNavigate();

    useEffect(() => {
        console.log(userCurrentStatus)

    }, [userCurrentStatus]);

    const handleChange = (event, newValue) => {
        navRef.current = newValue
        switch (newValue) {
            case 0:
                // ha newValue === 0
                navigate("/");
                break;

            case 1:
                // ha newValue === 1
                navigate("/about");
                break;

            case 2:
                // ha newValue === 2
                navigate("/login");
                break;

            default:
                // ha egyik case sem található
                navigate("/not-found");
                break;
        }
    };

    useLayoutEffect(() => {


        //ha nincs gamesession akkor iranyitja at
        if (!gameSession.gameSessionId) {
            //ha van room akkor oda
            const roomId=userCurrentStatus.currentRoom?.roomId?userCurrentStatus.currentRoom.roomId:userCurrentStatus.currentRoomId;
            if(roomId){
                navigate("/room/"+roomId);
                console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!")

                return
            }
            navigate("/");
        }


    }, [gameSession,userCurrentStatus]);


    useEffect(() => {
        if(gameSession.gameSessionId){
            navigate(`/game/${gameSession.gameSessionId}`)
        }
    }, [gameSession.gameSessionId]);

    useEffect(() => {
        console.log(userCurrentStatus)

    }, [userCurrentStatus]);
    return (
        <>
            <header>
                <Box>
                    <Tabs
                        value={navRef.current}
                        onChange={handleChange}
                        centered
                    >
                        <Tab label="Home"/>
                        <Tab label="Game"/>
                        <Tab label={userCurrentStatus.authenticated ? "Profile" : "Login"}/>
                    </Tabs>
                </Box>
            </header>

            <div>
                {notifications && notifications.map((notification) => (
                    <Notification {...notification} key={notification.id}/>
                ))}
            </div>
            <main className={style.content}>
                <Container
                >
                    <Box>
                        {kikapcs && (
                            <Box>
                                <Outlet/>
                            </Box>
                        )}
                    </Box>
                </Container>
            </main>

            <button
                className={style.toggleButton}
                onClick={() => setKikapcs(prevState => !prevState)}
            >
                {kikapcs ? 'Tartalom elrejtése' : 'Tartalom megjelenítése'}
            </button>
        </>
    );
}

export default MainLayout;