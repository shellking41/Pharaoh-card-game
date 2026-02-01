import { useState } from 'react';
import JoinRoomModal from './JoinRoomModal.jsx';
import styles from './styles/RoomCardStyle.module.css';
import { FaDoorOpen, FaUsers, FaLock, FaLockOpen } from 'react-icons/fa';

export const RoomCard = ({ roomId, roomName, playerCount, gameStatus, hasActiveGame, isPublic }) => {
  const [openModal, setOpenModal] = useState(false);
  const isAvailable = playerCount < 4;

  return (
    <>
      <div
        className={`${styles.card} ${isPublic ? styles.publicRoom : styles.privateRoom}`}>
        <div className={styles.header}>
          <h2 className={styles.roomName}>
            <FaDoorOpen className={styles.roomIcon}/>
            {roomName}
            {isPublic ? (
              <FaLockOpen className={styles.lockIcon} title="Public Room"/>
            ) : (
              <FaLock className={styles.lockIcon} title="Private Room"/>
            )}
          </h2>
        </div>

        <div className={styles.infoSection}>
          <div className={styles.infoItem}>
            <FaUsers/>
            <span className={styles.capacity}>
              {playerCount || 0}/4 Players
            </span>
          </div>

          <span
            className={`${styles.statusBadge} ${hasActiveGame ? styles.occupied : isAvailable ? styles.available : styles.occupied}`}>
            {hasActiveGame ? 'In Progress' : isAvailable ? '● Available' : '● Full'}
          </span>

          {isPublic && (
            <span className={styles.publicBadge}>
              <FaLockOpen/> Public
            </span>
          )}
        </div>

        <button
          className={styles.joinButton}
          onClick={() => setOpenModal(true)}
          disabled={!isAvailable || hasActiveGame}
        >
          {hasActiveGame ? 'Game Started' : isAvailable ? 'Join Room' : 'Room Full'}
        </button>
      </div>

      <JoinRoomModal
        openModal={openModal}
        setOpenModal={setOpenModal}
        roomAttributes={{
          roomId,
          roomName,
          capacity: `${playerCount || 0}/4`,
          isPublic,
        }}
      />
    </>
  );
};