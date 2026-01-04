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
import PlayerNameBox from "../components/Game/PlayerNameBox.jsx";

// van egy hiba a selectcardsd nak hogy ha kivalasztok egy kartyat, de nem teszem lÃƒÂ´e hanem huzok egy kartyat helyette akkor nem engedne maskartyatr letenni csak azt amit kivalasztottam az elozo korbe- kÃƒâ€°sz
// valamiert a viewportol fugg hogy hova teszik le a kartyat a opponensek-kesz
// ha mobil nÃƒâ€°zet van akkor legyen egy jobbrra balra gÃƒÂ¶rgethetÃ…â€˜ mezÃ…â€˜ amiben benne vannak a kartyak, fixen-kesz
// ha negy kartyat teszek le en akkor nem meg vegig az animacio-kesz
//tudok huzni kartyat mikozben a enemie kartya huzas animacioja van es az beszakitja az animaciot-kesz
// valmiert a reshuffle animacio beragad ha uj gamet inditunk-kesz
//jelenleg rossz helyre mennek a huzott kartyak opponens es selfplayernek is-kesz
// ha ujra enkovetkezek akkor nem tudok lepni (amikor streakelek)-kesz
//todo: amikor jon az uj kor akkor frissditeni kell azt a statet hogy ki fog jonni
//todo: egyet villan a kép amikor leteszunk tobb mint egy kartyat
//todo: amikor tobb kartyat huz fel az ellenfel akkor ugranak egyet az animacio utan a kartyai
//todo: kell egy szamlalot kitenni hogy most milyen sorrendben fognak kimenni a kivvalasztott kartyak
//ha skippel valaki akkor kell jelezni azt valamilyen szinnel a nameboxban-kesz
//valamiert nem fut le a opponens kartya letetelenek az animacioja--kesz
//todo: ha uj kor van akkor kesleltetve frissuljelen a playerhandek
//todo: ha telefon nezet van akkor legyenek kissebbek a kartyak
//todo: a mobil nezetbe is kell kartya letetel es draw animacio, ha levan csukva a taska akkor menjen a huzott kartya a nyilfele es kicsinyitodjon le
//todo: kell a last card shuffle animaciojat megcsinalni,
//a blokkolas animaciot meg kell csinaln-kezs
//todo: a szinvaltas animaciot megkell csinalni
//blokolast es azt hogy kivan koron animaciot ugy meglehetne csinalni hogy lesznek szoveg buborekok  a card handek felett es azokba  aplayerek nevei bennelesznek, majd arra kell egy "X" es egy mas szinnel mejeloles animacio
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
//kell frissiten a decksizet rogton a uj kor-kesz
// a sajat kartya letÃƒâ€°tel animaciot szebbre kell csinalni-kesz
//ha egy ellenfel leteszi a utolso kartyat akkor a kovetkezo korbe nem frissul a init played card-kesz
//a kartyahuzas animaciot megcsinalni-kesz
//amikor leteszi az ellenfel a kartyat akkor legyen kis kartya megfordulas animacio-kesz
//a kartya letetel animacio nem onnan indul aahonnan kellene-kesz
//legyen jelzes hogy ki van soron, valami highlitinggal-kesz
// legyen a paklinak helye ahonnan felhuzzak a kartyakat-kesz
//ha leavelunk akkor a playernek refreshelnie kell ahhoz hogy lÃƒÂ¡ssa hogy tenyleg kilÃƒÂ©pett, gondolom nincs reshetelve a state-kesz
//todo: ha a vÃƒÂ©ge a jateknak akkor az animacio elosszor menjen vÃƒÂ©gbe,
function Game() {
  const { gameSession, playerSelf, turn, setTurn, setPlayerSelf, setGameSession, selectedCards, setSelectedCards, validPlays,animatingDrawCards,setAnimatingDrawCards,animatingReshuffle,
    setAnimatingReshuffle,setDeckRotations ,deckRotations } = useContext(GameSessionContext);
  const { gameSessionId } = useParams();
  const { sendMessage } = useWebsocket();
  const { userCurrentStatus,setUserCurrentStatus } = useContext(UserContext);
  const { token } = useContext(TokenContext);
  const { get, post } = useApiCallHook();
  const { calculateAnimation } = useCalculatePlayAnimation();
  const { calculateDrawAnimation } = useCalculateDrawAnimation();


  useSubscribeToTopicByPage({ page: 'game' });

  const [changeSuitTo, setChangeSuitTo] = useState('');
  const [animatingCards, setAnimatingCards] = useState([]);
  const [leave, setLeave] = useState(false);

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
  const [lastDeckCardAnimated, setLastDeckCardAnimated] = useState(false);
  const lastDeckKeyRef = useRef(null);

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

  const { isNewRound, shouldShowNotification, handleNextRoundAnimationComplete,setIsNewRound } = useCheckIsNewRound();

  useEffect(() => {
    setAnimatingReshuffle([])
  }, []);

  useEffect(() => {
    const getCurrentTurn = async () => {
      const t = await get('http://localhost:8080/game/current-turn', token);
      setTurn(t);
    };
    getCurrentTurn();
  }, []);


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

// Game.jsx - playCards function
  const playCards = () => {
    const cardRefs = draggableHandRef.current?.getCardRefs();
    if (!cardRefs) return;

    const playedCardElement = playedCardRef.current;
    if (!playedCardElement) {
      console.error('Played card element not found');
      return;
    }

    console.log('[PLAY CARDS] Starting animation for cards:', selectedCards.map(c => c.cardId));

    // Számítsd ki az animációkat
    const animations = calculateAnimation(
        gameSession.playerHand.ownCards.length,
        selectedCards,
        playedCardElement.style,
        '0deg',
        playerSelf,
        gameSession.players.length,
        playerSelf.seat,
        gameSession.playerHand.ownCards
    );

    console.log('[PLAY CARDS] Generated animations:', animations.length);

    // Elrejtjük a kártyákat
    selectedCards.forEach(card => {
      const cardElement = cardRefs[card.cardId];
      if (cardElement) {
        cardElement.style.display = 'none';
      }
    });

    // *** Hozzáadjuk a saját kártyáinkat is a queue-hoz ***
    // Így az animáció végén frissül a playedCards
    setGameSession(prev => {
      const entry = {
        id: `${playerSelf.playerId}-${Date.now()}`,
        playerId: playerSelf.playerId,
        cards: selectedCards,
        receivedAt: Date.now(),
      };

      return {
        ...prev,
        playedCardsQueue: [...(prev.playedCardsQueue || []), entry],
      };
    });

    // Hozzáadjuk az animációkat
    setAnimatingOwnCards(prev => [...prev, ...animations]);

    // Backend értesítés
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
        totalCards
    );
  }, []);

  useEffect(() => {
    if(leave) {
      setLeave(false)
      setSelectedCards([]);
      setAnimatingCards([])
      setAnimatingOwnCards([])
      setAnimatingDrawCards([])
      setAnimatingReshuffle([])
      setGameSession({})
      setIsNewRound(false)
      setUserCurrentStatus((prev)=>({...prev,currentRoom:prev.managedRoom?prev.currentRoom:null}))
      setDeckRotations([])
    }
  }, [leave]);

  useEffect(() => {
    console.log("gameSession",gameSession,turn)

  }, [gameSession,turn]);

  useEffect(() => {
    console.log(animatingReshuffle,"animatingReshuffle")

  }, [animatingReshuffle]);
  const initialCards = useMemo(() => gameSession?.playerHand?.ownCards || [], [gameSession?.playerHand?.ownCards]);
  const memoizedAnimatingCards = useMemo(() => animatingCards, [animatingCards]);
  const memoizedAnimatingOwnCards = useMemo(() => animatingOwnCards, [animatingOwnCards]);
  const memoizedAnimatingDrawCards = useMemo(() => animatingDrawCards, [animatingDrawCards]);
  const memoizedAnimatingReshuffle = useMemo(() => animatingReshuffle, [animatingReshuffle]);

  useEffect(() => {
    console.log(!turn?.yourTurn || queueRef.current.length > 0 || animatingDrawCards.length>0,'!!!!!!!!!!!!!!!!!!!')
    console.log(queueRef.current.length > 0,'!!!!!!!!!!!!!!!!!!!')
    console.log(queueRef.current,'!!!!!!!!!!!!!!!!!!!')


  }, [turn,animatingDrawCards,queueRef]);


  useEffect(() => {
    const deckSize = Number(gameSession?.deckSize - animatingDrawCards.length);
    const noMoreCardsNextDraw = gameSession?.gameData?.noMoreCardsNextDraw;
    const currentRound = gameSession?.gameData?.currentRound;

    // Új key generálás ha új kör van vagy deck állapot változik
    const newKey = `deck-last-card-${currentRound || 0}`;

    // Ha változott a kulcs vagy a feltételek, reseteljük
    if (lastDeckKeyRef.current !== newKey || (deckSize === 0 && !noMoreCardsNextDraw)) {
      lastDeckKeyRef.current = newKey;
      setLastDeckCardAnimated(false);
    }
  }, [gameSession?.deckSize, animatingDrawCards.length, gameSession?.gameData?.noMoreCardsNextDraw, gameSession?.gameData?.currentRound]);


// Callback az animáció befejezéséhez
  const handleLastDeckCardAnimationComplete = useCallback(() => {
    setLastDeckCardAnimated(true);
  }, []);
  useEffect(() => {
    console.log(isMobile)

  }, [isMobile]);
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
            {!(isMobile || isTablet) && <div className={styles.playerNameContainer}>
              <PlayerNameBox playerName={playerSelf.playerName} pos={"bottom"}  isYourTurn={playerSelf.seat === turn.currentSeat}
                             playerId={playerSelf.playerId}
                             seat={playerSelf.seat}/>
            </div>}

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
                      <div className={styles.playerNameContainer}>
                        <PlayerNameBox
                            playerName={p.playerName}
                            pos={pos}
                            isYourTurn={p.seat === turn.currentSeat}
                            playerId={p.playerId}
                            seat={p.seat}
                        />
                      </div>
                      {Array.from({ length: count }).map((_, cardIndex) => {
                        const style = getCardStyleForPosition(pos, cardIndex + 1, count);
                        const refKey = `${p.playerId}-${cardIndex}`;
                        const stableKey = `opponent-${p.playerId}-card-${cardIndex}`;


                        return (
                            <HungarianCard
                                ref={(el) => {
                                  if (el) {
                                    opponentsCardRefs.current[refKey] = el;
                                  }
                                }}
                                key={stableKey}
                                zIndex={cardIndex*10}
                                player={{playerId:p.playerId,pos:pos}}
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
                    linear={true}
                    onComplete={() => handleAnimationCompleteWrapper(anim.card.cardId, false)}
                />
            ))}

            {memoizedAnimatingOwnCards.map(anim => (
                <AnimatingCard
                    key={anim.card.refKey}
                    card={anim.card}
                    linear={false}
                    waypoints={anim.waypoints}
                    duration={anim.duration}
                    delay={anim.delay}
                    onComplete={() => handleAnimationCompleteWrapper(anim.card.cardId, true)}
                />
            ))}

            {memoizedAnimatingDrawCards.map((anim,index) => (
                <AnimatingCard
                    key={anim.card.refKey}
                    card={anim.card}
                    waypoints={anim.waypoints}
                    linear={false}
                    duration={anim.duration}
                    delay={anim.delay}
                    zIndex={100000 + index}
                    onComplete={() => handleDrawAnimationCompleteWrapper(anim.card.cardId)}
                />
            ))}
            {memoizedAnimatingReshuffle.map((anim,index) => (
                <AnimatingCard
                    key={anim.card.refKey}
                    card={anim.card}
                    waypoints={anim.waypoints}
                    linear={true}
                    rotation={deckRotations[index]}
                    duration={anim.duration}
                    zIndex={100000*(index+10)}
                    delay={anim.delay}
                    onComplete={() => handleReshuffleAnimationCompleteWrapper(anim.card.index, memoizedAnimatingReshuffle.length)}
                />
            ))}

            <div className={"deck"} ref={deckRef}>
              {(() => {
                const deckSize = Number(gameSession?.deckSize - animatingDrawCards.length);
                const noMoreCardsNextDraw = gameSession?.gameData?.noMoreCardsNextDraw;
                const currentRound = gameSession?.gameData?.currentRound || 0;

                // Ha van normál deck
                if (deckSize > 0 ) {

                  console.log(deckRotations)
                  return Array.from({ length: deckSize }).map((_, index) => (

                      <div key={`deck-${currentRound}-${index}`}>
                        <DeckCard
                            index={index}
                            rotation={deckRotations && deckRotations[index]}
                            isMobile={isMobile}
                        />
                      </div>
                  ));
                }

                // Ha nincs deck de kellene lennie egy utolsó kártyának (noMoreCardsNextDraw === false)
                if (!noMoreCardsNextDraw && animatingDrawCards.length===0) {
                  return (
                      <div key={`deck-last-card-${currentRound} special-deck-card`}>
                        <DeckCard
                            index={0}
                            rotation={deckRotations?.[0] || '0deg'}
                            shouldAnimate={!lastDeckCardAnimated}
                            isMobile={isMobile}
                            onAnimationComplete={handleLastDeckCardAnimationComplete}
                        />
                      </div>
                  );
                }

                // Ha tényleg nincs több kártya
                return null;
              })()}
            </div>

            <NewRoundNotification
                isVisible={shouldShowNotification}
                onAnimationComplete={handleNextRoundAnimationComplete}
            />

          </PlayGround>
        </div>

        <div>Deck size: {gameSession?.deckSize ?? 0}</div>
        <div>PlayedCards size: {gameSession?.playedCardsSize ?? 0}</div>

        <button disabled={!turn?.yourTurn || queueRef.current.length > 0 || animatingDrawCards.length>0} onClick={()=>{drawCard();}
        }>Draw Card</button>
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
        {(gameSession?.gameData?.noMoreCards|| gameSession?.gameData?.noMoreCardsNextDraw) &&
            turn?.yourTurn &&
            validPlays.length === 0 && (
                <button
                    disabled={queueRef.current.length > 0}
                    onClick={() => {
                      sendMessage("/app/game/skip", {playerId: playerSelf.playerId})
                    }}
                >
                  Skip Turn (No cards available)
                </button>
            )}

        <button onClick={async () => {
          const response = await post('http://localhost:8080/game/leave', { gameSessionId: gameSession.gameSessionId }, token);
          console.log(response);
          setLeave(true)

        }}>Leave</button>
      </div>
  );
}

export default Game;