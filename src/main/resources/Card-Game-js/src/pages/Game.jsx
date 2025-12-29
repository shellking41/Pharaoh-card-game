import React, {useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import { GameSessionContext } from '../Contexts/GameSessionContext.jsx';
import { useParams } from 'react-router-dom';
import useWebsocket from '../hooks/useWebsocket.js';
import useSubscribeToTopicByPage from '../hooks/useSubscribeToTopicByPage.js';
import HungarianCard, { getPlayerPositionBySeat, getCardStyleForPosition } from '../components/Game/HungarianCard.jsx';
import { useApiCallHook } from '../hooks/useApiCallHook.js';
import { TokenContext } from '../Contexts/TokenContext.jsx';
import { UserContext } from '../Contexts/UserContext.jsx';
import PlayGround from '../components/Game/PlayGround.jsx';
import DraggableHand from '../components/Game/DraggableHand.jsx';
import useCalculatePlayAnimation from "../components/Game/Hooks/useCalculatePlayAnimation.js";
import useCalculateDrawAnimation from "../components/Game/Hooks/useCalculateDrawAnimation.js";
import AnimatingCard from '../components/Game/AnimatingCard.jsx';
import styles from "./styles/Game.module.css";
import useHandleOpponentsCardPlay from "../components/Game/Hooks/useHandleOpponentsCardPlay.js";
import {handleAnimationComplete} from "../components/Game/Utils/handleAnimationComplete.js";
import {handleDrawAnimationComplete} from "../components/Game/Utils/handleDrawAnimationComplete.js";
import MobileSelfPlayerHand from "../components/Game/MobileSelfPlayerHand.jsx";
import {useMediaQuery} from "@mui/material";
import TabletSelfPlayerHand from "../components/Game/TabletSelfPlayerHand.jsx";
import DeckCard from "../components/Game/DeckCard.jsx";
import useCheckIsNewRound from "../components/Game/Hooks/useCheckIsNewRound.js";
import NewRoundNotification from "../components/Game/NewRoundNotification.jsx";
import { handleReshuffleAnimationComplete } from "../components/Game/Utils/handleReshuffleAnimationComplete.js";

// van egy hiba a selectcardsd nak hogy ha kivalasztok egy kartyat, de nem teszem lÃƒÂ´e hanem huzok egy kartyat helyette akkor nem engedne maskartyatr letenni csak azt amit kivalasztottam az elozo korbe- kÃƒâ€°sz
// valamiert a viewportol fugg hogy hova teszik le a kartyat a opponensek-kesz
// ha mobil nÃƒâ€°zet van akkor legyen egy jobbrra balra gÃƒÂ¶rgethetÃ…â€˜ mezÃ…â€˜ amiben benne vannak a kartyak, fixen-kesz
//todo: ha negy kartyat teszek le en akkor nem meg vegig az animacio
//todo: tudok huzni kartyat mikozben a enemie kartya huzas animacioja van es az beszakitja az animaciot
//todo: jelenleg rossz helyre mennek a huzott kartyak opponens es selfplayernek is
//todo: ha uj kor van akkor kesleltetve frissuljelen a playerhandek
//todo: a mobil nezetbe is kell kartya letetel es draw animacio, ha levan csukva a taska akkor menjen a huzott kartya a nyilfele es kicsinyitodjon le
//ha nem mi vagyunk a soron akkor addig csukodjon le a taska, majd vissza-kesz
//a self kartyak letÃƒÂ´telÃƒÂ´nek az animacÃƒÂ­oit megcsinalni,-kesz
// tobb kartya letel eltorott-kesz
// amikor letesszuk a akartyat akkor mar elotte mar latszodik a plaed cardnal hogy mar oda tettuk-kesz
//kell info a frontednek arrol hogy uj kÃƒÂ¶r kÃƒÂ¶vetkezik-kesz
//todo:meg kell irni hogy h alehet akkor a easy bot ne streakeljen
//valmiert ha 3 aszt teszek le es ketten jatszunk akkor nem en jovok ujra hanem az ellenfel-kesz
//todo: az easybot olyan szinre valtson amibol a legkevessebb van neki,
//todo: kikell javiatni azt hogy ne attol fuggjon a ujkor kezdetekor hogy kikezd hogy kijott volna z aelozoben ,mert ha leteszek egy ÃƒÂ¡szt utolso kartyakaent akjkor valtozik a sorrend
//todo: ha nincs userPlayer jatekban csak botok akkor a botok valtozzanak at ideiglenesen hardbotta hogy  ne tartjos sokaig a jatek
//kezelni kell frontenden az uj kort-kesz
//todo: kell frissiten a decksizet rogton a uj kor
//todo: a sajat kartya letÃƒâ€°tel animaciot szebbre kell csinalni
//ha egy ellenfel leteszi a utolso kartyat akkor a kovetkezo korbe nem frissul a init played card-kesz
//a kartyahuzas animaciot megcsinalni-kesz
//amikor leteszi az ellenfel a kartyat akkor legyen kis kartya megfordulas animacio-kesz
//a kartya letetel animacio nem onnan indul aahonnan kellene-kesz
//todo: legyen jelzes hogy ki van soron, valami highlitinggal
//todo: legyen animacio arrol hogy jelenleg nem mi vagyunk, mondjuk az egÃƒÂ©sz pakli elszurkul, es kicsit ledontodik ÃƒÂ©s ha mi vagyunk akkor meg feldontodik
//legyen a paklinak helye ahonnan felhuzzak a kartyakat-kesz
//todo: ha leavelunk akkor a playernek refreshelnie kell ahhoz hogy lÃƒÂ¡ssa hogy tenyleg kilÃƒÂ©pett, gondolom nincs reshetelve a state
//todo: ha a vÃƒÂ©ge a jateknak akkor az animacio elosszor menjen vÃƒÂ©gbe,
function Game() {
  const { gameSession, playerSelf, turn, setTurn, setPlayerSelf, setGameSession, selectedCards, setSelectedCards, validPlays,animatingDrawCards,setAnimatingDrawCards,animatingReshuffle,
    setAnimatingReshuffle,setDeckRotations ,deckRotations } = useContext(GameSessionContext);
  const { gameSessionId } = useParams();
  const { sendMessage } = useWebsocket();
  const { userCurrentStatus } = useContext(UserContext);
  const { token } = useContext(TokenContext);
  const { get, post } = useApiCallHook();
  const { calculateAnimation } = useCalculatePlayAnimation();
  const { calculateDrawAnimation } = useCalculateDrawAnimation();


  useSubscribeToTopicByPage({ page: 'game' });

  const [changeSuitTo, setChangeSuitTo] = useState('');
  const [animatingCards, setAnimatingCards] = useState([]);
  const [animatingOwnCards, setAnimatingOwnCards] = useState([]);
  const draggableHandRef = useRef(null);
  const opponentsCardRefs = useRef({});
  const playedCardRef = useRef(null);
  const deckRef = useRef(null);
  const animationTimingRef = useRef({ animations: null, totalDelay: 0 });
  const queueRef = useRef([]);
  const animationLockRef = useRef(false);
  const animatingQueueItemIdRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-height: 769px)');

  const { attemptStartNextWithQueue } = useHandleOpponentsCardPlay(
      animationLockRef,
      setGameSession,
      gameSession,
      playerSelf,
      playedCardRef,
      animationTimingRef,
      setAnimatingCards,
      queueRef,
      setIsAnimating,
      animatingQueueItemIdRef,
      calculateAnimation,
  );

  const { isNewRound, shouldShowNotification, handleNextRoundAnimationComplete } = useCheckIsNewRound();

  useEffect(() => {
    const getCurrentTurn = async () => {
      const t = await get('http://localhost:8080/game/current-turn', token);
      setTurn(t);
    };
    getCurrentTurn();
  }, []);

  useEffect(() => {
    console.log(gameSession?.playedCardsQueue, animatingCards, gameSession?.playedCards, isAnimating);
  }, [gameSession, animatingCards, isAnimating]);

  useEffect(() => {
    if(isNewRound){
      const getCurrentState = async () => {
        const response = await get('http://localhost:8080/game/state', token);
        setTimeout(() => {
          setGameSession(response);
        }, 1000);
      };
      getCurrentState();
    }
  }, [isNewRound]);

  const drawCard = () => sendMessage('/app/game/draw', { playerId: playerSelf.playerId });

  const handleCardClick = (card) => {
    console.log(card);

    setSelectedCards(prev => {
      const exists = prev.find(c => c.cardId === card.cardId);

      if (exists) {
        if (prev[0]?.cardId === card.cardId && card.rank !== 'OVER') {
          return [];
        }
        return prev.filter(c => c.cardId !== card.cardId);
      } else {
        return [...prev, card];
      }
    });
  };

  const playCards = () => {
    const cardRefs = draggableHandRef.current?.getCardRefs();
    if (cardRefs) {
      const playedCardElement = playedCardRef.current;
      if (!playedCardElement) {
        console.error('Played card element not found');
        animationLockRef.current = false;
        setIsAnimating(false);
        animatingQueueItemIdRef.current = null;
        return;
      }

      const animations = calculateAnimation(
          gameSession.playerHand.ownCards.length,
          selectedCards,
          playedCardElement.style,
          '0deg',
          playerSelf,
          gameSession.players,
          playerSelf.seat,
          gameSession.playerHand.ownCards
      );

      const totalDelay = animations.reduce((max, a) => {
        const finish = (a.delay ?? 0) + (a.duration ?? 0);
        return Math.max(max, finish);
      }, 0);

      selectedCards.forEach(card => {
        const cardElement = cardRefs[card.cardId];
        if (cardElement) cardElement.style.display = 'none';
      });

      setAnimatingOwnCards(prev => [...prev, ...animations]);
      console.log(totalDelay);

      const playCardsData = selectedCards.map(({cardId, suit, rank, ownerId, position}) => ({
        cardId,
        suit,
        rank,
        ownerId,
        position
      }));

      sendMessage('/app/game/play-cards', {
        playCards: playCardsData,
        playerId: playerSelf.playerId,
        ...(changeSuitTo ? {changeSuitTo} : {})
      });

      setSelectedCards([]);
      setChangeSuitTo(null);
    }
  };

  const handleAnimationCompleteWrapper = useCallback((cardId, ownCards) => {
    handleAnimationComplete(
        cardId,
        setAnimatingCards,
        setGameSession,
        animatingQueueItemIdRef,
        animationLockRef,
        setIsAnimating,
        animationTimingRef,
        queueRef,
        attemptStartNextWithQueue,
        ownCards,
        setAnimatingOwnCards,
        animatingOwnCards,
        gameSession
    );
  }, []);

  const handleDrawAnimationCompleteWrapper = useCallback((cardId) => {
    handleDrawAnimationComplete(
        cardId,
        setAnimatingDrawCards,
        setGameSession
    );
  }, []);

  const handleReshuffleAnimationCompleteWrapper = useCallback((index, totalCards) => {
    handleReshuffleAnimationComplete(
        index,
        setAnimatingReshuffle,
        setGameSession,
        setDeckRotations,
        totalCards
    );
  }, []);

  console.log(queueRef.current);

  useEffect(() => {
    console.log("gameSession",gameSession)

  }, [gameSession]);


  const initialCards = useMemo(() => gameSession?.playerHand?.ownCards || [], [gameSession?.playerHand?.ownCards]);
  const memoizedAnimatingCards = useMemo(() => animatingCards, [animatingCards]);
  const memoizedAnimatingOwnCards = useMemo(() => animatingOwnCards, [animatingOwnCards]);
  const memoizedAnimatingDrawCards = useMemo(() => animatingDrawCards, [animatingDrawCards]);
  const memoizedAnimatingReshuffle = useMemo(() => animatingReshuffle, [animatingReshuffle]);


  return (
      <div className={styles.game}>
        <div className={styles.playgroundBlock}>
          <PlayGround>
            {isMobile ?
                <MobileSelfPlayerHand
                    initialCards={initialCards}
                    selectedCards={selectedCards}
                    handleCardClick={handleCardClick}
                    isAnimating={queueRef.current.length > 0}
                /> :
                isTablet ? <TabletSelfPlayerHand
                        initialCards={initialCards}
                        selectedCards={selectedCards}
                        isAnimating={queueRef.current.length > 0}
                        handleCardClick={handleCardClick}
                    /> :
                    <DraggableHand
                        initialCards={initialCards}
                        ref={draggableHandRef}
                        isAnimating={queueRef.current.length > 0}
                        selectedCards={selectedCards}
                        onReorder={(newOrder) => setGameSession(prev => ({
                          ...prev,
                          playerHand: {...prev.playerHand, ownCards: newOrder}
                        }))}
                        handleCardClick={handleCardClick}
                    />
            }

            <HungarianCard
                data-played-card={"data-played-card"}
                ref={playedCardRef}
                cardData={gameSession.playedCards?.at(-1)}
                left="45%"
                top="50%"
                styleOverride={{transform: 'translate(-50%, -50%)', zIndex: 500}}
            />

            {(() => {
              const players = gameSession.players || [];
              const selfPlayer = players.find(p => p.playerId === playerSelf.playerId);
              const selfSeat = selfPlayer?.seat || 0;
              const totalPlayers = players.length;

              return players.map((p) => {
                if (p.playerId === playerSelf.playerId) return null;

                const pos = getPlayerPositionBySeat(p.seat, selfSeat, totalPlayers);
                const count = gameSession.playerHand?.otherPlayersCardCount?.[String(p.playerId)] ?? 0;

                return (
                    <div key={`player-${p.playerId}`}>
                      {Array.from({ length: count }).map((_, cardIndex) => {
                        const style = getCardStyleForPosition(pos, cardIndex, count);
                        const refKey = `${p.playerId}-${cardIndex}`;
                        const stableKey = `opponent-${p.playerId}-card-${cardIndex}`;
                        console.log(cardIndex)

                        return (
                            <HungarianCard
                                ref={(el) => {
                                  if (el) {
                                    opponentsCardRefs.current[refKey] = el;
                                  }
                                }}
                                key={stableKey}
                                cardData={null}
                                left={style.left}
                                right={style.right}
                                top={style.top}
                                bottom={style.bottom}
                                rotate={style.rotate}
                                styleOverride={{
                                  transform: style.transform,
                                  transition: 'all 0.3s ease-in-out'
                                }}
                            />
                        );
                      })}
                    </div>
                );
              });
            })()}

            {memoizedAnimatingCards.map(anim => (
                <AnimatingCard
                    key={anim.card.refKey}
                    card={anim.card}
                    waypoints={anim.waypoints}
                    duration={anim.duration}
                    delay={anim.delay}
                    onComplete={() => handleAnimationCompleteWrapper(anim.card.cardId, false)}
                />
            ))}

            {memoizedAnimatingOwnCards.map(anim => (
                <AnimatingCard
                    key={anim.card.refKey}
                    card={anim.card}
                    waypoints={anim.waypoints}
                    duration={anim.duration}
                    delay={anim.delay}
                    onComplete={() => handleAnimationCompleteWrapper(anim.card.cardId, true)}
                />
            ))}

            {memoizedAnimatingDrawCards.map(anim => (
                <AnimatingCard
                    key={anim.card.refKey}
                    card={anim.card}
                    waypoints={anim.waypoints}
                    duration={anim.duration}
                    delay={anim.delay}
                    onComplete={() => handleDrawAnimationCompleteWrapper(anim.card.cardId)}
                />
            ))}
            {memoizedAnimatingReshuffle.map((anim, _, arr) => (
                <AnimatingCard
                    key={anim.card.index}
                    card={anim.card}
                    waypoints={anim.waypoints}
                    duration={anim.duration}
                    zIndex={anim.zIndex}
                    delay={anim.delay}
                    onComplete={() => handleReshuffleAnimationCompleteWrapper(anim.card.index, arr.length)}
                />
            ))}

            <div className={"deck"} ref={deckRef}>
              {Array.from({ length: Number(gameSession?.deckSize) || (gameSession.gameData?.noMoreCardsNextDraw?0:1) }).map((_, index) => (
                  <div key={index}>
                    <DeckCard index={index} rotation={deckRotations && deckRotations[index] }/>
                  </div>
              ))}
            </div>

            <NewRoundNotification
                isVisible={shouldShowNotification}
                onAnimationComplete={handleNextRoundAnimationComplete}
            />

          </PlayGround>
        </div>

        <div>Deck size: {gameSession?.deckSize ?? 0}</div>
        <div>PlayedCards size: {gameSession?.playedCardsSize ?? 0}</div>

        <button disabled={!turn?.yourTurn || queueRef.current.length > 0} onClick={drawCard}>Draw Card</button>
        <button disabled={selectedCards.length === 0 || !turn?.yourTurn || queueRef.current.length > 0} onClick={playCards}>Play Cards</button>

        {turn?.currentSeat && <div>Current seat: {turn.currentSeat}</div>}

        {selectedCards[selectedCards.length - 1]?.rank === 'OVER' && (
            <div>
              <button onClick={() => setChangeSuitTo('HEARTS')} style={{ backgroundColor: 'red', width: '50px', height: '50px' }}></button>
              <button onClick={() => setChangeSuitTo('ACORNS')} style={{ backgroundColor: 'orange', width: '50px', height: '50px' }}></button>
              <button onClick={() => setChangeSuitTo('BELLS')} style={{ backgroundColor: 'brown', width: '50px', height: '50px' }}></button>
              <button onClick={() => setChangeSuitTo('LEAVES')} style={{ backgroundColor: 'green', width: '50px', height: '50px' }}></button>
            </div>
        )}

        {gameSession?.gameData?.drawStack?.[playerSelf.playerId] && (
            <button disabled={queueRef.current.length > 0} onClick={() => {
              sendMessage('/app/game/draw-stack-of-cards', { playerId: playerSelf.playerId });
              setPlayerSelf(prev => ({ ...prev, drawStackNumber: null }));
            }}>
              have to draw: {gameSession?.gameData?.drawStack[playerSelf.playerId]}
            </button>
        )}

        <button onClick={async () => {
          const response = await post('http://localhost:8080/game/leave', { gameSessionId: gameSession.gameSessionId }, token);
          console.log(response);
          setSelectedCards([]);
        }}>Leave</button>
      </div>
  );
}

export default Game;