import React, { useContext, useEffect, useState } from 'react';
import UseWebsocket from './useWebsocket.js';
import { UserContext } from '../Contexts/UserContext.jsx';
import { NotificationContext } from '../Contexts/NotificationContext.jsx';
import useWebsocket from './useWebsocket.js';
import { RoomsDataContext } from '../Contexts/RoomsDataContext.jsx';
import { GameSessionContext } from '../Contexts/GameSessionContext.jsx';
import { useApiCallHook } from './useApiCallHook.js';
import { TokenContext } from '../Contexts/TokenContext.jsx';

const getPageSubscriptions = (contexts) => {

  const {
    userCurrentStatus, setUserCurrentStatus,
    gameSession, setGameSession,setSelectedCards,
    playerSelf, setPlayerSelf,
    setTurn,
    setJoinRequests,
    showNotification,
    currentRoomId,
    setValidPlays,
    post,
    token,
  } = contexts;

  return {
    'home': [
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

      }, {
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
      }, {
        destination: '/user/queue/errors',
        callback: (message) => {
          console.log(message);

        },
      },
    ],

    'room': [
      {
        condition: (userCurrentStatus.managedRoom?.roomId == currentRoomId),
        destination: '/user/queue/join-requests',
        callback: (message) => {

          setJoinRequests((prev) => [...prev, message]);
        },

      }, {
        destination: `/topic/room/${currentRoomId}/end`,
        callback: (message) => {
          showNotification(message, 'warning');
        },
      }, {
        destination: '/user/queue/user-status',
        callback: (message) => {
          setUserCurrentStatus(message);
        },
      }, {
        destination: `/topic/room/${currentRoomId}/participant-update`,
        callback: (message) => {
          const oldParticipants = userCurrentStatus.currentRoom?.participants || [];
          const newParticipants = message?.participants || [];

          const removedParticipants = oldParticipants.filter(oldParticipant =>
            !newParticipants.some(newParticipant =>
              newParticipant.userId === oldParticipant.userId, // vagy bármilyen egyedi azonosító
            ),
          );
          setUserCurrentStatus((prev) => ({ ...prev, currentRoom: message }));
          if (removedParticipants.username) {
            showNotification(`${removedParticipants.username} has left`, 'warning');
          }
        },
      }, {
        destination: `/user/queue/game/start`,
        callback: (message) => {
          console.log(message);

          // saját játékos beállítása
          const self = message.players.find(
            (m) => m.userId === userCurrentStatus.userInfo.userId,
          );

          if (self?.playerId) {
            setPlayerSelf(self);
          }

          // külön szedjük szét az adatokat
          const { validPlays, ...rest } = message;

          // gameSession: minden más adat, kivéve playableCards
          setGameSession(rest);

          // playableCards: külön state-ben
          setValidPlays(validPlays || []);
        },
      }, {
        destination: '/user/queue/errors',
        callback: (message) => {
          console.log(message);

        },
      },
    ],
    'game': [
      {
        destination: '/user/queue/game/draw',
        callback: (message) => {


          console.log(message);
          console.log(message.otherPlayersCardCount[message.playerId]);
          console.log(message.playerId === playerSelf.playerId && message.newCard != null);

          if (message.playerId === playerSelf.playerId && message.newCard != null) {
            // Saját húzás → új kártyát hozzáadjuk az ownCards-hoz
            if (message.newCard) { // csak ha van új kártya
              setGameSession(prev => {
                const prevOwn = (prev.playerHand?.ownCards ?? []).filter(Boolean);
                const merged = message.newCard.length > 0 ? [...prevOwn, ...message.newCard] : prevOwn;
                console.log(merged,prevOwn)

                return {
                  ...prev,
                  gameData: message.gameData ?? prev.gameData,
                  deckSize: message.deckSize ?? prev.deckSize,
                  playedCardsSize: message.playedCardsSize ?? prev.playedCardsSize,
                  playerHand: {
                    ...prev.playerHand,
                    ownCards: merged,
                    otherPlayersCardCount: message.otherPlayersCardCount ?? prev.playerHand.otherPlayersCardCount,
                  },
                };
              });
              setSelectedCards([])
            }
          } else {
            // Más húzott → csak az otherPlayersCardCount frissítése
            console.log(message.otherPlayersCardCount[message.playerId]);

            setGameSession(prev => ({
              ...prev,
              gameData: message.gameData ?? prev.gameData,
              deckSize: message.deckSize,
              playedCardsSize: message.playedCardsSize ?? prev.playedCardsSize,
              playerHand: {
                ...prev.playerHand,
                otherPlayersCardCount: message.otherPlayersCardCount,
                ownCards: prev.playerHand.ownCards.filter(Boolean),
              },
            }));
          }
        },
      }, {
        destination: '/topic/game/' + gameSession.gameSessionId + '/played-cards',
        callback: (message) => {

          console.log('[WS] played-cards incoming', message);

          // Ha nincs tényleges kártya csomag, skip
          const incoming = message?.newPlayedCards ?? [];
          if (!incoming || incoming.length === 0) return;

          setGameSession((prev) => {
            const queue = Array.isArray(prev?.playedCardsQueue) ? prev.playedCardsQueue : [];

            const entry = {
              id: `${message.playerId}-${Date.now()}`, // egyedi id
              playerId: message.playerId,
              cards: incoming,
              receivedAt: Date.now(),
            };

            return {
              ...prev,
              // hozzáfűzzük sor végére (érkezési sorrend)
              playedCardsQueue: [...queue, entry],
            };
          });
        },

      }, {

        destination: '/user/queue/game/play-cards',
        callback: (message) => {
          console.log("PLAY-CARD-XD",message);
          const newRound = message.gameData?.currentRound;
          setGameSession((prev) => ({ ...prev, playerHand: message.playerHand, ...(newRound !== undefined && { newRound }) ,gameData: {
              ...prev.gameData,
              drawStack:message.gameData.drawStack,
              finishedPlayers:message.gameData.finishedPlayers,
              isRoundFinished:message.gameData.isRoundFinished,
              lossCount:message.gameData.lossCount,
              lostPlayers:message.gameData.lostPlayers,
              skippedPlayers:message.gameData.skippedPlayers,
            } }));
        },
      }, {
        destination: '/user/queue/game/turn',
        callback: (message) => {
          console.log(message, '!!!!!!!!!!!!!!!!!!!');
          setTurn({
            currentSeat: message.currentSeat,
            yourTurn: message.yourTurn,
          });
          setValidPlays(message.validPlays || []);

        },
      },{
        destination: '/user/queue/game/reorder-cards',
        callback: (message) => {
          console.log('Cards reordered:', message);

          setGameSession(prev => ({
            ...prev,
            playerHand: {
              ...prev.playerHand,
              ownCards: message.reorderedCards
            }
          }));


        }
      }, {
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
          //ha kilep a gamemaster vagy vege a jateknak akkor ha ido kozbe frissult a room akkor kapjuk(kilepett egy jateson es hozaadotott egy bot)  meg az infot
          const currentAndManagedRoom = await post('http://localhost:8080/room/current-and-managed-room', { currentRoomId: userCurrentStatus.currentRoom?.roomId, managedRoomId: userCurrentStatus.managedRoom?.roomId }, token);
          console.log(currentAndManagedRoom);

          const userStatusWRooms = {
            userInfo: userCurrentStatus?.userInfo,
            authenticated: userCurrentStatus?.authenticated,
            currentRoom: currentAndManagedRoom?.currentRoom,
            managedRoom: currentAndManagedRoom?.managedRoom,
          };

          setUserCurrentStatus(userStatusWRooms);
        },
      }, {
        destination: '/user/queue/game/skip',
        callback: (message) => {
          console.log(message);
        },
      }, {
        destination: '/user/queue/errors',
        callback: (message) => {
          console.log(message);

        },
      }, {
        destination: '/user/queue/game/player-left',
        callback: (message) => {
          console.log(message);
        },
      }, {
        destination: '/user/queue/game/draw-stack',
        callback: (message) => {
          console.log(message);
          setGameSession(prev => ({
            ...prev,
            gameData: {
              // megtartjuk a korábbi gameData mezőket, csak az drawStackNumber-t frissítjük
              ...(prev.gameData || {}),
              drawStack: message.drawStack,
            },
          }));
        },
      },
    ],

    'about': [
      {
        destination: '/user/queue/test',
        callback: (ms) => {

        },
      },
    ],

  };
};

function UseSubscribeToTopicByPage({ page, currentRoomId }) {

  const { subscribe } = useWebsocket();
  const { userCurrentStatus, setUserCurrentStatus } = useContext(UserContext);
  const { gameSession, setGameSession, playerSelf, setPlayerSelf, setTurn, setValidPlays,setSelectedCards } = useContext(GameSessionContext);
  const { setRooms, joinRequests, setJoinRequests } = useContext(RoomsDataContext);
  const { showNotification } = useContext(NotificationContext);
  const { token } = useContext(TokenContext);
  const { post } = useApiCallHook();

  useEffect(() => {
    const newUnsubscribeFunctions = [];

    const context = {
      userCurrentStatus,
      setUserCurrentStatus,
      setJoinRequests,
      showNotification,
      currentRoomId,
      gameSession,
      setGameSession,setSelectedCards,
      playerSelf,
      setPlayerSelf,
      setTurn,
      setValidPlays,
      post,
      token,
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
      newUnsubscribeFunctions.forEach(unsubscribe => {
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
    userCurrentStatus.authenticated, gameSession?.gameSessionId,
    playerSelf?.playerId, subscribe,
  ]);
}

export default UseSubscribeToTopicByPage;
