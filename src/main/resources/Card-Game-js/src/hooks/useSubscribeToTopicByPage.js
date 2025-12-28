import React, { useContext, useEffect, useState } from 'react';
import UseWebsocket from './useWebsocket.js';
import { UserContext } from '../Contexts/UserContext.jsx';
import { NotificationContext } from '../Contexts/NotificationContext.jsx';
import useWebsocket from './useWebsocket.js';
import { RoomsDataContext } from '../Contexts/RoomsDataContext.jsx';
import { GameSessionContext } from '../Contexts/GameSessionContext.jsx';
import { useApiCallHook } from './useApiCallHook.js';
import { TokenContext } from '../Contexts/TokenContext.jsx';
import useCalculateDrawAnimation from '../components/Game/Hooks/useCalculateDrawAnimation.js';
import { useMediaQuery } from '@mui/material';
import { getPlayerPositionBySeat } from '../components/Game/HungarianCard.jsx';

const getPageSubscriptions = (contexts) => {
  const {
    userCurrentStatus,
    setUserCurrentStatus,
    gameSession,
    setGameSession,
    setSelectedCards,
    playerSelf,
    setPlayerSelf,
    setTurn,
    setJoinRequests,
    showNotification,
    currentRoomId,
    setValidPlays,
    post,
    token,
    calculateDrawAnimation,
    setAnimatingDrawCards,
    isMobile,
  } = contexts;

  return {
    home: [
      {
        destination: '/user/queue/room-creation-response',
        callback: (message) => {
          if (message.status.success) {
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
          if (message.confirmed === true) {
            showNotification(message.message, 'success');
            setUserCurrentStatus((prev) => ({ ...prev, currentRoom: message.currentRoom }));
            return;
          } else if (message.confirmed === false) {
            showNotification(message.message, 'error');
            return;
          }
          showNotification(message.message, message.success ? 'success' : 'error');
        },
      },
      {
        destination: '/user/queue/errors',
        callback: (message) => {
          console.log(message);
        },
      },
    ],

    room: [
      {
        condition: () => userCurrentStatus.managedRoom?.roomId == currentRoomId,
        destination: '/user/queue/join-requests',
        callback: (message) => {
          setJoinRequests((prev) => [...prev, message]);
        },
      },
      {
        destination: `/topic/room/${currentRoomId}/end`,
        callback: (message) => {
          showNotification(message, 'warning');
        },
      },
      {
        destination: '/user/queue/user-status',
        callback: (message) => {
          setUserCurrentStatus(message);
        },
      },
      {
        destination: `/topic/room/${currentRoomId}/participant-update`,
        callback: (message) => {
          const oldParticipants = userCurrentStatus.currentRoom?.participants || [];
          const newParticipants = message?.participants || [];

          const removedParticipants = oldParticipants.filter(
              (oldParticipant) =>
                  !newParticipants.some(
                      (newParticipant) => newParticipant.userId === oldParticipant.userId
                  )
          );
          setUserCurrentStatus((prev) => ({ ...prev, currentRoom: message }));
          if (removedParticipants.username) {
            showNotification(`${removedParticipants.username} has left`, 'warning');
          }
        },
      },
      {
        destination: `/user/queue/game/start`,
        callback: (message) => {
          console.log(message);

          // Saját játékos beállítása
          const self = message.players.find(
              (m) => m.userId === userCurrentStatus.userInfo.userId
          );

          if (self?.playerId) {
            setPlayerSelf(self);
          }

          // Külön szedjük szét az adatokat
          const { validPlays, ...rest } = message;

          // gameSession: minden más adat, kivéve playableCards
          setGameSession(rest);

          // playableCards: külön state-ben
          setValidPlays(validPlays || []);
        },
      },
      {
        destination: '/user/queue/errors',
        callback: (message) => {
          console.log(message);
        },
      },
    ],

    game: [
      {
        destination: '/user/queue/game/draw',
        callback: (message) => {
          console.log('[DRAW] Message received:', message);
          console.log('[DRAW] Player card count:', message.otherPlayersCardCount?.[message.playerId]);
          console.log('[DRAW] Is self and has new card:', message.playerId === playerSelf.playerId && message.newCard != null);

          if (message.playerId === playerSelf.playerId && message.newCard != null) {
            // SAJÁT JÁTÉKOS HÚZOTT KÁRTYÁT - ANIMÁCIÓ INDÍTÁSA

            // Pakli pozíció lekérése
            const deckElement = document.querySelector('.deck');
            const deckPosition = deckElement
                ? {
                  left: isMobile ? '75%' : '55%',
                  top: '49%',
                }
                : { left: '50%', top: '50%' };

            // Jelenlegi kéz mérete
            const currentHandCount = (gameSession?.playerHand?.ownCards ?? []).length;

            console.log('[DRAW ANIMATION] Starting animation', {
              deckPosition,
              currentHandCount,
              newCards: message.newCard.length,
            });

            // Húzás animáció kiszámítása
            const drawAnimations = calculateDrawAnimation(
                message.newCard,
                deckPosition,
                currentHandCount,
                'bottom',
                true
            );

            // Animáló kártyák beállítása
            setAnimatingDrawCards((prev) => [...prev, ...drawAnimations]);

            // Teljes animációs idő kiszámítása
            const totalDelay = drawAnimations.reduce((max, a) => {
              const finish = (a.delay ?? 0) + (a.duration ?? 0);
              return Math.max(max, finish);
            }, 0);

            console.log('[DRAW ANIMATION] Total animation time:', totalDelay);
            setGameSession((prev) => ({
              ...prev,
              deckSize: message.deckSize ?? prev.deckSize,
            }))
            // Animáció befejezése után frissítjük a game session-t
            setTimeout(() => {
              setGameSession((prev) => {
                const prevOwn = (prev.playerHand?.ownCards ?? []).filter(Boolean);
                const merged =
                    message.newCard.length > 0 ? [...prevOwn, ...message.newCard] : prevOwn;

                console.log('[DRAW ANIMATION] Updating hand:', { prevOwn, merged });

                return {
                  ...prev,
                  gameData: message.gameData ?? prev.gameData,
                  playedCardsSize: message.playedCardsSize ?? prev.playedCardsSize,
                  playerHand: {
                    ...prev.playerHand,
                    ownCards: merged,
                    otherPlayersCardCount:
                        message.otherPlayersCardCount ?? prev.playerHand.otherPlayersCardCount,
                  },
                };
              });

              setSelectedCards([]);
              setAnimatingDrawCards([]);
              console.log('[DRAW ANIMATION] Animation complete, cards added to hand');
            }, totalDelay + 100);
          } else {

            // MÁS JÁTÉKOS HÚZOTT - ANIMÁCIÓ INDÍTÁSA ELLENFÉLNEK
            console.log('[DRAW] Other player drew, starting opponent animation',message);

            // Megkeressük a húzó játékost
            const drawingPlayer = gameSession?.players?.find(p => p.playerId === message.playerId);
            if (!drawingPlayer) {
              console.error('[DRAW] Drawing player not found');
              return;
            }

            // Pakli pozíció lekérése
            const deckElement = document.querySelector('.deck');
            const deckPosition = deckElement
                ? {
                  left: isMobile ? '75%' : '55%',
                  top: '49%',
                }
                : { left: '50%', top: '50%' };

            // Ellenfél pozíciójának meghatározása
            const selfPlayer = gameSession?.players?.find(p => p.playerId === playerSelf.playerId);
            const totalPlayers = gameSession?.players?.length || 2;
            const opponentPosition = getPlayerPositionBySeat(
                drawingPlayer.seat,
                selfPlayer?.seat || 0,
                totalPlayers
            );
            console.log("drawingPlayer",drawingPlayer)

            console.log("opponentPosition",opponentPosition)

            // Jelenlegi kártyák száma az ellenfélnél (az új húzás előtt)
            const currentCardCount = message.otherPlayersCardCount?.[String(message.playerId)] || 0;
            const cardsDrawn = message.drawCardsLength;

            console.log('[DRAW ANIMATION] Starting opponent animation', {
              opponentPosition,
              currentCardCount,
              cardsDrawn,
            });

            // Dummy kártyák létrehozása az animációhoz (hátlap)
            const dummyCards = Array.from({ length: cardsDrawn }).map((_, i) => ({
              refKey: `opponent-draw-${message.playerId}-${Date.now()}-${i}`,
              suit: null, // Hátlap
              rank: null, // Hátlap
              cardId: `temp-${message.playerId}-${Date.now()}-${i}`,
            }));

            // Húzás animáció kiszámítása ellenfélnek
            const drawAnimations = calculateDrawAnimation(
                dummyCards,
                deckPosition,
                currentCardCount - cardsDrawn, // Mínusz az új kártyák, mert a backend már frissítette
                opponentPosition,
                false // Nem saját játékos
            );

            // Animáló kártyák beállítása
            setAnimatingDrawCards((prev) => [...prev, ...drawAnimations]);

            // Teljes animációs idő kiszámítása
            const totalDelay = drawAnimations.reduce((max, a) => {
              const finish = (a.delay ?? 0) + (a.duration ?? 0);
              return Math.max(max, finish);
            }, 0);

            console.log('[DRAW ANIMATION] Opponent animation time:', totalDelay);
            setGameSession((prev) => ({
              ...prev,
              deckSize: message.deckSize ?? prev.deckSize,
            }))
            // Animáció befejezése után frissítjük a game session-t
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
            }, totalDelay + 100);
          }
        },
      },
      {
        destination: '/topic/game/' + gameSession.gameSessionId + '/played-cards',
        callback: (message) => {
          console.log('[WS] played-cards incoming', message);

          // Ha nincs tényleges kártya csomag, skip
          const incoming = message?.newPlayedCards ?? [];
          if (!incoming || incoming.length === 0) return;

          setGameSession((prev) => {
            const queue = Array.isArray(prev?.playedCardsQueue)
                ? prev.playedCardsQueue
                : [];

            const entry = {
              id: `${message.playerId}-${Date.now()}`,
              playerId: message.playerId,
              cards: incoming,
              receivedAt: Date.now(),
            };

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
          console.log('PLAY-CARD-XD', message);
          const newRound = message.gameData?.currentRound;
          setGameSession((prev) => ({
            ...prev,
            playerHand: message.playerHand,
            ...(newRound !== undefined && { newRound }),
            gameData: {
              ...prev.gameData,
              drawStack: message.gameData.drawStack,
              finishedPlayers: message.gameData.finishedPlayers,
              isRoundFinished: message.gameData.isRoundFinished,
              lossCount: message.gameData.lossCount,
              lostPlayers: message.gameData.lostPlayers,
              skippedPlayers: message.gameData.skippedPlayers,
            },
          }));
        },
      },
      {
        destination: '/user/queue/game/turn',
        callback: (message) => {
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
          console.log(message);

          setGameSession({
            gameSessionId: null,
            players: [],
            playerHand: [],
            playedCards: [],
            gameStatus: '',
            gameData: {},
          });
          setValidPlays([]);

          setPlayerSelf({
            playerId: null,
            seat: null,
            userId: null,
            drawStackNumber: null,
          });

          setTurn({
            currentSeat: null,
            yourTurn: false,
          });

          // Ha kilép a gamemaster vagy vége a játéknak
          const currentAndManagedRoom = await post(
              'http://localhost:8080/room/current-and-managed-room',
              {
                currentRoomId: userCurrentStatus.currentRoom?.roomId,
                managedRoomId: userCurrentStatus.managedRoom?.roomId,
              },
              token
          );
          console.log(currentAndManagedRoom);

          const userStatusWRooms = {
            userInfo: userCurrentStatus?.userInfo,
            authenticated: userCurrentStatus?.authenticated,
            currentRoom: currentAndManagedRoom?.currentRoom,
            managedRoom: currentAndManagedRoom?.managedRoom,
          };

          setUserCurrentStatus(userStatusWRooms);
        },
      },
      {
        destination: '/user/queue/game/skip',
        callback: (message) => {
          console.log(message);
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
    setTurn,
    setValidPlays,
    setSelectedCards,
    isNewRound,
    setAnimatingDrawCards,
  } = useContext(GameSessionContext);
  const { setRooms, joinRequests, setJoinRequests } = useContext(RoomsDataContext);
  const { showNotification } = useContext(NotificationContext);
  const { token } = useContext(TokenContext);
  const { post } = useApiCallHook();
  const { calculateDrawAnimation } = useCalculateDrawAnimation(40);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    const newUnsubscribeFunctions = [];

    const context = {
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
      setAnimatingDrawCards,
      isMobile,
    };

    const pageSubscriptions = getPageSubscriptions(context);
    const subscriptionsForPage = pageSubscriptions[page];

    subscriptionsForPage.forEach((sub) => {
      if (sub.condition && typeof sub.condition === 'function' && !sub.condition()) {
        console.log(`[PAGE-SUBSCRIPTION] Condition not met for topic: ${sub.destination}`);
        return;
      }
      const subscription = subscribe(sub.destination, sub.callback);
      newUnsubscribeFunctions.push(subscription);
    });

    return () => {
      console.log(`[PAGE-SUBSCRIPTION] Cleaning up ${page} subscriptions`);
      newUnsubscribeFunctions.forEach((unsubscribe) => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('[PAGE-SUBSCRIPTION] Error during cleanup:', error);
        }
      });
    };
  }, [
    page,
    currentRoomId,
    userCurrentStatus.authenticated,
    gameSession?.gameSessionId,
    playerSelf?.playerId,
    subscribe,
    calculateDrawAnimation,
    isMobile,
  ]);
}

export default UseSubscribeToTopicByPage;