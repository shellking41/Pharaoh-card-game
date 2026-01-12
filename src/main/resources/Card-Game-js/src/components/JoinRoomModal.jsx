import React, { useContext, useState } from 'react';
import { Modal } from '@mui/material';
import useWebsocket from '../hooks/useWebsocket.js';
import { UserContext } from '../Contexts/UserContext.jsx';
import { NotificationContext } from '../Contexts/NotificationContext.jsx';
import styles from './styles/JoinRoomModalStyle.module.css';

function JoinRoomModal({ setOpenModal, roomAttributes, openModal }) {
  const { subscribe, sendMessage } = useWebsocket();

  const { userCurrentStatus, setUserCurrentStatus } = useContext(UserContext);
  const { showNotification } = useContext(NotificationContext);

  const [roomPassword, setRoomPassword] = useState('');
  const [message, setMessage] = useState('');

  const joinRoom = async (roomId) => {
    try {
      sendMessage('/app/join-room-request', {
        roomId: roomId,
        roomPassword,
        username: userCurrentStatus.userInfo.username,
        message,
        userId: userCurrentStatus.userInfo.userId,
      });

      setOpenModal(false);
      setRoomPassword('');
      setMessage('');
    } catch (e) {
      console.error('Something went wrong', e);
    }
  };

  return (
    <Modal
      open={openModal}
      onClose={() => setOpenModal(false)}
      aria-labelledby="join-modal-title"
      aria-describedby="join-modal-description"
    >
      <div className={styles.modalBox}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
                        <span className={styles.capacity}>
                            Capacity: {roomAttributes.capacity}
                        </span>
            <h1 className={styles.title}>
              Join <span
              className={styles.roomName}>{roomAttributes.roomName}</span>
            </h1>
          </div>
          <button
            className={styles.closeButton}
            onClick={() => setOpenModal(false)}
          >
            ×
          </button>
        </div>

        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label
              className={`${styles.inputWrapper} `}>
              <label htmlFor="room-password" className={styles.inputLabel}>
                Room Password
              </label>
              <input
                type="password"
                id="room-password"
                name="room-password"
                className={styles.input}
                placeholder=""
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
              />

            </label>
            <span className={styles.helperText}>
                            Required to join this room
                        </span>
          </div>

          <div className={styles.formGroup}>
            <label
              className={`${styles.inputWrapper} `}>
              <label htmlFor="message" className={styles.inputLabel}>
                Message to Admin (Optional)
              </label>
              <input
                id="message"
                name="message"
                className={styles.input}
                placeholder=""
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />

            </label>
            <span className={styles.helperText}>
                            Introduce yourself or explain why you want to join
                        </span>
          </div>

          <button
            className={styles.joinButton}
            onClick={() => joinRoom(roomAttributes.roomId)}
          >
            Request to Join
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default JoinRoomModal;