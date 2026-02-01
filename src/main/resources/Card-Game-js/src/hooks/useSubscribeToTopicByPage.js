import React, { useContext, useEffect, useRef } from 'react';
import useWebsocket from './useWebsocket.js';
import { UserContext } from '../Contexts/UserContext.jsx';
import { NotificationContext } from '../Contexts/NotificationContext.jsx';
import { RoomsDataContext } from '../Contexts/RoomsDataContext.jsx';
import { GameSessionContext } from '../Contexts/GameSessionContext.jsx';
import useCalculateReshuffleAnimation
  from '../components/Game/Hooks/useCalcucateReshuffleAnimation.js';
import { useApiCallHook } from './useApiCallHook.js';
import { TokenContext } from '../Contexts/TokenContext.jsx';
import useCalculateDrawAnimation
  from '../components/Game/Hooks/useCalculateDrawAnimation.js';
import { useMediaQuery } from '@mui/material';
import {
  getCardStyleForPosition,
  getPlayerPositionBySeat,
} from '../components/Game/HungarianCard.jsx';
import { useAuth } from './useAuth.js';

function computeSkippedPlayersVisual(message, gameSession) {
  // Biztonsági alapok
  console.log('visual only', message);
  const players = gameSession.players ?? [];
  const finishedPlayers = gameSession.gameData.finishedPlayers ?? [];
  const lostPlayers = gameSession.gameData.lostPlayers ?? [];
  const currentPlayerId = message.playerId;
  const newPlayedCards = message.newPlayedCards ?? [];

  //  játékosok kiválasztása
  const activePlayers = players.filter(
    p =>
      !finishedPlayers.includes(p.playerId) &&
      !lostPlayers.includes(p.playerId),
  );
  console.log('visual only', activePlayers);

  const aceCount = newPlayedCards.filter(card => {
    // card lehet, hogy csak egy string vagy objektum - ha objektum, nézzük a rank mezőt
    if (!card) {
      return false;
    }
    const rank = (typeof card === 'object' && card.rank) ? card.rank : card;
    return typeof rank === 'string' && rank.toUpperCase() === 'ACE';
  }).length;

  // Edge-case kezelések
  if (aceCount === 0) {
    console.log('No ACE played → no skips.');
    return [];
  }
  if (activePlayers.length === 0) {
    console.log('Nincsenek aktív játékosok (mindenki finished vagy lost).');
    return [];
  }

  //  Körkörös  skipped lista generálása playerId-ként
  const startIndex = activePlayers.findIndex(
    p => p.playerId === currentPlayerId,
  );

  const skippedVisual = [];

  for (let i = 1; i <= aceCount; i++) {
    skippedVisual.push(
      activePlayers[(startIndex + i) % activePlayers.length].playerId,
    );
  }

  return skippedVisual;
}

function handleReshuffle(
  cardsToReshuffle,
  deckPosition,
  calculateReshuffleAnimation,
  setAnimatingReshuffle,
  setGameSession,
  newDeckSize, setDeckRotations,
) {

  setTimeout(() => {
    const playedCardElement = document.querySelector('[data-played-card]');
    const playedCardPosition = playedCardElement
      ? {
        left: '45%',
        top: '50%',
      }
      : { left: '50%', top: '50%' };

    console.log('[RESHUFFLE ANIMATION] Starting animation after delay', {
      playedCardPosition,
      deckPosition,
      cardsToReshuffle,
      newDeckSize,
    });

    const reshuffleAnimations = calculateReshuffleAnimation(
      playedCardPosition,
      deckPosition,
      cardsToReshuffle,
    );

    console.log('[RESHUFFLE ANIMATION] Generated animations:', reshuffleAnimations.length);

    setAnimatingReshuffle((prev) => [...prev, ...reshuffleAnimations]);
    console.log('[RESHUFFLE ANIMATION]', reshuffleAnimations.map((a) => (a.waypoints[a.waypoints.length - 1].rotate)));

    setDeckRotations(reshuffleAnimations.map((a) => (a.waypoints[a.waypoints.length - 1].rotate)));

    setGameSession((prev) => ({
      ...prev,
      newDeckSize: newDeckSize,
    }));
  }, 500); // 500ms várakozás
}

const getPageSubscriptions = (getCtx) => {
  return {

    global: [
      {
        destination: '/user/queue/force-logout',
        callback: (message) => {
          const { logout, showNotification } = getCtx();
          console.warn('[FORCE LOGOUT]', message);

          showNotification(
            message.message || 'You have been logged in from another device',
            'warning',
          );

          logout();
        },
      },
      {
        destination: '/topic/room/' + getCtx().currentRoomId + '/reaction-update',
        callback: (message) => {
          const { userCurrentStatus, setUserCurrentStatus } = getCtx();

          setUserCurrentStatus(prev => ({
            ...prev,
            currentRoom: {
              ...prev.currentRoom,
              participants: prev.currentRoom.participants.map(p =>
                p.userId === message.userId
                  ? {
                    ...p,
                    likeCount: message.likeCount,
                    dislikeCount: message.dislikeCount,
                  }
                  : p,
              ),
            },
          }));
        },
      },

    ],
    home: [
      {
        destination: '/topic/rooms',
        callback: (message) => {
          const { setRooms } = getCtx();
          console.log(message);

          setRooms((prev) => ([...prev, message]));
        },

      },
      {
        destination: '/user/queue/room-creation-response',
        callback: (message) => {
          const { setUserCurrentStatus } = getCtx();
          if (message.status?.success) {
            setUserCurrentStatus((prev) => ({
              ...prev,
              currentRoom: message.currentRoom,
              managedRoom: message.managedRoom,
            }));
          }
        },
      },
      {
        destination: '/user/queue/join-response',
        callback: (message) => {
          const { showNotification, setUserCurrentStatus } = getCtx();

          console.log('[JOIN-RESPONSE]', message);

          if (message.confirmed === true) {
            showNotification(message.message, 'success');
            setUserCurrentStatus((prev) => ({
              ...prev,
              currentRoom: message.currentRoom,
            }));
            return;
          }

          if (message.confirmed === false) {
            showNotification(message.message, 'warning');
            return;
          }

          if (message.success !== undefined) {
            showNotification(
              message.message,
              message.success ? 'success' : 'error',
            );
            return;
          }

          //  ha nincs egyértelmű flag
          showNotification(message.message || 'Unknown response', 'info');
        },
      },
      {
        destination: '/user/queue/confirm-error',
        callback: (message) => {
          const { showNotification } = getCtx();

          console.log('[CONFIRM-ERROR]', message);

          // Gamemaster értesítése, hogy miért nem sikerült a konfirmálás
          if (message.success === false) {
            showNotification(
              message.message || 'Cannot confirm join request',
              'error',
            );
          }
        },
      },
      {
        destination: '/user/queue/errors',
        callback: (message) => {
          console.log('[ERROR]', message);
        },
      },
    ],

    room: [
      {
        condition: () => getCtx().userCurrentStatus.managedRoom?.roomId == getCtx().currentRoomId,
        destination: '/user/queue/join-requests',
        callback: (message) => {
          const { setJoinRequests, showNotification } = getCtx();

          console.log('[JOIN-REQUEST] New request received:', message);

          // Hozzáadjuk a join request-et a listához
          setJoinRequests((prev) => [...prev, message]);

          // notification gamemaster-nek
          showNotification(
            `${message.username} wants to join the room`,
            'info',
          );
        },
      },
      {

        condition: () => getCtx().userCurrentStatus.managedRoom?.roomId == getCtx().currentRoomId,
        destination: '/user/queue/confirm-error',
        callback: (message) => {
          const { showNotification, setJoinRequests } = getCtx();

          console.log('[CONFIRM-ERROR] Room page:', message);

          if (message.success === false) {
            showNotification(
              message.message || 'Cannot confirm join request',
              'error',
            );

          }
        },
      },
      {
        destination: `/topic/room/${getCtx().currentRoomId}/end`,
        callback: (message) => {
          const { showNotification } = getCtx();
          showNotification(message, 'warning');
        },
      },
      {
        destination: '/user/queue/user-status',
        callback: (message) => {
          const { setUserCurrentStatus } = getCtx();

          console.log('[USER-STATUS] Status update:', message);

          setUserCurrentStatus(message);
        },
      }, {
        destination: `/topic/room/${getCtx().currentRoomId}/participant-update`,
        callback: (message) => {
          const { userCurrentStatus, setUserCurrentStatus, showNotification } = getCtx();

          const oldParticipants = userCurrentStatus.currentRoom?.participants || [];
          const newParticipants = message?.participants || [];

          // Kilépett játékosok detektálása
          const removedParticipants = oldParticipants.filter(
            (oldParticipant) =>
              !newParticipants.some(
                (newParticipant) => newParticipant.userId === oldParticipant.userId,
              ),
          );

          // Új játékosok detektálása
          const addedParticipants = newParticipants.filter(
            (newParticipant) =>
              !oldParticipants.some(
                (oldParticipant) => oldParticipant.userId === newParticipant.userId,
              ),
          );

          setUserCurrentStatus((prev) => ({ ...prev, currentRoom: message }));

          // Kilépett játékosok értesítése
          removedParticipants.forEach(rp => {
            if (rp?.username) {
              showNotification(`${rp.username} has left`, 'warning');
            }
          });

          // Új játékosok értesítése
          addedParticipants.forEach(ap => {
            if (ap?.username) {
              showNotification(`${ap.username} has joined`, 'success');
            }
          });
        },
      },
      {
        destination: '/user/queue/join-response',
        callback: (message) => {
          const { showNotification, setUserCurrentStatus } = getCtx();

          console.log('[JOIN-RESPONSE] Room page:', message);

          // SIKERES KONFIRMÁLÁS
          if (message.confirmed === true) {
            showNotification(message.message, 'success');
            setUserCurrentStatus((prev) => ({
              ...prev,
              currentRoom: message.currentRoom,
            }));
            return;
          }

          //  ELUTASÍTOTT JOIN
          if (message.confirmed === false) {
            showNotification(message.message, 'warning');
            return;
          }

          if (message.success !== undefined) {
            showNotification(
              message.message,
              message.success ? 'success' : 'error',
            );
            return;
          }
        },
      },
      {
        destination: `/user/queue/game/start`,
        callback: (message) => {
          console.log('startmessage', message);

          const {
            userCurrentStatus,
            setPlayerSelf,
            setGameSession,
            setValidPlays,
            setCurrentRoundKey,
          } = getCtx();

          // Saját játékos beállítása
          const self = message.players.find(
            (m) => m.userId === userCurrentStatus.userInfo.userId,
          );

          if (self?.playerId) {
            setPlayerSelf(self);
          }

          // Külön szedjük szét az adatokat
          const { validPlays, ...rest } = message;

          //  Növeljük a round key-t
          setCurrentRoundKey(prev => prev + 1);

          // gameSession: minden más adat, kivéve playableCards
          setGameSession(rest);

          // playableCards: külön state-ben
          setValidPlays(validPlays || []);
        },
      },
      {
        destination: '/user/queue/errors',
        callback: (message) => {
          console.log('[ERROR]', message);
        },
      },
    ],

    game: [

      {
        destination: '/user/queue/game/draw',
        callback: (message) => {
          const ctx = getCtx();
          const {
            gameSession,
            playerSelf,
            setAnimatingDrawCards,
            calculateDrawAnimation,
            setGameSession,
            setSelectedCards,
            isMobile,
            calculateReshuffleAnimation,
            setAnimatingReshuffle,
            setDeckRotations,
            isTablet,
          } = ctx;

          console.log('[DRAW] Message received:', message);
          console.log('[DRAW] Reshuffled flag:', message.reshuffled);

          const deckElement = document.querySelector('.deck');
          const deckPosition = deckElement
            ? {
              left: isMobile ? '45%' : '55%',
              top: isMobile ? '30%' : '49%',
            }
            : { left: '50%', top: '50%' };

          //RESHUFFLE HANDLING
          const currentDeckSize = gameSession?.deckSize || 0;
          const willReshuffle = message.reshuffled === true;

          console.log('[DRAW] Deck status:', {
            currentDeckSize,
            newDeckSize: message.deckSize,
            willReshuffle,
          });

          // Ha reshuffle lesz, először csökkentjük a deckSize-t 0-ra
          if (willReshuffle && currentDeckSize > 0) {
            setGameSession((prev) => ({
              ...prev,
              deckSize: 0, // Mutatjuk, hogy elfogyott a deck
            }));
          }

          // SELF PLAYER DRAW

          if (message.playerId === playerSelf?.playerId && message.newCard != null) {
            const currentHandCount = (gameSession?.playerHand?.ownCards ?? []).length;

            console.log('[DRAW ANIMATION] Starting self animation', {
              deckPosition,
              currentHandCount,
              newCards: message.newCard.length,
            });

            // calculateDrawAnimation visszaadja az animációkat minden kártyához
            const drawAnimations = calculateDrawAnimation(
              isTablet,
              message.newCard,
              deckPosition,
              currentHandCount,
              'bottom',
              true,
              isMobile || isTablet,
            );

            //ideiglenesen elokjuk a kartyakat
            const cardElements = document.querySelectorAll('.own-card-container');
            console.log(cardElements, 'cardElements-own');

            cardElements.forEach((el, index) => {
              console.log('cardElements-own', index, cardElements.length + message.newCard.length);
              console.log('cardElements-own',
                'card',
                index,
                'left:',
                el.style.left,
                'top:',
                el.style.top,
              );
              let style = getCardStyleForPosition('bottom', index, cardElements.length + message.newCard.length);
              console.log(style, 'cardElements-own');

              el.style.left = style.left;
            });

            // Megjelenítjük az animációkat
            setAnimatingDrawCards((prev) => [...prev, ...drawAnimations]);

            const drawTotalDelay = drawAnimations.reduce((max, a) => {
              const finish = (a.delay ?? 0) + (a.duration ?? 0);
              return Math.max(max, finish);
            }, 0);

            setTimeout(() => {
              setGameSession((prev) => {
                const prevOwn = (prev.playerHand?.ownCards ?? []).filter(Boolean);
                const merged =
                  message.newCard.length > 0
                    ? [...prevOwn, ...message.newCard]
                    : prevOwn;

                return {
                  ...prev,
                  gameData: message.gameData ?? prev.gameData,
                  playedCardsSize: message.playedCardsSize ?? prev.playedCardsSize,
                  playerHand: {
                    ...prev.playerHand,
                    ownCards: merged,
                    otherPlayersCardCount:
                      message.otherPlayersCardCount ??
                      prev.playerHand.otherPlayersCardCount,
                  },
                };
              });

              setSelectedCards([]);
              setAnimatingDrawCards([]);
              console.log('[DRAW ANIMATION] Self animation complete');

              if (willReshuffle) {
                const cardsToReshuffle = message.deckSize;
                handleReshuffle(
                  cardsToReshuffle - 1,
                  deckPosition,
                  calculateReshuffleAnimation,
                  setAnimatingReshuffle,
                  setGameSession,
                  message.deckSize, setDeckRotations,
                );
              } else {
                // Normál deckSize frissítés
                setGameSession((prev) => ({
                  ...prev,
                  deckSize: message.deckSize,
                }));
              }
            }, drawTotalDelay);
          }
          // OPPONENT DRAW
          else {
            // ... opponent draw logic
            console.log('[DRAW] Other player drew, starting opponent animation', message);

            const drawingPlayer = gameSession?.players?.find(p => p.playerId === message.playerId);
            if (!drawingPlayer) {
              console.error('[DRAW] Drawing player not found');
              return;
            }

            const selfPlayer = gameSession?.players?.find(p => p.playerId === playerSelf?.playerId);
            const totalPlayers = gameSession?.players?.length || 2;
            const opponentPosition = getPlayerPositionBySeat(
              drawingPlayer.seat,
              selfPlayer?.seat || 0,
              totalPlayers,
            );

            const currentCardCount = message.otherPlayersCardCount?.[String(message.playerId)] || 0;
            const cardsDrawn = message.drawCardsLength || (message.newCard ? message.newCard.length : 0);

            console.log('[DRAW ANIMATION] Starting opponent animation', {
              opponentPosition,
              currentCardCount,
              cardsDrawn,
            });

            const dummyCards = Array.from({ length: cardsDrawn }).map((_, i) => ({
              refKey: `opponent-draw-${message.playerId}-${Date.now()}-${i}`,
            }));

            const drawAnimations = calculateDrawAnimation(
              isTablet,
              dummyCards,
              deckPosition,
              Math.max(0, currentCardCount - cardsDrawn),
              opponentPosition,
              false,
              isMobile || isTablet,
            );

            //ideiglenesen elokjuk a kartyakat
            const cardElements = document.querySelectorAll('.player-' + message.playerId + '-card');

            cardElements.forEach((el, index) => {
              const posClass = [...el.classList].find(c => c.startsWith('pos-'));
              const pos = posClass?.replace('pos-', '');
              let style;
              console.log('pos', pos);

              switch (pos) {
                case 'top':
                  style = getCardStyleForPosition(pos, index, cardElements.length + cardsDrawn);
                  el.style.left = style.left;
                  break;
                case 'left':
                  style = getCardStyleForPosition(pos, index, cardElements.length + cardsDrawn);
                  el.style.top = style.top;
                  break;
                case 'right':
                  style = getCardStyleForPosition(pos, index, cardElements.length + cardsDrawn);
                  el.style.top = style.top;
                  break;
              }

            });

            setAnimatingDrawCards((prev) => [...prev, ...drawAnimations]);

            const totalDelay = drawAnimations.reduce((max, a) => {
              const finish = (a.delay ?? 0) + (a.duration ?? 0);
              return Math.max(max, finish);
            }, 0);

            console.log('[DRAW ANIMATION] Opponent animation time:', totalDelay);

            setTimeout(() => {
              setGameSession((prev) => ({
                ...prev,
                gameData: message.gameData ?? prev.gameData,

                playedCardsSize: message.playedCardsSize ?? prev.playedCardsSize,
                playerHand: {
                  ...prev.playerHand,

                  otherPlayersCardCount: message.otherPlayersCardCount,
                  ownCards: prev.playerHand?.ownCards?.filter(Boolean) || [],
                },
              }));
              setAnimatingDrawCards([]);
              console.log('[DRAW ANIMATION] Opponent animation complete');

              //  OPPONENTNÉL IS
              if (willReshuffle) {
                const cardsToReshuffle = message.deckSize;

                handleReshuffle(
                  cardsToReshuffle - 1,
                  deckPosition,
                  calculateReshuffleAnimation,
                  setAnimatingReshuffle,
                  setGameSession,
                  message.deckSize, setDeckRotations,
                );
              } else {
                // Normál deckSize frissítés
                setGameSession((prev) => ({
                  ...prev,
                  deckSize: message.deckSize,
                }));
              }
            }, totalDelay);
          }
        },
      },

      {
        destination: '/topic/game/' + getCtx().gameSession?.gameSessionId + '/played-cards',
        callback: (message) => {
          const { gameSession, setSkippedPlayers } = getCtx();
          //ace handling

          if (message.newPlayedCards[0].rank === 'ACE') {
            console.log('visual only', message.newPlayedCards[0].rank);
            const skippedVisual = computeSkippedPlayersVisual(message, gameSession);

            // kiírás / debug
            console.log('visual only', skippedVisual);
            setSkippedPlayers(skippedVisual);

          }
          console.log('[WS] played-cards incoming', message);

          const incoming = message?.newPlayedCards ?? [];
          if (!incoming || incoming.length === 0) {
            return;
          }

          const { setGameSession, playerSelf } = getCtx();

          // hozzáadjuk a saját kártyáinkat is, DE csak ha még nincs a queue-ban
          setGameSession((prev) => {
            const queue = Array.isArray(prev?.playedCardsQueue) ? prev.playedCardsQueue : [];

            // Ellenőrizzük hogy már van-e ilyen queue item
            const alreadyExists = queue.some(item =>
              item.playerId === message.playerId &&
              Math.abs(item.receivedAt - Date.now()) < 1000,
            );

            if (alreadyExists) {
              console.log('[WS] Queue item already exists, skipping duplicate');
              return prev;
            }

            const entry = {
              id: `${message.playerId}-${Date.now()}`,
              playerId: message.playerId,
              cards: incoming,
              receivedAt: Date.now(),
            };

            console.log('[WS] Adding cards to queue:', entry);

            return {
              ...prev,
              playedCardsQueue: [...queue, entry],
            };
          });
        },
      },

      {
        destination: '/user/queue/game/play-cards',
        callback: (message) => {
          const { setGameSession } = getCtx();
          console.log('[WS] play-cards response from backend:', message);

          const newRound = message.gameData?.currentRound;
          setGameSession((prev) => ({
            ...prev,
            playerHand: message.playerHand,
            ...(newRound !== undefined && { newRound }),
            gameData: {
              ...prev.gameData,
              suitChangedTo: message.gameData.suitChangedTo,
              noMoreCards: message.gameData.noMoreCards,
              drawStack: message.gameData.drawStack,
              finishedPlayers: message.gameData.finishedPlayers,
              isRoundFinished: message.gameData.isRoundFinished,
              lossCount: message.gameData.lossCount,
              lostPlayers: message.gameData.lostPlayers,
              skippedPlayers: message.gameData.skippedPlayers,
              noMoreCardsNextDraw: message.gameData.noMoreCardsNextDraw,
            },
          }));
        },
      },
      {
        destination: '/user/queue/game/turn',
        callback: (message) => {
          const { setTurn, setValidPlays } = getCtx();
          console.log(message, '!!!!!!!!!!!!!!!!!!!');
          setTurn({
            currentSeat: message.currentSeat,
            yourTurn: message.yourTurn,
          });
          setValidPlays(message.validPlays || []);
        },
      },

      {
        destination: '/user/queue/game/reorder-cards',
        callback: (message) => {
          const { setGameSession } = getCtx();
          console.log('Cards reordered:', message);

          setGameSession((prev) => ({
            ...prev,
            playerHand: {
              ...prev.playerHand,
              ownCards: message.reorderedCards,
            },
          }));
        },
      },

      {
        destination: '/user/queue/game/end',
        callback: async (message) => {
          const {
            setGameSession, setValidPlays, setPlayerSelf, setTurn, post, token, setUserCurrentStatus, setSelectedCards, setAnimatingCards, setAnimatingOwnCards,
            setAnimatingDrawCards, setAnimatingReshuffle, setIsNewRound, setDeckRotations, animatingReshuffle,
          } = getCtx();
          console.log('gameEND', message, animatingReshuffle, setAnimatingReshuffle);

          setTimeout(() => { window.location.reload();}, 1000);

          // setGameSession({
          //
          // });
          // setValidPlays([]);
          //
          // setPlayerSelf({
          //
          // });
          //
          // setTurn({
          //
          // });
          //
          // setSelectedCards([]);
          // setAnimatingCards([])
          // setAnimatingOwnCards([])
          // setAnimatingDrawCards([])
          // setAnimatingReshuffle([])
          // setGameSession({})
          // setIsNewRound(false)
          // setDeckRotations([])
          //
          // const userCurrentStatus = getCtx().userCurrentStatus;
          //
          // const currentAndManagedRoom = await post(
          //     'http://localhost:8080/room/current-and-managed-room',
          //     {
          //       currentRoomId: userCurrentStatus.currentRoom?.roomId,
          //       managedRoomId: userCurrentStatus.managedRoom?.roomId,
          //     },
          //     token
          // );
          //
          // const userStatusWRooms = {
          //   userInfo: userCurrentStatus?.userInfo,
          //   authenticated: userCurrentStatus?.authenticated,
          //   currentRoom: currentAndManagedRoom?.currentRoom,
          //   managedRoom: currentAndManagedRoom?.managedRoom,
          // };
          //
          // setUserCurrentStatus(userStatusWRooms);
        },
      },

      {
        destination: '/user/queue/game/skip',
        callback: (message) => {
          const { setSkipTurn } = getCtx();
          console.log(message);
          if (message.skipTurn && message.skippedPlayerId) {
            setSkipTurn({
              playerId: message.skippedPlayerId,
              seat: message.skippedPlayerSeat,
              timestamp: Date.now(),
            });
          }
        },
      },
      {
        destination: '/user/queue/errors',
        callback: (message) => {
          console.log(message);
        },
      },
      {
        destination: '/user/queue/game/player-left',
        callback: (message) => {
          console.log(message);
        },
      },
      {
        destination: '/user/queue/game/draw-stack',
        callback: (message) => {
          const { setGameSession } = getCtx();
          console.log(message);
          setGameSession((prev) => ({
            ...prev,
            gameData: {
              ...(prev.gameData || {}),
              drawStack: message.drawStack,
            },
          }));
        },
      },
    ],

    about: [
      {
        destination: '/user/queue/test',
        callback: (ms) => {},
      },
    ],
  };
};

function UseSubscribeToTopicByPage({ page, currentRoomId }) {
  const { subscribe } = useWebsocket();
  const { userCurrentStatus, setUserCurrentStatus } = useContext(UserContext);
  const {
    gameSession,
    setGameSession,
    playerSelf,
    setPlayerSelf,
    setAnimatingOwnCards,
    setTurn,
    setValidPlays,
    setSelectedCards,
    isNewRound,
    setAnimatingDrawCards,
    setAnimatingReshuffle,
    setIsNewRound,
    setDeckRotations,
    setAnimatingCards,
    animatingReshuffle,
    setSkipTurn,
    skippedPlayers,
    setSkippedPlayers,
    setCurrentRoundKey,
  } = useContext(GameSessionContext);
  const { setRooms, joinRequests, setJoinRequests } = useContext(RoomsDataContext);
  const { showNotification } = useContext(NotificationContext);
  const { token } = useContext(TokenContext);
  const { post } = useApiCallHook();
  const { calculateDrawAnimation } = useCalculateDrawAnimation(40);
  const { calculateReshuffleAnimation } = useCalculateReshuffleAnimation();
  const { logout } = useAuth();

  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-height: 768px) and (orientation: landscape)');

  const contextRef = useRef({
    userCurrentStatus,
    setUserCurrentStatus,
    setJoinRequests,
    showNotification,
    currentRoomId,
    gameSession,
    setGameSession,
    setSelectedCards,
    playerSelf,
    setPlayerSelf,
    setTurn,
    setValidPlays,
    post,
    token,
    isNewRound,
    calculateDrawAnimation,
    calculateReshuffleAnimation,
    setAnimatingDrawCards,
    isMobile,
    isTablet,
    setAnimatingReshuffle,
    setRooms,
    joinRequests,
    setAnimatingOwnCards,
    setIsNewRound,
    setDeckRotations,
    setAnimatingCards,
    animatingReshuffle,
    setSkipTurn,
    skippedPlayers,
    setSkippedPlayers,
    logout,
    setCurrentRoundKey,
  });

  useEffect(() => {
    contextRef.current = {
      ...contextRef.current,
      userCurrentStatus,
      setUserCurrentStatus,
      setJoinRequests,
      showNotification,
      currentRoomId,
      gameSession,
      setGameSession,
      setSelectedCards,
      playerSelf,
      setPlayerSelf,
      setTurn,
      setValidPlays,
      post,
      token,
      isNewRound,
      calculateDrawAnimation,
      calculateReshuffleAnimation,
      setAnimatingDrawCards,
      isMobile,
      isTablet,
      setAnimatingReshuffle,
      setRooms,
      joinRequests,
      setAnimatingOwnCards,
      setIsNewRound,
      setDeckRotations,
      setAnimatingCards,
      animatingReshuffle,
      setSkipTurn,
      skippedPlayers,
      setSkippedPlayers,
      logout,
      setCurrentRoundKey,
    };
  }, [
    userCurrentStatus,
    setUserCurrentStatus,
    setJoinRequests,
    showNotification,
    currentRoomId,
    gameSession,
    setGameSession,
    setSelectedCards,
    playerSelf,
    setPlayerSelf,
    setTurn,
    setValidPlays,
    post,
    token,
    isNewRound,
    calculateDrawAnimation,
    calculateReshuffleAnimation,
    setAnimatingDrawCards,
    isMobile,
    isTablet,
    setAnimatingReshuffle,
    setRooms,
    joinRequests,
    setAnimatingOwnCards,
    setIsNewRound,
    setDeckRotations,
    setAnimatingCards,
    animatingReshuffle,
    setSkipTurn,
    skippedPlayers,
    setSkippedPlayers,
    logout,
    setCurrentRoundKey,
  ]);

  useEffect(() => {
    const newUnsubscribeFunctions = [];
    const getCtx = () => contextRef.current;

    const pageSubscriptions = getPageSubscriptions(getCtx);

    //  MINDIG feliratkozunk a global subscriptions-re
    const globalSubs = pageSubscriptions.global || [];
    globalSubs.forEach((sub) => {
      try {
        const unsubscribe = subscribe(sub.destination, sub.callback);
        newUnsubscribeFunctions.push(unsubscribe);
        console.log('[GLOBAL-SUBSCRIPTION] Subscribed to:', sub.destination);
      } catch (err) {
        console.error('[GLOBAL-SUBSCRIPTION] Failed to subscribe to', sub.destination, err);
      }
    });

    // Page-specific subscriptions
    const subscriptionsForPage = pageSubscriptions[page] || [];
    subscriptionsForPage.forEach((sub) => {
      try {
        if (sub.condition && typeof sub.condition === 'function' && !sub.condition()) {
          console.log(`[PAGE-SUBSCRIPTION] Condition not met for topic: ${sub.destination}`);
          return;
        }
        const unsubscribe = subscribe(sub.destination, sub.callback);
        newUnsubscribeFunctions.push(unsubscribe);
      } catch (err) {
        console.error('[PAGE-SUBSCRIPTION] Failed to subscribe to', sub.destination, err);
      }
    });

    return () => {
      console.log(`[SUBSCRIPTION] Cleaning up global and ${page} subscriptions`);
      newUnsubscribeFunctions.forEach((unsubscribe) => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('[SUBSCRIPTION] Error during cleanup:', error);
        }
      });
    };
  }, [
    page,
    currentRoomId,
    userCurrentStatus?.authenticated,
    subscribe,
  ]);

}

export default UseSubscribeToTopicByPage;
