import React, {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import style from './styles/MainLayoutStyle.module.css';
import additionalStyles from './styles/MainLayoutAdditionalStyle.module.css';
import { Box, Container } from '@mui/material';
import { UserContext } from '../Contexts/UserContext.jsx';
import { NotificationContext } from '../Contexts/NotificationContext.jsx';
import Notification from '../components/Notification.jsx';
import { StompContext } from '../Contexts/StompContext.jsx';
import { GameSessionContext } from '../Contexts/GameSessionContext.jsx';
import useWebsocket from '../hooks/useWebsocket.js';
import { useAuth } from '../hooks/useAuth.js';

function MainLayout() {
  const [kikapcs, setKikapcs] = useState(true);

  const { userCurrentStatus } = useContext(UserContext);
  const { connected, clientRef } = useContext(StompContext);
  const { gameSession } = useContext(GameSessionContext);
  const { gameSessionId } = useParams();
  const { notifications, removeNotification } = useContext(NotificationContext);

  const navRef = useRef(0);
  const { logout } = useAuth();

  const navigate = useNavigate();

  const handleChange = (event, newValue) => {
    navRef.current = newValue;
    switch (newValue) {
      case 0:
        navigate('/');
        break;
      case 1:
        navigate('/about');
        break;
      case 2:
        navigate('/login');
        break;
      default:
        navigate('/not-found');
        break;
    }
  };

  useLayoutEffect(() => {
    if (!gameSession.gameSessionId) {
      const roomId = userCurrentStatus.currentRoom?.roomId ?
        userCurrentStatus.currentRoom.roomId :
        userCurrentStatus.currentRoomId;

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
      <header className={additionalStyles.header}>
        <div className={additionalStyles.logoSection}>
          <div className={additionalStyles.logo}>Game Hub</div>
        </div>
        {userCurrentStatus?.userInfo?.userId && (<>
            <div className={additionalStyles.userName}>
              {userCurrentStatus?.userInfo?.username}
            </div>
            <button
              className={additionalStyles.logoutButton}
              onClick={logout}
            >
              Logout
            </button>
          </>
        )}
      </header>

      <div className={additionalStyles.notificationsContainer}>
        {notifications && notifications.map((notification) => (
          <Notification {...notification} key={notification.id}/>
        ))}
      </div>

      <main className={`${style.content} ${additionalStyles.content}`}>
        <Container>
          <Box>
            {kikapcs && (
              <div className={style.mainContainer}>
                <Outlet/>
              </div>
            )}
          </Box>
        </Container>
      </main>
    </>
  );
}

export default MainLayout;