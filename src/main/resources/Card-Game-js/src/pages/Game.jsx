import React, {useContext, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
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
// van egy hiba a selectcardsd nak hogy ha kivalasztok egy kartyat, de nem teszem lôe hanem huzok egy kartyat helyette akkor nem engedne maskartyatr letenni csak azt amit kivalasztottam az elozo korbe- kÉsz
// valamiert a viewportol fugg hogy hova teszik le a kartyat a opponensek-kesz
// ha mobil nÉzet van akkor legyen egy jobbrra balra görgethető mező amiben benne vannak a kartyak, fixen-kesz
//todo: a mobil nezetbe is kell kartya letetel es draw animacio, ha levan csukva a taska akkor menjen a huzott kartya a nyilfele es kicsinyitodjon le
//ha nem mi vagyunk a soron akkor addig csukodjon le a taska, majd vissza-kesz
//a self kartyak letôtelônek az animacíoit megcsinalni,-kesz
// todo: ha egy ellenfel leteszi a utolso kartyat akkor a kovetkezo korbe nem frissul a init played card
//todo: a következő körre kellene jelzés, ha vége a körnek akkor kicsit várunk, és mehet a következő
//todo: a kartyahuzas animaciot megcsinalni
//todo: amikor leteszi az ellenfel a kartyat akkor legyen kis kartya megfordulas animacio
//todo: a kartya letetel animacio nem onnan indul aahonnan kellene
//todo: legyen jelzes hogy ki van soron, valami highlitinggal
//todo: legyen animacio arrol hogy jelenleg nem mi vagyunk, mondjuk az egész pakli elszurkul, es kicsit ledontodik és ha mi vagyunk akkor meg feldontodik
//todo: legyen a paklinak helye ahonnan felhuzzak a kartyakat
//todo: ha leavelunk akkor a playernek refreshelnie kell ahhoz hogy lássa hogy tenyleg kilépett, gondolom nincs reshetelve a state
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
  const prevCardCountsRef = useRef({});
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
    calculateAnimation
  );

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
      // cardId alapján keresünk
      const exists = prev.find(c => c.cardId === card.cardId);

      if (exists) {
        // Ha OVER típusú kártya, akkor speciális logika
        if (prev[0]?.cardId === card.cardId && card.rank !== 'OVER') {
          return [];
        }
        // Eltávolítás cardId alapján
        return prev.filter(c => c.cardId !== card.cardId);
      } else {
        // Hozzáadás
        return [...prev, card];
      }
    });
  }

  const playCards = () => {


    //HA van draggablehands és azokra kell animacio
    const cardRefs = draggableHandRef.current?.getCardRefs();
    if (cardRefs){




      const playedCardElement = playedCardRef.current;
      if (!playedCardElement) {
        console.error('Played card element not found');
        animationLockRef.current = false;
        setIsAnimating(false);
        animatingQueueItemIdRef.current = null;
        return;
      }
      console.log(playedCardElement.style.left)

      const animations =   calculateAnimation(gameSession.playerHand.ownCards.length,selectedCards,playedCardElement.style,'0deg',playerSelf,gameSession.players,playerSelf.seat,gameSession.playerHand.ownCards)

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


      // eltüntetjük a kártyákat a kézből
       selectedCards.forEach(card => {
         const cardElement = cardRefs[card.cardId];

        if (cardElement) cardElement.style.display = 'none';

       });

      setAnimatingOwnCards(prev => [...prev, ...animations]);



      setTimeout(() => {
        const playCardsData = selectedCards.map(({ cardId, suit, rank, ownerId, position }) => ({ cardId, suit, rank, ownerId, position }));
        sendMessage('/app/game/play-cards', { playCards: playCardsData, playerId: playerSelf.playerId, ...(changeSuitTo ? { changeSuitTo } : {}) });
        setSelectedCards([]);
        setChangeSuitTo(null);
      }, totalDelay);
    };
  };

  const handleAnimationCompleteWrapper = (cardId,ownCards) => {
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
        animatingOwnCards
    );
  };

  const initialCards = useMemo(() => gameSession?.playerHand?.ownCards || [], [gameSession?.playerHand?.ownCards]);

  return (
      <div className={styles.game}>
        <div className={styles.playgroundBlock}>
          <PlayGround>
            {isMobile?
                <MobileSelfPlayerHand
                initialCards={initialCards}
                selectedCards={selectedCards}
                handleCardClick={handleCardClick}
            /> :
                isTablet ? <TabletSelfPlayerHand initialCards={initialCards}
                                                 selectedCards={selectedCards}
                                                 handleCardClick={handleCardClick}/> :
                <DraggableHand
                initialCards={initialCards}
                ref={draggableHandRef}
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

                // Használd a player tényleges seat értékét
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

            {animatingCards.map(anim => (
                <AnimatingCard
                    key={anim.card.refKey}
                    card={anim.card}
                    from={anim.from}
                    to={anim.to}
                    duration={anim.duration}
                    delay={anim.delay}
                    startRotation={anim.startRotation}
                    targetRotation={anim.targetRotation}
                    onComplete={()=>handleAnimationCompleteWrapper(anim.card.cardId,false)}
                />
            ))}

            {animatingOwnCards.map(anim => (
                <AnimatingCard
                    key={anim.card.refKey}
                    card={anim.card}
                    from={anim.from}
                    to={anim.to}
                    duration={anim.duration}
                    delay={anim.delay}
                    startRotation={anim.startRotation}
                    targetRotation={anim.targetRotation}
                    onComplete={()=>handleAnimationCompleteWrapper(anim.card.cardId,true)}
                />
            ))}

          </PlayGround>
        </div>

        <div>Deck size: {gameSession?.deckSize ?? 0}</div>
        <div>PlayedCards size: {gameSession?.playedCardsSize ?? 0}</div>

        <button disabled={!turn?.yourTurn} onClick={drawCard}>Draw Card</button>
        <button disabled={selectedCards.length === 0 || !turn?.yourTurn} onClick={playCards}>Play Cards</button>

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
            <button onClick={() => { sendMessage('/app/game/draw-stack-of-cards', { playerId: playerSelf.playerId }); setPlayerSelf(prev => ({ ...prev, drawStackNumber: null })); }}>
              have to draw: {gameSession?.gameData?.drawStack[playerSelf.playerId]}
            </button>
        )}

        <button onClick={async () => { const response = await post('http://localhost:8080/game/leave', { gameSessionId: gameSession.gameSessionId }, token); console.log(response); }}>Leave</button>
      </div>
  );
}

export default Game;