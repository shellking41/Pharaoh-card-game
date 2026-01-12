import React, { useContext, useState } from 'react';
import { Modal } from '@mui/material';
import { UserContext } from '../Contexts/UserContext.jsx';
import useWebsocket from '../hooks/useWebsocket.js';
import { RoomsDataContext } from '../Contexts/RoomsDataContext.jsx';
import { useNavigate } from 'react-router-dom';
import styles from './styles/CreateRoomModalStyle.module.css';

function CreateRoomModal({ setOpenModal, openModal }) {
  const navigate = useNavigate();

  const { userCurrentStatus, setUserCurrentStatus } = useContext(UserContext);
  const { rooms } = useContext(RoomsDataContext);

  const { subscribe, sendMessage } = useWebsocket();

  const [roomName, setRoomName] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [isError, setIsError] = useState(false);

  const createRoom = () => {
    if (!roomName.trim()) {
      setIsError(true);
      return;
    }

    sendMessage('/app/create', {
      username: userCurrentStatus.username,
      roomName,
      roomPassword,
    });

    setOpenModal(false);
    setRoomName('');
    setRoomPassword('');
  };

  return (
    <Modal
      open={openModal}
      onClose={() => setOpenModal(false)}
      aria-labelledby="create-modal-title"
      aria-describedby="create-modal-description"
    >
      <div className={styles.modalBox}>
        <div className={styles.header}>
          <h1 className={styles.title}>Create New Room</h1>
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
              className={`${styles.inputWrapper} ${
                isError
                  ? styles.inputError
                  : ''
              }`}>
              <label htmlFor="room-name" className={`${styles.inputLabel} `}>
                Room Name
              </label>
              <input
                type="text"
                id="room-name"
                placeholder=""
                name="room-name"
                className={styles.input}
                value={roomName}
                onChange={(e) => {
                  setRoomName(e.target.value);
                  setIsError(false);
                }}
              />
            </label>

            <span className={styles.helperText}>
                            Choose a unique name for your room
                        </span>
          </div>

          <div className={styles.formGroup}>
            <label
              className={`${styles.inputWrapper} `}>
              <label htmlFor="room-password" className={styles.inputLabel}>
                Room Password (Optional)
              </label>
              <input
                type="password"
                id="room-password"
                name="room-password"
                placeholder=""
                className={styles.input}
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
              />

            </label>
            <span className={styles.helperText}>
                            Leave empty for public room
                        </span>
          </div>

          <button
            className={styles.createButton}
            onClick={createRoom}
          >
            Create Room
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default CreateRoomModal;