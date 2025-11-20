import React, {useContext, useEffect, useMemo, useRef, useState} from 'react';
import { GameSessionContext } from '../Contexts/GameSessionContext.jsx';
import { useNavigate, useParams } from 'react-router-dom';
import useWebsocket from '../hooks/useWebsocket.js';
import useSubscribeToTopicByPage from '../hooks/useSubscribeToTopicByPage.js';
import HungarianCard, {
  getPlayerPositionBySeat,
  getCardStyleForPosition,
} from '../components/Game/HungarianCard.jsx';
import { useApiCallHook } from '../hooks/useApiCallHook.js';
import { TokenContext } from '../Contexts/TokenContext.jsx';
import { UserContext } from '../Contexts/UserContext.jsx';
import useDetermineCardsPlayability
  from '../components/Game/Hooks/useDetermineCardsPlayability.js';
import PlayGround from '../components/Game/PlayGround.jsx';
import DraggableHand from '../components/Game/DraggableHand.jsx';
import useCalculatePlayAnimation from "../components/Game/Hooks/useCalculatePlayAnimation.js";
import AnimatingCard from "../components/Game/AnimatingCard.jsx";

//todo: ez kicsit keszekusza, kulon hookba kell tenni pár dolgot
function Game() {
  const { gameSession, playerSelf, turn, setTurn, setPlayerSelf, setGameSession, selectedCards, setSelectedCards, validPlays } = useContext(GameSessionContext);
  const { gameSessionId } = useParams();
  const { sendMessage } = useWebsocket();
  const { userCurrentStatus } = useContext(UserContext);
  const { token } = useContext(TokenContext);
  const { get, post } = useApiCallHook();
  const { calculateAnimation } = useCalculatePlayAnimation();
  const navigate = useNavigate();

  useSubscribeToTopicByPage({ page: 'game' });

  const [changeSuitTo, setChangeSuitTo] = useState('');
  const [animatingCards, setAnimatingCards] = useState([]);
  const draggableHandRef = useRef(null);
  const opponentsCardRefs = useRef({});
  const playedCardRef=useRef(null);
  const animationTimingRef = useRef({
    animations: null,   // az utoljára számolt animációk tömbje
    totalDelay: 0,      // a teljes várakozási idő (max delay+duration)
  });

  // Előző kártyaszámok tárolása
  const prevCardCountsRef = useRef({});

  useEffect(() => {
    console.log(selectedCards);

  }, [selectedCards]);
  useEffect(() => {

    const getCurrentTurn = async () => {

      console.log('baj');
      const turn = await get('http://localhost:8080/game/current-turn', token);
      setTurn(turn);

    };
    getCurrentTurn();
  }, []);
  // Opponent kártyák változásának figyelése
  //todo: ezzel van olyan baj hogy ez mar a modositot opponents cardot nezi azaz ha nem az adott idexu cartyat mozgassa amit kell
  useEffect(() => {
    const currentCounts = gameSession?.playerHand?.otherPlayersCardCount || {};
    const prevCounts = prevCardCountsRef.current;

    // Megkeressük melyik játékos kártyaszáma csökkent
    Object.keys(currentCounts).forEach(playerId => {
      const currentCount = currentCounts[playerId];
      const prevCount = prevCounts[playerId];

      // Ha volt előző érték és csökkent
      if (prevCount !== undefined && currentCount < prevCount) {
        const diff = prevCount - currentCount;
        console.log(`Player ${playerId} played ${diff} card(s)`);

        //itt csinalunk egy dumy kartyat hogy kitudjuk szamolni a animaciot
        const dummyCards = Array.from({ length: diff }, (_, i) => ({
          refKey: `${playerId}-${i}`
        }));
        let goToRef;
        const playedCardElement = playedCardRef.current;
        if (playedCardElement) {
          const rect = playedCardElement.getBoundingClientRect();
          goToRef = {
            left: rect.left,
            top: rect.top,
          };
        }

        // Animáció indítása
        const animations = calculateAnimation(dummyCards, opponentsCardRefs.current, goToRef);
        console.log(animations)
        // Mentsük el a számolt animációkat és a totalDelay-t refbe
        const totalDelay = animations.reduce((max, a) => {
          const finish = (a.delay ?? 0) + (a.duration ?? 0);
          return Math.max(max, finish);
        }, 0);

        animationTimingRef.current.animations = animations;
        animationTimingRef.current.totalDelay = totalDelay;

        //todo: nincs befejezve az hogy az opponentek animacioja latszodjon, de mar kivan szamolva merre kell menie


      }
    });

    // Frissítjük az előző értékeket
    prevCardCountsRef.current = { ...currentCounts };
  }, [gameSession?.playerHand?.otherPlayersCardCount]);
  //todo: ezt valahogy be kell implementalni hogy ha nem tud letenni kartyat es nem tud huzni akkor maradjon ki a korbol
  //todo: MÁR MUKODITT AKKOR HA REFRESHELTEM AZ OLDALT DE NEM MUKODITT REALTIMEBA
  const canPlayAnyCard = () => {
    console.log(!(!validPlays || validPlays.length === 0));

    return !(!validPlays || validPlays.length === 0);

  };

  const canDrawCard = () => {
    return gameSession?.deckSize > 0;
  };

  const mustSkipTurn = () => {
    return turn?.yourTurn &&
      !canPlayAnyCard() &&
      !canDrawCard() &&
      gameSession?.playedCards?.length <= 1;
  };

  const drawCard = () => {
    console.log(playerSelf);

    sendMessage('/app/game/draw', { playerId: playerSelf.playerId });
  };

  const handleCardClick = (card) => {
    console.log(card);

    setSelectedCards(prev => {
      const exists = prev.find(c => c === card); // vagy c.id, ha van egyedi azonosító
      if (exists) {
        //ha az a elso kartya volt amire rakantintunk akkor töröljük az egészet
        if (prev[0] === prev.find(c => c === card && card.rank !== 'OVER')) {
          return [];
        }
        // ha már benne van → eltávolítjuk
        return prev.filter(c => c !== card);
      } else {
        // ha nincs → hozzáadjuk
        return [...prev, card];
      }
    });
  };
  const playCards = () => {
    console.log(selectedCards);

    // Kártya referenciák lekérése
    const cardRefs = draggableHandRef.current?.getCardRefs();

    if (!cardRefs) {
      console.error('Card refs not available');
      return;
    }

    const playedCardElement = playedCardRef.current;

    let goToRef;

    if (playedCardElement) {
      const rect = playedCardElement.getBoundingClientRect();
      goToRef = {
        left: rect.left,
        top: rect.top,
      };
    }

    // Animációk kiszámítása a tényleges pozíciókból
    const animations = calculateAnimation(selectedCards, cardRefs, goToRef);

    // Mentsük el a számolt animációkat és a totalDelay-t refbe
    const totalDelay = animations.reduce((max, a) => {
      const finish = (a.delay ?? 0) + (a.duration ?? 0);
      return Math.max(max, finish);
    }, 0);

    animationTimingRef.current.animations = animations;
    animationTimingRef.current.totalDelay = totalDelay;

    // eltüntetjük a kártyákat, mert már elindult az animáció
    selectedCards.forEach(card => {
      const cardElement = cardRefs[card.cardId];
      if (cardElement) {
        cardElement.style.display = 'none';
      }
    });

    setAnimatingCards(animations);
    console.log('totalDelay', totalDelay);

    // Kis késleltetés után küldjük el a backend-nek
    setTimeout(() => {
      const playCardsData = selectedCards.map(({ cardId, suit, rank, ownerId, position }) => ({
        cardId,
        suit,
        rank,
        ownerId,
        position,
      }));

      console.log(playCardsData);
      sendMessage('/app/game/play-cards', {
        playCards: playCardsData,
        playerId: playerSelf.playerId,
        ...(changeSuitTo ? { changeSuitTo } : {}),
      });

      setSelectedCards([]);
      setChangeSuitTo(null);
    }, totalDelay);
  };

  const handleAnimationComplete = (cardId) => {
    const totalDelay = animationTimingRef.current?.totalDelay ?? 0;


    setTimeout(() => {
      setAnimatingCards(prev => prev.filter(c => c.card.cardId !== cardId));
      //  ha minden animáció véget ért, töröljük a refet
      if (animationTimingRef.current?.animations) {
        const remaining = animationTimingRef.current.animations.filter(a => a.card.cardId !== cardId);
        animationTimingRef.current.animations = remaining;
        if (remaining.length === 0) {
          animationTimingRef.current.totalDelay = 0;
          animationTimingRef.current.animations = null;
        }
      }
    }, totalDelay);
  };

  //todo: ha leavelek (egyenlore a gamemasterrel probaltam) akkor kapok egy vegtelen cikust
  const leaveGame = async () => {
    console.log('asd');

    const response = await post('http://localhost:8080/game/leave', { gameSessionId: gameSession.gameSessionId }, token);
    console.log(response);

  };
  const drawStackOfCards = () => {
    sendMessage('/app/game/draw-stack-of-cards', { playerId: playerSelf.playerId });
    setPlayerSelf((prev) => ({ ...prev, drawStackNumber: null }));
  };

  const skipTurn = () => {
    sendMessage('/app/game/skip', { playerId: playerSelf.playerId });
  };
  const initialCards = useMemo(
    () => gameSession?.playerHand?.ownCards || [],
    [gameSession?.playerHand?.ownCards],
  );
  return (
    <>
      <PlayGround>
        <DraggableHand initialCards={initialCards}
                       ref={draggableHandRef}
                       selectedCards={selectedCards}
                       onReorder={(newOrder) => {
                         console.log('Új sorrend:', newOrder);
                         setGameSession(prev => ({
                           ...prev,
                           playerHand: {
                             ...prev.playerHand,
                             ownCards: newOrder,
                           },
                         }));
                       }}
                       handleCardClick={handleCardClick}
        />
        <HungarianCard   ref={playedCardRef}
          cardData={gameSession.playedCards?.[gameSession.playedCards.length - 1]}
          left={'50%'} top={'50%'}/>

        {(() => {
          const players = gameSession.players || [];
          const selfIdx = players.findIndex(p => p.playerId === playerSelf.playerId);
          const ordered = selfIdx >= 0 ? players.slice(selfIdx).concat(players.slice(0, selfIdx)) : players;
          const totalPlayers = ordered.length;

          return ordered.map((p, seatIndex) => {
            if (p.playerId === playerSelf.playerId) {
              return null;
            }
            const pos = getPlayerPositionBySeat(seatIndex, totalPlayers);
            const count = gameSession.playerHand?.otherPlayersCardCount?.[String(p.playerId)] ?? 0;

            return (
              <div key={`player-${p.playerId}`}>


                {/* A játékos kártyái a saját tengelye mentén középre igazítva */}
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
                      cardData={null} // vagy ha van back/card info: p.cards[cardIndex]
                      left={style.left}
                      right={style.right}
                      top={style.top}
                      bottom={style.bottom}
                      rotate={style.rotate}
                    />
                  );
                })}
              </div>
            );
          });
        })()}
        {/* Animálódó kártyák */}
        {animatingCards.map(anim => (
            <AnimatingCard
                key={anim.card.cardId}
                card={anim.card}
                from={anim.from}
                to={anim.to}
                duration={anim.duration}
                delay={anim.delay}
                onComplete={handleAnimationComplete}
            />
        ))}
      </PlayGround>


      {/* Deck size display */}
      <div>Deck size: {gameSession?.deckSize ?? 0}</div>
      <div>PlayedCards size: {gameSession?.playedCardsSize ?? 0}</div>
      {/* Action buttons */}
      {turn?.yourTurn && (
        <>
          {<button onClick={drawCard}>Draw Card</button>}

          {selectedCards.length !== 0 /*&& canPlayAnyCard()*/ && (
            <button onClick={playCards}>Play Cards</button>
          )}

          {mustSkipTurn() && (
            <button onClick={skipTurn} style={{ backgroundColor: 'orange' }}>
              Skip Turn (Cannot Play or Draw)
            </button>
          )}
        </>
      )}

      {turn?.yourTurn && <div>Te vagy</div>}
      {turn?.currentSeat && <div>Current seat: {turn.currentSeat}</div>}
      {selectedCards[selectedCards.length - 1]?.rank === 'OVER' &&
        <div>
          <button onClick={() => setChangeSuitTo('HEARTS')}
                  style={{ backgroundColor: 'red', width: '50px', height: '50px' }}></button>
          <button onClick={() => setChangeSuitTo('ACORNS')}
                  style={{ backgroundColor: 'orange', width: '50px', height: '50px' }}></button>
          <button onClick={() => setChangeSuitTo('BELLS')}
                  style={{ backgroundColor: 'brown', width: '50px', height: '50px' }}></button>
          <button onClick={() => setChangeSuitTo('LEAVES')}
                  style={{ backgroundColor: 'green', width: '50px', height: '50px' }}></button>
        </div>
      }
      {gameSession?.gameData?.drawStack?.[playerSelf.playerId] &&
        <button onClick={drawStackOfCards}>have to draw
          : {gameSession?.gameData?.drawStack[playerSelf.playerId]}</button>}
      <button onClick={() => leaveGame()}>Leave</button>
    </>
  );
}

export default Game;

const spacing = 40; // px, állítható: kártyák közötti távolság
