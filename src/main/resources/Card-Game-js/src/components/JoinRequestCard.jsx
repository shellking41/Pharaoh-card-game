import React, { useContext } from 'react';
import useWebsocket from '../hooks/useWebsocket.js';
import { RoomsDataContext } from '../Contexts/RoomsDataContext.jsx';
import styles from './styles/JoinRequestCardStyle.module.css';

function JoinRequestCard({ userId, roomId, username, message }) {
  const { sendMessage } = useWebsocket();
  const { joinRequests, setJoinRequests } = useContext(RoomsDataContext);

  const responseToJoinRequest = (response) => {
    sendMessage('/app/response-to-join-request', {
      roomId,
      connectingUserId: userId,
      confirm: response,
    });
    setJoinRequests((prev) => prev.filter((r) => r.username !== username));
  };

  // Első betű az avatarhoz
  const avatarLetter = username ? username.charAt(0).toUpperCase() : '?';

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.avatar}>
          {avatarLetter}
        </div>
        <h1 className={styles.username}>{username}</h1>
      </div>

      {message && (
        <div className={styles.messageSection}>
          <span className={styles.messageLabel}>Message:</span>
          <div className={styles.message}>
            "{message}"
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <button
          className={`${styles.button} ${styles.confirmButton}`}
          onClick={() => responseToJoinRequest(true)}
        >
          ✓ Accept
        </button>
        <button
          className={`${styles.button} ${styles.declineButton}`}
          onClick={() => responseToJoinRequest(false)}
        >
          ✕ Decline
        </button>
      </div>
    </div>
  );
}

export default JoinRequestCard;