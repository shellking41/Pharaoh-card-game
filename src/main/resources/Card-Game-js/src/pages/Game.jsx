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
import AnimatingCard from '../components/Game/AnimatingCard.jsx';
import styles from "./styles/Game.module.css";
import useHandleOpponentsCardPlay from "../components/Game/Hooks/useHandleOpponentsCardPlay.js";
import {handleAnimationComplete} from "../components/Game/Utils/handleAnimationComplete.js";
import MobileSelfPlayerHand from "../components/Game/MobileSelfPlayerHand.jsx";
import {useMediaQuery} from "@mui/material";
import TabletSelfPlayerHand from "../components/Game/TabletSelfPlayerHand.jsx";
import DeckCard from "../components/Game/DeckCard.jsx";
import UseCheckIsNewRound from "../components/Game/Hooks/useCheckIsNewRound.js";
import useCheckIsNewRound from "../components/Game/Hooks/useCheckIsNewRound.js";
import NewRoundNotification from "../components/Game/NewRoundNotification.jsx";
// van egy hiba a selectcardsd nak hogy ha kivalasztok egy kartyat, de nem teszem lÃ´e hanem huzok egy kartyat helyette akkor nem engedne maskartyatr letenni csak azt amit kivalasztottam az elozo korbe- kÃ‰sz
// valamiert a viewportol fugg hogy hova teszik le a kartyat a opponensek-kesz
// ha mobil nÃ‰zet van akkor legyen egy jobbrra balra gÃ¶rgethetÅ‘ mezÅ‘ amiben benne vannak a kartyak, fixen-kesz
//todo: a mobil nezetbe is kell kartya letetel es draw animacio, ha levan csukva a taska akkor menjen a huzott kartya a nyilfele es kicsinyitodjon le
//ha nem mi vagyunk a soron akkor addig csukodjon le a taska, majd vissza-kesz
//a self kartyak letÃ´telÃ´nek az animacÃ­oit megcsinalni,-kesz
// tobb kartya letel eltorott-kesz
// amikor letesszuk a akartyat akkor mar elotte mar latszodik a plaed cardnal hogy mar oda tettuk-kesz
//kell info a frontednek arrol hogy uj kÃ¶r kÃ¶vetkezik-kesz
//todo:meg kell irni hogy h alehet akkor a easy bot ne streakeljen
//valmiert ha 3 aszt teszek le es ketten jatszunk akkor nem en jovok ujra hanem az ellenfel-kesz
//todo: az easybot olyan szinre valtson amibol a legkevessebb van neki,
//todo: kikell javiatni azt hogy ne attol fuggjon a ujkor kezdetekor hogy kikezd hogy kijott volna z aelozoben ,mert ha leteszek egy Ã¡szt utolso kartyakaent akjkor valtozik a sorrend
//todo: ha nincs userPlayer jatekban csak botok akkor a botok valtozzanak at ideiglenesen hardbotta hogy  ne tartjos sokaig a jatek
//todo: kezelni kell frontenden az uj kort
//todo: kell frissiten a decksizet rogton a uj kor
//todo: a sajat kartya letÃ‰tel animaciot szebbre kell csinalni
// todo: ha egy ellenfel leteszi a utolso kartyat akkor a kovetkezo korbe nem frissul a init played card
//todo: a kÃ¶vetkezÅ‘ kÃ¶rre kellene jelzÃ©s, ha vÃ©ge a kÃ¶rnek akkor kicsit vÃ¡runk, Ã©s mehet a kÃ¶vetkezÅ‘
//todo: a kartyahuzas animaciot megcsinalni
//todo: amikor leteszi az ellenfel a kartyat akkor legyen kis kartya megfordulas animacio
//todo: a kartya letetel animacio nem onnan indul aahonnan kellene
//todo: legyen jelzes hogy ki van soron, valami highlitinggal
//todo: legyen animacio arrol hogy jelenleg nem mi vagyunk, mondjuk az egÃ©sz pakli elszurkul, es kicsit ledontodik Ã©s ha mi vagyunk akkor meg feldontodik
//todo: legyen a paklinak helye ahonnan felhuzzak a kartyakat
//todo: ha leavelunk akkor a playernek refreshelnie kell ahhoz hogy lÃ¡ssa hogy tenyleg kilÃ©pett, gondolom nincs reshetelve a state
//todo: ha a vÃ©ge a jateknak akkor az animacio elosszor menjen vÃ©gbe,
function Game() {
  const { gameSession, playerSelf, turn, setTurn, setPlayerSelf, setGameSession, selectedCards, setSelectedCards, validPlays } = useContext(GameSessionContext);
  const { gameSessionId } = useParams();
  const { sendMessage } = useWebsocket();
  const { userCurrentStatus } = useContext(UserContext);
  const { token } = useContext(TokenContext);
  const { get, post } = useApiCallHook();
  const { calculateAnimation } = useCalculatePlayAnimation();


  useSubscribeToTopicByPage({ page: 'game' });

  const [changeSuitTo, setChangeSuitTo] = useState('');
  const [animatingCards, setAnimatingCards] = useState([]);
  const [animatingOwnCards,setAnimatingOwnCards]=useState([])
  const draggableHandRef = useRef(null);
  const opponentsCardRefs = useRef({});
  const playedCardRef = useRef(null);
  const animationTimingRef = useRef({ animations: null, totalDelay: 0 });
  const queueRef = useRef([]);                  // mindig tartalmazza a legfrissebb playedCardsQueue-t
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
//todo: ez szétkurja a animaciot
  //const { isNewRound, shouldShowNotification, handleAnimationComplete } = useCheckIsNewRound()

  useEffect(() => {
    const getCurrentTurn = async () => {
      const t = await get('http://localhost:8080/game/current-turn', token);
      setTurn(t);
    };
    getCurrentTurn();
  }, []);

  useEffect(() => {
    // console.log(gameSession?.playedCardsQueue,animatingCards,gameSession?.playedCards,isAnimating,queueRef,animatingQueueItemIdRef,animationLockRef)
    console.log(gameSession?.playedCardsQueue,animatingCards,gameSession?.playedCards,isAnimating)
  }, [gameSession,animatingCards,isAnimating]);


  const drawCard = () => sendMessage('/app/game/draw', { playerId: playerSelf.playerId });

  const handleCardClick = (card) => {
    console.log(card);

    setSelectedCards(prev => {
      // cardId alapjÃ¡n keresÃ¼nk
      const exists = prev.find(c => c.cardId === card.cardId);

      if (exists) {
        // Ha OVER tÃ­pusÃº kÃ¡rtya, akkor speciÃ¡lis logika
        if (prev[0]?.cardId === card.cardId && card.rank !== 'OVER') {
          return [];
        }
        // EltÃ¡volÃ­tÃ¡s cardId alapjÃ¡n
        return prev.filter(c => c.cardId !== card.cardId);
      } else {
        // HozzÃ¡adÃ¡s
        return [...prev, card];
      }
    });
  }

  const playCards = () => {


    //HA van draggablehands Ã©s azokra kell animacio
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
      console.log(playedCardElement.style.left)

      const animations = calculateAnimation(gameSession.playerHand.ownCards.length, selectedCards, playedCardElement.style, '0deg', playerSelf, gameSession.players, playerSelf.seat, gameSession.playerHand.ownCards)

      // const animations = calculateAnimation(
      //     playerHandCount,
      //     dummyCards,
      //     playedCardElement.style,
      //     "0deg",
      //     lastPlayer,
      //     gameSession.players.length,
      //     playerSelf.seat
      // );

      const totalDelay = animations.reduce((max, a) => {
        const finish = (a.delay ?? 0) + (a.duration ?? 0);
        return Math.max(max, finish);
      }, 0);


      // eltÃ¼ntetjÃ¼k a kÃ¡rtyÃ¡kat a kÃ©zbÅ‘l
      selectedCards.forEach(card => {
        const cardElement = cardRefs[card.cardId];

        if (cardElement) cardElement.style.display = 'none';

      });

      setAnimatingOwnCards(prev => [...prev, ...animations]);
      console.log(totalDelay)


      const playCardsData = selectedCards.map(({cardId, suit, rank, ownerId, position}) => ({
        cardId,
        suit,
        rank,
        ownerId,
        position
      }));
      sendMessage('/app/game/play-cards', {
        playCards: playCardsData,
        playerId: playerSelf.playerId, ...(changeSuitTo ? {changeSuitTo} : {})
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

  const initialCards = useMemo(() => gameSession?.playerHand?.ownCards || [], [gameSession?.playerHand?.ownCards]);
  const memoizedAnimatingCards = useMemo(() => animatingCards, [animatingCards]);
  const memoizedAnimatingOwnCards = useMemo(() => animatingOwnCards, [animatingOwnCards]);

  return (
      <div className={styles.game}>
        <div className={styles.playgroundBlock}>
          <PlayGround>
            {isMobile?
                <MobileSelfPlayerHand
                    initialCards={initialCards}
                    selectedCards={selectedCards}
                    handleCardClick={handleCardClick}
                    isAnimating={   queueRef.current.length>0}
                /> :
                isTablet ? <TabletSelfPlayerHand initialCards={initialCards}
                                                 selectedCards={selectedCards}
                                                 handleCardClick={handleCardClick}/> :
                    <DraggableHand
                        initialCards={initialCards}
                        ref={draggableHandRef}
                        isAnimating={   queueRef.current.length>0}

                        selectedCards={selectedCards}
                        onReorder={(newOrder) => setGameSession(prev => ({
                          ...prev,
                          playerHand: {...prev.playerHand, ownCards: newOrder}
                        }))}
                        handleCardClick={handleCardClick}
                    />
            }

            <HungarianCard
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

                // HasznÃ¡ld a player tÃ©nyleges seat Ã©rtÃ©kÃ©t
                const pos = getPlayerPositionBySeat(p.seat, selfSeat, totalPlayers);
                const count = gameSession.playerHand?.otherPlayersCardCount?.[String(p.playerId)] ?? 0;

                return (
                    <div key={`player-${p.playerId}`}>
                      {Array.from({ length: count }).map((_, cardIndex) => {
                        const style = getCardStyleForPosition(pos, cardIndex, count);
                        const refKey = `${p.playerId}-${cardIndex}`;
                        return (
                            <HungarianCard
                                ref={(el) => {
                                  if (el) {
                                    opponentsCardRefs.current[refKey] = el;
                                  }
                                }}
                                key={`p-${p.playerId}-c-${cardIndex}`}
                                cardData={null}
                                left={style.left}
                                right={style.right}
                                top={style.top}
                                bottom={style.bottom}
                                rotate={style.rotate}
                                styleOverride={{ transform: style.transform }}
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

            <div className={"deck"}>
              {Array.from({ length: Number(gameSession?.deckSize) || 0 }).map((_,index)=>(
                  <div>
                    <DeckCard index={index}/>
                  </div>
              ))}
            </div>

            {/*<NewRoundNotification*/}
            {/*    isVisible={shouldShowNotification}*/}
            {/*    onAnimationComplete={handleAnimationComplete}*/}
            {/*/>*/}



          </PlayGround>

        </div>

        <div>Deck size: {gameSession?.deckSize ?? 0}</div>
        <div>PlayedCards size: {gameSession?.playedCardsSize ?? 0}</div>

        <button disabled={!turn?.yourTurn || queueRef.current.length>0} onClick={drawCard}>Draw Card</button>
        <button disabled={selectedCards.length === 0 || !turn?.yourTurn ||  queueRef.current.length>0} onClick={playCards}>Play Cards</button>

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
            <button disabled={queueRef.current.length>0} onClick={() => { sendMessage('/app/game/draw-stack-of-cards', { playerId: playerSelf.playerId }); setPlayerSelf(prev => ({ ...prev, drawStackNumber: null })); }}>
              have to draw: {gameSession?.gameData?.drawStack[playerSelf.playerId]}
            </button>
        )}

        <button onClick={async () => { const response = await post('http://localhost:8080/game/leave', { gameSessionId: gameSession.gameSessionId }, token); console.log(response); setSelectedCards([])}}>Leave</button>
      </div>
  );
}

export default Game;