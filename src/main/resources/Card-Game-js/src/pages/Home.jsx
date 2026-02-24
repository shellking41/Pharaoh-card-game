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
import Pagination from '../components/Pagination.jsx';
import styles from './styles/HomeStyle.module.css';
import { useNavigate } from "react-router-dom";
import { TokenContext } from "../Contexts/TokenContext.jsx";
import { useApiCallHook } from "../hooks/useApiCallHook.js";

function Home() {
    const { rooms, totalPages, currentPage } = useContext(RoomsDataContext);
    const { userCurrentStatus } = useContext(UserContext);
    const { connected, clientRef } = useContext(StompContext);
    const { getAllRoom, loading, goToPage } = useAllRoom();
    const { token } = useContext(TokenContext);
    const { get } = useApiCallHook();

    const [openModal, setOpenModal] = useState(false);

    useSubscribeToTopicByPage({ page: 'home' });
    const navigate = useNavigate();

    const handlePageChange = (newPage) => {
        goToPage(newPage);
        // Scroll to top when changing page
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleRefresh = () => {
        getAllRoom(currentPage);
    };

    if (!userCurrentStatus.authenticated) {
        return null;
    }

    if (!clientRef.current && !connected) {
        return <ProgressBar />;
    }

    return (
        <>
            <div className={styles.container}>
                <SomethingWentWrong />

                <div className={styles.containerTop}>
                    <div className={styles.navigationButtonContainer}>
                        <button className={styles.tutorialButton} onClick={() => navigate("/about")}>
                            Tutorial
                        </button>
                        <button className={styles.statisticsButton} onClick={() => navigate("/statistics")}>
                            Statistics
                        </button>
                    </div>

                    <div className={styles.header}>
                        <h1 className={styles.title}>Game Rooms</h1>
                        <p className={styles.subtitle}>Join a room or create your own</p>
                        <button
                            className={styles.refreshButton}
                            onClick={handleRefresh}
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
                        <CreateRoomModal openModal={openModal} setOpenModal={setOpenModal} />
                    </div>
                </div>
            </div>

            <div className={styles.containerBottom}>
                <div className={styles.roomsSection}>
                    {loading ? (
                        <div className={styles.loadingContainer}>
                            <CircularProgress style={{ color: 'white' }} size={60} />
                        </div>
                    ) : rooms.length > 0 ? (
                        <>
                            <div className={styles.roomsGrid}>
                                {rooms.map(room => (
                                    <RoomCard key={room.roomId} {...room} />
                                ))}
                            </div>

                            {/* Pagination komponens */}
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                            />

                            {/* Oldalszám információ */}
                            <div className={styles.pageInfo}>
                                Page {currentPage + 1} of {totalPages}
                            </div>
                        </>
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