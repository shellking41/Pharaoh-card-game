import React, {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import style from './styles/MainLayoutStyle.module.css';
import { Box, CircularProgress, Container, Tab, Tabs } from '@mui/material';
import userContext, { UserContext } from '../Contexts/UserContext.jsx';
import { NotificationContext } from '../Contexts/NotificationContext.jsx';
import Notification from '../components/Notification.jsx';
import { StompContext } from '../Contexts/StompContext.jsx';
import { GameSessionContext } from '../Contexts/GameSessionContext.jsx';
import useWebsocket from "../hooks/useWebsocket.js";

function MainLayout() {
  const [kikapcs, setKikapcs] = useState(true);

  const { userCurrentStatus } = useContext(UserContext);
  const { connected, clientRef } = useContext(StompContext);
  const { gameSession } = useContext(GameSessionContext);
  const { gameSessionId } = useParams();
  const { notifications, removeNotification } = useContext(NotificationContext);

  const navRef = useRef(0);

  const navigate = useNavigate();
  const {showRefreshPrompt, handleRefresh } = useWebsocket();



  const handleChange = (event, newValue) => {
    navRef.current = newValue;
    switch (newValue) {
      case 0:
        // ha newValue === 0
        navigate('/');
        break;

      case 1:
        // ha newValue === 1
        navigate('/about');
        break;

      case 2:
        // ha newValue === 2
        navigate('/login');
        break;

      default:
        // ha egyik case sem található
        navigate('/not-found');
        break;
    }
  };

  useLayoutEffect(() => {

    //ha nincs gamesession akkor iranyitja at
    if (!gameSession.gameSessionId) {
      //ha van room akkor oda
      const roomId = userCurrentStatus.currentRoom?.roomId ? userCurrentStatus.currentRoom.roomId : userCurrentStatus.currentRoomId;
      if (roomId) {
        navigate('/room/' + roomId);


        return;
      }
      navigate('/');
    }

  }, [gameSession, userCurrentStatus]);

  useEffect(() => {
    if (gameSession.gameSessionId) {
      navigate(`/game/${gameSession.gameSessionId}`);
    }
  }, [gameSession.gameSessionId]);

  useEffect(() => {
    console.log(userCurrentStatus);

  }, [userCurrentStatus]);
  return (
    <>
      <header>

      </header>
      {showRefreshPrompt && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#ff4444',
            color: 'white',
            padding: '15px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            zIndex: 9999
          }}>
            <p>⚠️ A kapcsolat megszakadt</p>
            <button
                onClick={handleRefresh}
                style={{
                  background: 'white',
                  color: '#ff4444',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  marginTop: '10px'
                }}
            >
              Oldal újratöltése
            </button>
          </div>
      )}
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
              <div className={style.mainContainer}>
                <Outlet/>
              </div>
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