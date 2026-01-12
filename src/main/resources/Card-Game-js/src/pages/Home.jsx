import React, { useContext, useEffect, useState } from 'react';
import { CircularProgress } from '@mui/material';
import { RoomsDataContext } from '../Contexts/RoomsDataContext.jsx';
import { UserContext } from '../Contexts/UserContext.jsx';
import { RoomCard } from '../components/RoomCard.jsx';
import CreateRoomModal from '../components/CreateRoomModal.jsx';
import useSubscribeToTopicByPage from '../hooks/useSubscribeToTopicByPage.js';
import { StompContext } from '../Contexts/StompContext.jsx';
import ProgressBar from '../service/ProgressBar.jsx';
import useAllRoom from '../components/Home/Hooks/useAllRoom.js';
import SomethingWentWrong from '../service/somethingWentWrong.jsx';
import styles from './styles/HomeStyle.module.css';
import {useNavigate} from "react-router-dom";

function Home() {
  const { rooms } = useContext(RoomsDataContext);
  const { userCurrentStatus } = useContext(UserContext);
  const { connected, clientRef } = useContext(StompContext);
  const { getAllRoom, loading } = useAllRoom();
  const [openModal, setOpenModal] = useState(false);

  useSubscribeToTopicByPage({ page: 'home' });
 const navigate=useNavigate()
  useEffect(() => {
    console.log(rooms);
  }, [rooms]);

  useEffect(() => {
    console.log(userCurrentStatus);
  }, [userCurrentStatus]);

  if (!userCurrentStatus.authenticated) {
    return null;
  }

  if (!clientRef.current && !connected) {
    return <ProgressBar/>;
  }

  return (
    <>
      <div className={styles.container}>
        <SomethingWentWrong/>

        <div className={styles.containerTop}>
          <button className={styles.tutorialButton} onClick={()=>navigate("/about")}>Tutorial</button>
          <div className={styles.header}>
            <h1 className={styles.title}>Game Rooms</h1>
            <p className={styles.subtitle}>Join a room or create your own</p>
            <button
              className={styles.refreshButton}
              onClick={() => getAllRoom()}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh Rooms'}
            </button>
          </div>
          <div className={styles.createSection}>
            <button
              className={styles.createButton}
              onClick={() => setOpenModal(true)}
            >
              Create New Room
            </button>
            <CreateRoomModal openModal={openModal} setOpenModal={setOpenModal}/>
          </div>
        </div>


      </div>
      <div className={styles.containerBottom}>
        <div className={styles.roomsSection}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <CircularProgress style={{ color: 'white' }} size={60}/>
            </div>
          ) : rooms.length > 0 ? (
            <div className={styles.roomsGrid}>
              {rooms.map(room => (<>
                  <RoomCard key={room.roomId} {...room} />
             

                </>

              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <h3>No rooms available</h3>
              <p>Be the first to create a room!</p>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default Home;