import React, { useContext, useEffect, useMemo, useState } from 'react';
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

function Game() {
  const { gameSession, playerSelf, turn, setTurn, setPlayerSelf, setGameSession, selectedCards, setSelectedCards, validPlays } = useContext(GameSessionContext);
  const { gameSessionId } = useParams();
  const { sendMessage } = useWebsocket();
  const { userCurrentStatus } = useContext(UserContext);
  const { token } = useContext(TokenContext);
  const { get, post } = useApiCallHook();
  const navigate = useNavigate();

  useSubscribeToTopicByPage({ page: 'game' });

  const [changeSuitTo, setChangeSuitTo] = useState('');

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
    const playCards = selectedCards.map(({ cardId, suit, rank, ownerId, position }) => ({
      cardId,
      suit,
      rank,
      ownerId,
      position,
    }));

    console.log(playCards);
    sendMessage('/app/game/play-cards', {
      playCards,
      playerId: playerSelf.playerId,
      ...(changeSuitTo ? { changeSuitTo } : {}),
    });
    setSelectedCards([]);
    setChangeSuitTo(null);
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
        <HungarianCard
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
                  return (
                    <HungarianCard
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
