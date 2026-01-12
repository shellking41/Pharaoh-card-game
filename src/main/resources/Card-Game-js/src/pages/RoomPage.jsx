import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserContext } from '../Contexts/UserContext.jsx';
import useWebsocket from '../hooks/useWebsocket.js';
import JoinRequestCard from '../components/JoinRequestCard.jsx';
import { RoomsDataContext } from '../Contexts/RoomsDataContext.jsx';
import useSubscribeToTopicByPage from '../hooks/useSubscribeToTopicByPage.js';
import { useApiCallHook } from '../hooks/useApiCallHook.js';
import { TokenContext } from '../Contexts/TokenContext.jsx';
import { NotificationContext } from '../Contexts/NotificationContext.jsx';
import BotView from '../components/Room/BotView.jsx';
import { GameSessionContext } from '../Contexts/GameSessionContext.jsx';
import SomethingWentWrong from '../service/somethingWentWrong.jsx';
import styles from './styles/RoomPage.module.css';

function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const { userCurrentStatus, setUserCurrentStatus } = useContext(UserContext);
  const { gameSession, setGameSession } = useContext(GameSessionContext);
  const { token } = useContext(TokenContext);
  const { post } = useApiCallHook();
  const { joinRequests, setJoinRequests } = useContext(RoomsDataContext);
  const { showNotification } = useContext(NotificationContext);

  useSubscribeToTopicByPage({ page: 'room', currentRoomId: roomId });

  const { subscribe } = useWebsocket();

  useEffect(() => {
    console.log(joinRequests);
  }, [joinRequests]);

  const leaveRoom = async () => {
    try {
      console.log(roomId);
      const userData = await post('http://localhost:8080/room/leave', { roomId }, token);
      setUserCurrentStatus(userData);
    } catch (e) {
      console.error(e);
    }
  };

  const addBot = async () => {
    try {
      const existingBots = userCurrentStatus.currentRoom?.bots || [];

      const usedNumbers = existingBots
        .map((b) => {
          const match = b.name.match(/^Computer-(\d+)$/);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter((num) => num !== null);

      let nextNumber = null;
      for (let i = 1; i <= 4; i++) {
        if (!usedNumbers.includes(i)) {
          nextNumber = i;
          break;
        }
      }

      const response = await post(
        'http://localhost:8080/bot/add',
        {
          name: `Computer-${nextNumber}`,
          difficulty: 'EASY',
          roomId: parseInt(roomId),
        },
        token,
      );

      if (response?.success) {
        showNotification(response.message, 'success');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startGame = async () => {
    try {
      const response = await post('http://localhost:8080/game/start', { roomId }, token);
    } catch (e) {
      console.error(e);
    }
  };

  const totalPlayers = (userCurrentStatus.currentRoom?.participants?.length || 0) +
    (userCurrentStatus.currentRoom?.bots?.length || 0);
  const isRoomFull = totalPlayers >= 4;

  return (
    <>
      <SomethingWentWrong/>
      <div className={styles.roomPageContainer}>
        {/* Header Section */}
        <div className={styles.roomHeader}>
          <div className={styles.roomTitleSection}>
            <h1 className={styles.roomTitle}>
              {userCurrentStatus.currentRoom?.roomName || `Room ${roomId}`}
            </h1>
            <div className={styles.roomInfo}>
                            <span className={styles.playerCount}>
                                {totalPlayers}/4 Players
                            </span>
              <span
                className={`${styles.roomStatus} ${isRoomFull ? styles.full : styles.available}`}>
                                {isRoomFull ? 'Full' : 'Available'}
                            </span>
            </div>
          </div>

          <button onClick={leaveRoom} className={styles.leaveRoomBtn}>
            Leave Room
          </button>
        </div>

        {/* Main Content Grid */}
        <div className={styles.roomContent}>
          {/* Left Column - Players */}
          <div className={styles.roomSection}>
            <h2 className={styles.sectionTitle}>Players</h2>
            <div className={styles.playersList}>
              {userCurrentStatus.currentRoom?.participants.map((p, index) => (
                <div key={p.userId} className={styles.playerCard}>
                  <div className={styles.playerAvatar}>
                    {p.username.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.playerInfo}>
                    <span className={styles.playerName}>{p.username}</span>
                    {p.userId === userCurrentStatus.currentRoom?.gamemaster?.userId && (
                      <span className={styles.gamemasterBadge}>GM</span>
                    )}
                  </div>
                </div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: 4 - totalPlayers }).map((_, index) => (
                <div key={`empty-${index}`}
                     className={`${styles.playerCard} ${styles.emptySlot}`}>
                  <div className={styles.emptySlotContent}>
                    <span>Waiting for player...</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Bots & Controls */}
          <div className={styles.roomSection}>
            <div className={styles.botsHeader}>
              <h2 className={styles.sectionTitle}>AI Opponents</h2>
              {!isRoomFull && userCurrentStatus.managedRoom?.roomId == roomId && (
                <button onClick={addBot} className={styles.addBotBtn}>
                  + Add Bot
                </button>
              )}
            </div>

            <div className={styles.botsList}>
              {userCurrentStatus.currentRoom?.bots.map((b, index) => (
                <BotView
                  key={b.id}
                  bot={b}
                  roomId={roomId}
                  difficulties={['EASY', 'MEDIUM', 'HARD']}
                />
              ))}

              {userCurrentStatus.currentRoom?.bots?.length === 0 && (
                <div className={styles.noBotsMessage}>
                  <p>No AI opponents yet</p>
                  {userCurrentStatus.managedRoom?.roomId == roomId && (
                    <p className={styles.hintText}>Click "Add Bot" to add AI
                      players</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Join Requests */}
        {joinRequests.length > 0 && (
          <div className={styles.joinRequestsPanel}>
            <h3 className={styles.joinRequestsTitle}>Join Requests</h3>
            <div className={styles.joinRequestsList}>
              {joinRequests
                .filter((req, index, self) =>
                  index === self.findIndex(r => r.username === req.username),
                )
                .map((request, index) => (
                  <JoinRequestCard key={index} {...request} />
                ))}
            </div>
          </div>
        )}

        {/* Game Controls */}
        {userCurrentStatus.managedRoom?.roomId == roomId && (
          <div className={styles.gameControls}>
            <button
              onClick={startGame}
              className={styles.startGameBtn}
              disabled={totalPlayers < 2}
            >
              Start Game
            </button>
            {totalPlayers < 2 && (
              <p className={styles.controlHint}>At least 2 players required to
                start</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default RoomPage;