import React, {useContext, useEffect, useRef} from 'react';
import useWebsocket from './useWebsocket.js';
import { UserContext } from '../Contexts/UserContext.jsx';
import { NotificationContext } from '../Contexts/NotificationContext.jsx';
import { RoomsDataContext } from '../Contexts/RoomsDataContext.jsx';
import { GameSessionContext } from '../Contexts/GameSessionContext.jsx';
import useCalculateReshuffleAnimation from '../components/Game/Hooks/useCalcucateReshuffleAnimation.js';
import { useApiCallHook } from './useApiCallHook.js';
import { TokenContext } from '../Contexts/TokenContext.jsx';
import useCalculateDrawAnimation from '../components/Game/Hooks/useCalculateDrawAnimation.js';
import { useMediaQuery } from '@mui/material';
import {getCardStyleForPosition, getPlayerPositionBySeat} from '../components/Game/HungarianCard.jsx';

function computeSkippedPlayersVisual(message,gameSession) {
  // Biztonsági alapok
  console.log("visual only",message)
  const players = gameSession.players ?? [];
  const finishedPlayers = gameSession.gameData.finishedPlayers ?? [];
  const lostPlayers = gameSession.gameData.lostPlayers ?? [];
  const currentPlayerId = message.playerId;
  const newPlayedCards = message.newPlayedCards ?? [];

  //  játékosok kiválasztása
  const activePlayers = players.filter(
      p =>
          !finishedPlayers.includes(p.playerId) &&
          !lostPlayers.includes(p.playerId)
  );
  console.log("visual only",activePlayers)


  //  Hány ACE készült le?
  const aceCount = newPlayedCards.filter(card => {
    // card lehet, hogy csak egy string vagy objektum - ha objektum, nézzük a rank mezőt
    if (!card) return false;
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
      p => p.playerId === currentPlayerId
  );

  const skippedVisual = [];

  for (let i = 1; i <= aceCount; i++) {
    skippedVisual.push(
        activePlayers[(startIndex + i) % activePlayers.length].playerId
    );
  }

  return skippedVisual; // pl. [6,7,6,7]
}

function handleReshuffle(
    cardsToReshuffle,
    deckPosition,
    calculateReshuffleAnimation,
    setAnimatingReshuffle,
    setGameSession,
    newDeckSize,setDeckRotations
) {
  // 500ms várakozás, hogy látszódjon az üres deck
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
    console.log("[RESHUFFLE ANIMATION]",reshuffleAnimations.map((a)=>(a.waypoints[a.waypoints.length-1].rotate)))

    setDeckRotations(reshuffleAnimations.map((a)=>(a.waypoints[a.waypoints.length-1].rotate)))

    // Ideiglenesen beállítjuk a newDeckSize-t
    setGameSession((prev) => ({
      ...prev,
      newDeckSize: newDeckSize,
    }));
  }, 500); // 500ms várakozás
}

const getPageSubscriptions = (getCtx) => {
  return {
    home: [
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
        condition: () => getCtx().userCurrentStatus.managedRoom?.roomId == getCtx().currentRoomId,
        destination: '/user/queue/join-requests',
        callback: (message) => {
          const { setJoinRequests } = getCtx();
          setJoinRequests((prev) => [...prev, message]);
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
          setUserCurrentStatus(message);
        },
      },
      {
        destination: `/topic/room/${getCtx().currentRoomId}/participant-update`,
        callback: (message) => {
          const { userCurrentStatus, setUserCurrentStatus, showNotification } = getCtx();

          const oldParticipants = userCurrentStatus.currentRoom?.participants || [];
          const newParticipants = message?.participants || [];

          const removedParticipants = oldParticipants.filter(
              (oldParticipant) =>
                  !newParticipants.some(
                      (newParticipant) => newParticipant.userId === oldParticipant.userId
                  )
          );

          setUserCurrentStatus((prev) => ({ ...prev, currentRoom: message }));

          // If there are removed participants, show a notification for each (safely)
          removedParticipants.forEach(rp => {
            if (rp?.username) {
              showNotification(`${rp.username} has left`, 'warning');
            }
          });
        },
      },
      {
        destination: `/user/queue/game/start`,
        callback: (message) => {
          console.log("startmessage",message)

          const { userCurrentStatus, setPlayerSelf, setGameSession, setValidPlays } = getCtx();

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
            setDeckRotations
          } = ctx;

          console.log('[DRAW] Message received:', message);
          console.log('[DRAW] Reshuffled flag:', message.reshuffled);

          const deckElement = document.querySelector('.deck');
          const deckPosition = deckElement
              ? {
                left:  isMobile ? '45%' : '55%',
                top: isMobile ?'30%':'49%',
              }
              : { left: '50%', top: '50%' };

          //RESHUFFLE HANDLING
          const currentDeckSize = gameSession?.deckSize || 0;
          const willReshuffle = message.reshuffled === true;

          console.log('[DRAW] Deck status:', {
            currentDeckSize,
            newDeckSize: message.deckSize,
            willReshuffle
          });

          // Ha reshuffle lesz, először csökkentjük a deckSize-t 0-ra
          if (willReshuffle && currentDeckSize > 0) {
            setGameSession((prev) => ({
              ...prev,
              deckSize: 0, // Mutatjuk, hogy elfogyott a deck
            }));
          }

          // SELF PLAYER DRAW
          // SELF PLAYER DRAW
          if (message.playerId === playerSelf?.playerId && message.newCard != null) {
            const currentHandCount = (gameSession?.playerHand?.ownCards ?? []).length;

            console.log('[DRAW ANIMATION] Starting self animation', {
              deckPosition,
              currentHandCount,
              newCards: message.newCard.length,
            });

            // calculateDrawAnimation visszaadja az animációkat (delay, duration, stb.) minden kártyához
            const drawAnimations = calculateDrawAnimation(
                message.newCard,
                deckPosition,
                currentHandCount,
                'bottom',
                true,
                isMobile
            );

            //ideiglenesen elokjuk a kartyakat
            const cardElements=document.querySelectorAll(".own-card-container");
            console.log(cardElements,"cardElements-own")

            cardElements.forEach((el,index)=>{
              console.log("cardElements-own",index,cardElements.length+message.newCard.length)
              console.log("cardElements-own",
                  "card",
                  index,
                  "left:",
                  el.style.left,
                  "top:",
                  el.style.top
              );
              let style =getCardStyleForPosition("bottom",index,cardElements.length+message.newCard.length)
              console.log(style,"cardElements-own")

              el.style.left=style.left
            })

            // Megjelenítjük az animációkat (összeset egyszerre)
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
              const cardsToReshuffle = message.deckSize; // Az új deck mérete
              handleReshuffle(
                  cardsToReshuffle-1,
                  deckPosition,
                  calculateReshuffleAnimation,
                  setAnimatingReshuffle,
                  setGameSession,
                  message.deckSize,setDeckRotations
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
            // ... opponent draw logic (hasonlóan)
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
                totalPlayers
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
                dummyCards,
                deckPosition,
                Math.max(0, currentCardCount - cardsDrawn),
                opponentPosition,
                false,
                isMobile,
            );

            //ideiglenesen elokjuk a kartyakat
            const cardElements=document.querySelectorAll(".player-"+message.playerId+"-card");

            cardElements.forEach((el,index)=>{
              const posClass = [...el.classList].find(c => c.startsWith('pos-'));
              const pos = posClass?.replace('pos-', '');
              let style
              console.log("pos",pos)

              switch (pos){
                case "top":
                  style=getCardStyleForPosition(pos,index,cardElements.length+cardsDrawn)
                  el.style.left=style.left
                  break
                case "left":
                  style=getCardStyleForPosition(pos,index,cardElements.length+cardsDrawn)
                  el.style.top=style.top
                  break
                case "right":
                  style=getCardStyleForPosition(pos,index,cardElements.length+cardsDrawn)
                  el.style.top=style.top
                  break
              }

            })

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
                    cardsToReshuffle-1,
                    deckPosition,
                    calculateReshuffleAnimation,
                    setAnimatingReshuffle,
                    setGameSession,
                    message.deckSize,setDeckRotations
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
          const { gameSession,setSkippedPlayers}=getCtx()
            //ace handling

          if(message.newPlayedCards[0].rank==="ACE"){
            console.log('visual only',message.newPlayedCards[0].rank)
            const skippedVisual = computeSkippedPlayersVisual(message,gameSession);

            // kiírás / debug
            console.log('visual only', skippedVisual);
            setSkippedPlayers(skippedVisual)

          }
          console.log('[WS] played-cards incoming', message);

          const incoming = message?.newPlayedCards ?? [];
          if (!incoming || incoming.length === 0) return;

          const { setGameSession, playerSelf } = getCtx();

          // *** Most MÁR hozzáadjuk a saját kártyáinkat is, DE csak ha még nincs a queue-ban ***
          setGameSession((prev) => {
            const queue = Array.isArray(prev?.playedCardsQueue) ? prev.playedCardsQueue : [];

            // Ellenőrizzük hogy már van-e ilyen queue item (ugyanaz a playerId + hasonló timestamp)
            const alreadyExists = queue.some(item =>
                item.playerId === message.playerId &&
                Math.abs(item.receivedAt - Date.now()) < 1000 // 1 másodpercen belül
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
              noMoreCards:message.gameData.noMoreCards,
              drawStack: message.gameData.drawStack,
              finishedPlayers: message.gameData.finishedPlayers,
              isRoundFinished: message.gameData.isRoundFinished,
              lossCount: message.gameData.lossCount,
              lostPlayers: message.gameData.lostPlayers,
              skippedPlayers: message.gameData.skippedPlayers,
              noMoreCardsNextDraw:message.gameData.noMoreCardsNextDraw,
            },
          }));}
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
          const { setGameSession, setValidPlays, setPlayerSelf, setTurn, post, token, setUserCurrentStatus,setSelectedCards,setAnimatingCards,setAnimatingOwnCards,
            setAnimatingDrawCards,setAnimatingReshuffle,setIsNewRound,setDeckRotations,animatingReshuffle} = getCtx();
          console.log("gameEND",message,animatingReshuffle,setAnimatingReshuffle);

          window.location.reload();
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
          const { setSkipTurn,}=getCtx()
          console.log(message);
          if (message.skipTurn && message.skippedPlayerId) {
            setSkipTurn({
              playerId: message.skippedPlayerId,
              seat: message.skippedPlayerSeat,
              timestamp: Date.now()
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
    setSkippedPlayers
  } = useContext(GameSessionContext);
  const { setRooms, joinRequests, setJoinRequests } = useContext(RoomsDataContext);
  const { showNotification } = useContext(NotificationContext);
  const { token } = useContext(TokenContext);
  const { post } = useApiCallHook();
  const { calculateDrawAnimation } = useCalculateDrawAnimation(40);
  const { calculateReshuffleAnimation } = useCalculateReshuffleAnimation();

  const isMobile = useMediaQuery('(max-width: 768px)');

  // keep a ref with the latest context used by callbacks at runtime
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
    setSkippedPlayers
  });

  // keep ref.current up to date when important pieces change
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
      setSkippedPlayers
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
    setSkippedPlayers
  ]);

  useEffect(() => {
    const newUnsubscribeFunctions = [];

    // getCtx returns latest context for callbacks to read at runtime
    const getCtx = () => contextRef.current;

    const pageSubscriptions = getPageSubscriptions(getCtx);
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
    userCurrentStatus?.authenticated,

    subscribe,
  ]);
}

export default UseSubscribeToTopicByPage;
