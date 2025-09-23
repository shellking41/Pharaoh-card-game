package org.game.pharaohcardgame.Utils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.game.pharaohcardgame.Enum.GameStatus;
import org.game.pharaohcardgame.Model.DTO.EntityMapper;
import org.game.pharaohcardgame.Model.DTO.Request.CardRequest;
import org.game.pharaohcardgame.Model.DTO.Response.NextTurnResponse;
import org.game.pharaohcardgame.Model.GameSession;
import org.game.pharaohcardgame.Model.Player;
import org.game.pharaohcardgame.Model.RedisModel.Card;
import org.game.pharaohcardgame.Model.RedisModel.GameState;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Slf4j
@Component
public class GameEngine implements IGameEngine {

	private final GameSessionUtils gameSessionUtils;
	private final SimpMessagingTemplate simpMessagingTemplate;
	private final EntityMapper entityMapper;

	@Override
	public Player nextTurn(Player currentPlayer, GameSession gameSession) {



		List<Player> players=gameSession.getPlayers();
		List<Integer> seatIndexes=players.stream().map(Player::getSeat).toList();


		int currentSeatPosition = seatIndexes.indexOf(currentPlayer.getSeat());
		if (currentSeatPosition == -1) {
			throw new IllegalStateException("Current Player's seat is not found");
		}
		int nextSeatPosition = (currentSeatPosition + 1) % seatIndexes.size();
		int nextSeat = seatIndexes.get(nextSeatPosition);

		Player nextPlayer =players.stream().filter(p -> p.getSeat().equals(nextSeat))
				.findFirst().orElseThrow(()-> new IllegalStateException("Player is not found on the current seat"));



		gameSessionUtils.updateGameState(gameSession.getGameSessionId(),(current)->{
			current.setCurrentPlayerId(nextPlayer.getPlayerId());
			return current;
		});




		if(nextPlayer.getIsBot()){
			return null;
		}
		for (Player player : players) {
			boolean isCurrentPlayer = player.equals(nextPlayer);
			simpMessagingTemplate.convertAndSendToUser(
					player.getUser().getId().toString(),
					"/queue/game/turn",
					NextTurnResponse.builder().isYourTurn(isCurrentPlayer).playerId(player.getPlayerId()).currentSeat(nextSeat).build()
			);
		}
		return nextPlayer;
	}

	@Override
	public boolean isPlayersTurn(Player player, GameState gameState) {
		return player.getPlayerId().equals(gameState.getCurrentPlayerId());
	}



	@Override
	public void initGame(Long gameSessionId, List<Player> players) {
		List<Card> deck = gameSessionUtils.createShuffledDeck();
		Map<Long, List<Card>> playerHands = new LinkedHashMap<>();

		gameSessionUtils.updateGameState(gameSessionId,(current)->{

			if (current != null) {
				throw new IllegalStateException("Game already initialized for session " + gameSessionId);
			}


			// Üres kezek inicializálása
			players.forEach(player ->
					playerHands.put(player.getPlayerId(), new ArrayList<>()));
			Player firstPlayer = players.stream()
					.min(Comparator.comparing(Player::getSeat))
					.orElseThrow(() -> new IllegalStateException("No players found"));
			GameState gameState = GameState.builder()
					.gameSessionId(gameSessionId)
					.deck(deck)
					.playerHands(playerHands)
					.playedCards(new ArrayList<>())
					.status(GameStatus.IN_PROGRESS)
					.gameData(new HashMap<>())
					.currentPlayerId(firstPlayer.getPlayerId())
					.build();


			Card firstCard = gameState.getDeck().getFirst();

			gameState.getPlayedCards().add(firstCard);

			gameState.setDeck(new ArrayList<>(gameState.getDeck().subList(1, gameState.getDeck().size())));

			List<Integer>lossCounts=players.stream().map(Player::getLossCount).toList();
			return dealInitialCards(gameState,lossCounts );
		});

	}

	@Override
	public GameState drawCard(GameSession gameSession, Player currentPlayer) {
		return gameSessionUtils.updateGameState(gameSession.getGameSessionId(),(current)->{
			if(!isPlayersTurn(currentPlayer,current)){
				throw new IllegalStateException("This is not your turn");
			};
			List<Card> deck = current.getDeck();
			if (deck.isEmpty()) {
				throw new IllegalStateException("No more cards in deck");
			}

			Map<Long, List<Card>> hands = current.getPlayerHands();
			List<Card> hand = hands.get(currentPlayer.getPlayerId());
			Card card = deck.getFirst();  // "lehúzzuk a tetejéről"

			card.setOwnerId(currentPlayer.getPlayerId());
			card.setPosition(hand.size());

			hand.add(card);

			current.setDeck(new ArrayList<>(deck.subList(1, deck.size())));


			return current;
		});
	}
	@Override
	public boolean areCardsValid(Player currentPlayer,List<CardRequest> playCardsR, GameSession gameSession) {
		GameState gameState=gameSessionUtils.getGameState(gameSession.getGameSessionId());
		Map<Long,List<Card>> playerHands=gameState.getPlayerHands();
		//ez azért van hogy ne keruljon bele tobb kartya a pakliba mint amenyinek kéne lennie
		List<Card> otherPlayersCards = playerHands.entrySet().stream()
				.filter(entry -> !entry.getKey().equals(currentPlayer.getPlayerId()))
				.flatMap(entry -> entry.getValue().stream())
				.toList();
		int otherPlayersCardsNumber=otherPlayersCards.size();

		List<Card> currentPlayerCards=playerHands.get(currentPlayer.getPlayerId());
		int currentPlayerCardNumber=currentPlayerCards.size();
		int playedCardsNumber=gameState.getPlayedCards().size();
		int deckNumber=gameState.getDeck().size();
		if(otherPlayersCardsNumber+currentPlayerCardNumber+playedCardsNumber+deckNumber>32){
			return false;
		}
		//ez azért van hogy a playernek tényleg vannak-e ilyen kártyái
		Set<Card> currentPlayerCardsSet = new HashSet<>(currentPlayerCards);
		List<Card> playCards=entityMapper.toCardFromCardRequestList(playCardsR);

		Set<String> currentIds = currentPlayerCardsSet.stream()
				.map(Card::getCardId)
				.collect(Collectors.toSet());

		Set<String> playedIds = playCards.stream()
				.map(Card::getCardId)
				.collect(Collectors.toSet());

		if (!currentIds.containsAll(playedIds)) {
			return false;
		}


		//ez azért van hogy a playedcard, deck, és más playernek a kezébe nincsbenne azok a kartyak amiket leakar rakni a user

		// A már kijátszott lapok
		List<Card> playedCards = gameState.getPlayedCards();

		// A húzópakli lapjai
		List<Card> deckCards = gameState.getDeck();

		Set<Card> forbiddenCards = new HashSet<>();
		forbiddenCards.addAll(otherPlayersCards);
		forbiddenCards.addAll(playedCards);
		forbiddenCards.addAll(deckCards);

		for (Card card : playCards) {
			if (forbiddenCards.contains(card)) {
				return false; //
			}
		}
		return true;
	}
	@Override
	public Boolean checkCardsPlayability(List<CardRequest> playCards, GameSession gameSession) {
		GameState gameState=gameSessionUtils.getGameState(gameSession.getGameSessionId());
		List<Card> playedCards=gameState.getPlayedCards();
		Card lastPlayed = playedCards.getLast();

		CardRequest currentCard=CardRequest.builder()
				.cardId(lastPlayed.getCardId())
				.rank(lastPlayed.getRank())
				.suit(lastPlayed.getSuit())
				.build();

		CardRequest firstPlayCard= playCards.getFirst();
		playCards.remove(firstPlayCard);

		if(!compareSuitsAndRanks(currentCard,firstPlayCard)) return false;
		currentCard=firstPlayCard;

		for (CardRequest playCard : playCards){
			if(!compareRanks(currentCard,playCard)) return false;
			currentCard=playCard;
		}

		return true;
	}

	@Override
	public GameState playCards(List<CardRequest> playCards, GameSession gameSession,Player currentPlayer) {
		return gameSessionUtils.updateGameState(gameSession.getGameSessionId(),(current)->{

			if (playCards == null || playCards.isEmpty()) return current;

			List<Card> incoming = entityMapper.toCardFromCardRequestList(playCards);

			current.getPlayerHands().get(currentPlayer.getPlayerId()).removeAll(incoming);
			current.getPlayedCards().addAll(incoming);

			return current;
		});
	}



	private boolean compareRanks(CardRequest firstCard, CardRequest secondCard) {
		return firstCard.getRank().equals(secondCard.getRank());
	}

	private Boolean compareSuitsAndRanks(CardRequest firstCard,CardRequest secondCard){
		return firstCard.getRank().equals(secondCard.getRank()) || firstCard.getSuit().equals(secondCard.getSuit());
	}

	private GameState dealInitialCards(GameState state,List<Integer> lossCount){

		List<Card> deck = state.getDeck();                 // marad List, indexszel lépünk
		Map<Long, List<Card>> hands = state.getPlayerHands();

		// Fontos: a játékosok sorrendje legyen stabil! (pl. LinkedHashMap)
		List<Long> playerIds = new ArrayList<>(hands.keySet());

		if (playerIds.size() != lossCount.size()) {
			throw new IllegalArgumentException("players és lossCount méret eltér");
		}

		// Minden játékosnak ennyi lap kell: 5 - lossCount (min. 0)
		int n = playerIds.size();
		int[] need = new int[n];
		int remainingToDeal = 0;
		for (int i = 0; i < n; i++) {
			need[i] = Math.max(0, 5 - lossCount.get(i));
			remainingToDeal += need[i];
		}

		int deckIdx = 0;     // nincs remove(0) → O(1) előrelépés
		int i = 0;           // körbejáró index

		while (remainingToDeal > 0 && deckIdx < deck.size()) {
			if (need[i] > 0) {
				Long pid = playerIds.get(i);
				List<Card> hand = hands.get(pid);

				Card card = deck.get(deckIdx++);  // "lehúzzuk a tetejéről"

				card.setOwnerId(pid);
				card.setPosition(hand.size());

				hand.add(card);
				need[i]--;
				remainingToDeal--;
			}
			i = (i + 1) % n; // következő játékos (körbe)
		}

		// ha a deck-et ténylegesen "elfogyasztottra" akarod írni:
		state.setDeck(new ArrayList<>(deck.subList(deckIdx, deck.size())));
		// és mentsd vissza az állapotot, ha szükséges:
		return state;
	}
}
