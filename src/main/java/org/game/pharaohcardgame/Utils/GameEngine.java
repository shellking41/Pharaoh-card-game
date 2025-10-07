package org.game.pharaohcardgame.Utils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.game.pharaohcardgame.Enum.BotDifficulty;
import org.game.pharaohcardgame.Enum.GameStatus;
import org.game.pharaohcardgame.Exception.GameSessionNotFoundException;
import org.game.pharaohcardgame.Exception.PlayerNotFoundException;
import org.game.pharaohcardgame.Model.Bot;
import org.game.pharaohcardgame.Model.DTO.EntityMapper;
import org.game.pharaohcardgame.Model.DTO.Request.CardRequest;
import org.game.pharaohcardgame.Model.DTO.ResponseMapper;
import org.game.pharaohcardgame.Model.GameSession;
import org.game.pharaohcardgame.Model.Player;
import org.game.pharaohcardgame.Model.RedisModel.Card;
import org.game.pharaohcardgame.Model.RedisModel.GameState;
import org.game.pharaohcardgame.Model.Results.NextTurnResult;
import org.game.pharaohcardgame.Model.User;
import org.game.pharaohcardgame.Repository.GameSessionRepository;
import org.game.pharaohcardgame.Repository.PlayerRepository;
import org.game.pharaohcardgame.Repository.UserRepository;
import org.game.pharaohcardgame.Utils.SpecialCardLogic.SpecialCardHandler;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
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
	private final GameSessionRepository gameSessionRepository;
	private final ResponseMapper responseMapper;
	private final PlayerRepository playerRepository;
	private final CacheManager cacheManager;
	private final UserRepository userRepository;
	private final List<SpecialCardHandler> specialCardHandlers;

	private final int MAXCARDNUMBER = 1;


	@Override
	public NextTurnResult nextTurn(Player currentPlayer, GameSession gameSession, GameState gameState,Integer skipPlayerCount) {


		NextTurnResult nextTurnResult=gameSessionUtils.calculateNextTurn(currentPlayer,gameSession,gameState,skipPlayerCount);

		// Beállítjuk a gameState-ben az új currentPlayerId-t (a következő játékos azonosítóját)
		gameState.setCurrentPlayerId(nextTurnResult.nextPlayer().getPlayerId());

		// Visszaadjuk a NextTurnResult-et, ami tartalmazza a következő Player objektumot és a seat indexet.
		return nextTurnResult;
	}

	@Override
	public boolean isPlayersTurn(Player player, GameState gameState) {
		return player.getPlayerId().equals(gameState.getCurrentPlayerId());
	}



	@Override
	public GameState initGame(Long gameSessionId, List<Player> players) {
		List<Card> deck = gameSessionUtils.createShuffledDeck();
		Map<Long, List<Card>> playerHands = new LinkedHashMap<>();

		return gameSessionUtils.updateGameState(gameSessionId,(current)->{

			if (current != null) {
				throw new IllegalStateException("Game already initialized for session " + gameSessionId);
			}


			// Üres kezek inicializálása
			players.forEach(player ->
					playerHands.put(player.getPlayerId(), new ArrayList<>()));
			Player firstPlayer =getFirstPlayer(players);
			GameState gameState = GameState.builder()
					.gameSessionId(gameSessionId)
					.deck(deck)
					.playerHands(playerHands)
					.playedCards(new ArrayList<>())
					.status(GameStatus.IN_PROGRESS)
					.gameData(new HashMap<>())
					.currentPlayerId(firstPlayer.getPlayerId())
					.version(0L)
					.build();


			Card firstCard = gameState.getDeck().getFirst();

			gameState.getPlayedCards().add(firstCard);

			gameState.setDeck(new ArrayList<>(gameState.getDeck().subList(1, gameState.getDeck().size())));

			List<Integer>lossCounts=players.stream().map(Player::getLossCount).toList();
			return dealInitialCards(gameState,lossCounts );
		});

	}

	@Override
	public Card drawCard(GameState gameState, Player currentPlayer) {

		List<Card> deck = gameState.getDeck();

		//ha elfogyott a kartya a deckbol akkor itt a logika rá
		deck = handleIfDeckIsEmpty(deck,gameState);

		if(!deck.isEmpty()){
			Map<Long, List<Card>> hands = gameState.getPlayerHands();
			List<Card> hand = hands.get(currentPlayer.getPlayerId());
			Card card = deck.getFirst();  // "lehúzzuk a tetejéről"

			card.setOwnerId(currentPlayer.getPlayerId());
			card.setPosition(hand.size());

			hand.add(card);

			//a deckből kiszuedjük a felso kartyat
			gameState.setDeck(new ArrayList<>(deck.subList(1, deck.size())));

			List<Card> newHand = gameState.getPlayerHands().get(currentPlayer.getPlayerId());

			//ha a kartya huzas után nincs a deckben kartya akkor is újra keverjuka a played cardal
			if(checkNotDrawnCardsNumber(gameState) == 0 ){
				reShuffleCards(gameState);
			}

			return newHand.getLast();
		}
		return null;
	}



	@Override
	public List<Card> drawStackOfCards(Player currentPlayer, GameState gameState) {

		Long currentPlayerId=currentPlayer.getPlayerId();

		Map<Long, Integer> drawStack=gameSessionUtils.getSpecificGameDataTypeMap("drawStack",gameState);

		if(!drawStack.containsKey(currentPlayerId)){
			throw new IllegalStateException("Player don't have to draw stack of cards");
		}

		Integer CardToBeDrawn=drawStack.get(currentPlayerId);

		//ide tároljuk a húzott kártyákat
		List<Card> drawnCards=new ArrayList<>();
		//kihúzunk annyi kártyát amenyit kell
		for (int i=1;i<=CardToBeDrawn;i++){
			Card drawnCard=drawCard(gameState,currentPlayer);
			if(drawnCard!=null){
				drawnCards.add(drawnCard);
			}else{
				break;
			}

		}

		if(drawnCards.size()==CardToBeDrawn){
			drawStack.remove(currentPlayerId);
		}else {
			//ha nem tudtuk felhuzni ugyan anyi akrtyat amenyit muszály lett volna akkor csak simmán kivonyjuk a drawStackbol majd a kovetkezo körve felhuzza ha tudja
			/*int remaining = CardToBeDrawn - drawnCards.size();
			drawStack.put(currentPlayerId, remaining);*/

			//egyenlore simán engedjuk továbbb a usert
			drawStack.remove(currentPlayerId);
		}


		return drawnCards;
	}

	@Override
	public void reShuffleCards(GameState gameState) {
		List<Card> playedCards = gameState.getPlayedCards();
		 // nincs mit újrahúzni

		// Készítsünk új listát a "deckbe kerülő" kártyákból
		List<Card> allExceptLast = new ArrayList<>(playedCards.subList(0, playedCards.size() - 1));

		// Deckbe állítjuk az új listát
		gameState.setDeck(allExceptLast);

		// Eltávolítjuk a playedCards-ból
		playedCards.subList(0, playedCards.size() - 1).clear(); // ez már safe, mert külön listát adtunk a deck-nek

		// Shuffle a deck
		Collections.shuffle(gameState.getDeck());
	}


	public int checkNotDrawnCardsNumber(GameState gameState) {
		return gameState.getDeck().size();
	}

	@Override
	public boolean areCardsValid(Player currentPlayer,List<CardRequest> playCardsR, GameState gameState) {

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
	//ez azt ellenorzni hogy lelehete tenni a kártyákat a az adott szimbol és a szamra
	public Boolean checkCardsPlayability(List<CardRequest> playCards,GameState gameState) {
		if (playCards == null || playCards.isEmpty()) return false;


		List<Card> playedCards = gameState.getPlayedCards();
		if (playedCards == null || playedCards.isEmpty()) return false;

		Card lastPlayed = playedCards.getLast();
		CardRequest currentCard = CardRequest.builder()
				.cardId(lastPlayed.getCardId())
				.rank(lastPlayed.getRank())
				.suit(lastPlayed.getSuit())
				.build();

		// Első elem csak olvasva — NEM töröljük az eredeti listából
		CardRequest firstPlayCard = playCards.get(0);
		if (!compareSuitsAndRanks(currentCard, firstPlayCard)) return false;
		currentCard = firstPlayCard;

		for (int i = 1; i < playCards.size(); i++) {
			CardRequest playCard = playCards.get(i);
			if (!compareRanks(currentCard, playCard)) return false;
			currentCard = playCard;
		}
		return true;
	}


	@Override
	//leteszi a kartyakat
	public void playCards(List<CardRequest> playCards,Player currentPlayer,GameState gameState,GameSession gameSession) {


		if (playCards == null || playCards.isEmpty()) {
			throw new IllegalStateException("Play Card is null");
		};

		List<Card> incoming = entityMapper.toCardFromCardRequestList(playCards);

		//elveszi a playertol a kartyakat
		List<Card> hand = gameState.getPlayerHands().get(currentPlayer.getPlayerId());
		hand.removeAll(incoming);

		//a positionokat ujra vissza alakitja 1,2,3-ra, nem marad meg pl a postion igy : 2,3,5
		for (int i = 0; i < hand.size(); i++) {
			Card c = hand.get(i);
			c.setPosition(i+1);
		}

		//a kartyakat mar nem koti a playerhez
		for (Card card : incoming) {
			card.setOwnerId(null);
			card.setPosition(0);
		}
		//ha speciális a kártyák akkor elinditjuk a specialiskartya logikat
		for (SpecialCardHandler handler : specialCardHandlers){
			if(handler.applies(incoming)){
				handler.onPlay(incoming,currentPlayer,gameSession ,gameState);
			}
		}

		//leteszi a kartyat
		gameState.getPlayedCards().addAll(incoming);

		if(hand.isEmpty()){
			handlePlayerEmptyhand(gameState,currentPlayer);
		}

		return;
	}



	@Override
	//ha ures a keze akkor már nem kell lépnie és az adot kort nyerte,de még a jatek folytatódik
	public void handlePlayerEmptyhand(GameState gameState,Player player){
		// Játékos kiszáll az adott körből - már nem játszik tovább ebben a körben
		Set<Long> finishedPlayers = gameSessionUtils.getSpecificGameDataTypeSet("finishedPlayers",gameState);


		finishedPlayers.add(player.getPlayerId());

		log.info("Player {} finished the round (empty hand)", player.getPlayerId());

		// Ellenőrizzük, hány játékos van még játékban
		List<Player> activePlayers = getActivePlayers(gameState);

		if (activePlayers.size() == 1) {
			// Csak egy játékos maradt - ő a vesztes
			Player lastPlayer = activePlayers.get(0);
			handleRoundEnd(gameState, lastPlayer);
			if(!isGameEnded(gameState)){
				// Új kör indítása
				startNewRound(gameState);
			}else{
				gameFinished(gameState);
			}
		}
	}

	private boolean isGameEnded(GameState gameState) {
		Long sessionId = gameState.getGameSessionId();
		if (sessionId == null) {
			throw new IllegalArgumentException("GameState has no gameSessionId");
		}

		// Lekérjük a GameSession-t
		GameSession gameSession = gameSessionRepository.findByIdWithPlayers(sessionId)
				.orElseThrow(() -> new GameSessionNotFoundException("GameSession not found: " + sessionId));

		// Az összes játékos a sessionből
		List<Player> allPlayers = gameSession.getPlayers();
		if (allPlayers == null || allPlayers.isEmpty()) {
			return true; // nincs játékos — tekinthetjük befejezettnek
		}

		// Számoljuk, hány játékosnak VAN még <5 lossCount-ja (azaz még nem esett ki)
		long stillActiveCount = allPlayers.stream()
				.filter(p -> p.getLossCount() == null || p.getLossCount() < MAXCARDNUMBER)
				.count();

		// Ha 1 vagy kevesebb aktív játékos maradt, akkor vége a játéknak
		return stillActiveCount <= 1;
	}

	private List<Player> getActivePlayers(GameState gameState) {

		Set<Long> finishedPlayers = gameSessionUtils.getSpecificGameDataTypeSet("finishedPlayers",gameState);

		return gameState.getPlayerHands().entrySet().stream()
				.filter(entry -> !finishedPlayers.contains(entry.getKey()))
				.filter(entry -> !entry.getValue().isEmpty()) // Van még kártyája
				.map(entry -> {
					// Itt Player objektumot kellene visszaadni
					// Ehhez szükség van a Player repository-ra vagy a GameSession-re
					return playerRepository.findById(entry.getKey())
							.orElseThrow(() -> new IllegalStateException("Player not found: " + entry.getKey()));
				})
				.collect(Collectors.toList());
	}

	private void handleRoundEnd(GameState gameState, Player lastPlayer) {
		// Az utolsó játékos veszít - növeljük a loss count-ját
		lastPlayer.setLossCount(lastPlayer.getLossCount() + 1);
		playerRepository.save(lastPlayer);

		log.info("Round ended. Player {} lost (loss count: {})",
				lastPlayer.getPlayerId(), lastPlayer.getLossCount());

		// Tisztítsuk meg a finished players setet a következő körre
		gameState.getGameData().remove("finishedPlayers");

		// Itt értesítheted a játékosokat a kör végéről
		//notifyRoundEnd(gameState, lastPlayer);


	}

	@Override
	public void startNewRound(GameState gameState) {
		// Készítsük el az új, tiszta deck-et
		List<Card> newDeck = new ArrayList<>();

		// Ha van jelenlegi deck, másoljuk át
		if (gameState.getDeck() != null && !gameState.getDeck().isEmpty()) {
			newDeck.addAll(new ArrayList<>(gameState.getDeck()));
		}

		//Mozgassuk vissza a playedCards összes lapját
		List<Card> played = gameState.getPlayedCards() == null
				? Collections.emptyList()
				: new ArrayList<>(gameState.getPlayedCards());
		for (Card c : played) {
			c.setOwnerId(null);
			c.setPosition(0);
		}
		newDeck.addAll(played);
		// tisztítsuk a playedCards-ot
		if (gameState.getPlayedCards() != null) {
			gameState.getPlayedCards().clear();
		}

		// 4) Gyűjtsük össze az összes játékos kezében lévő kártyát és reseteljük mezőiket
		List<Card> handCards = gameState.getPlayerHands().values().stream()
				.flatMap(List::stream)
				.peek(c -> {
					c.setOwnerId(null);
					c.setPosition(0);
                })
				.toList();

		newDeck.addAll(handCards);

		//  Töröljük a playerHands map-et
		gameState.getPlayerHands().clear();

		Long sessionId = gameState.getGameSessionId();
		if (sessionId == null) {
			throw new IllegalArgumentException("GameState has no gameSessionId");
		}

		// Lekérjük a GameSession-t
		GameSession gameSession = gameSessionRepository.findByIdWithPlayers(sessionId)
				.orElseThrow(() -> new GameSessionNotFoundException("GameSession not found: " + sessionId));
		List <Player> players=gameSession.getPlayers();
		//initializaljuk a player handset
		if (players == null) {
			throw new PlayerNotFoundException("not found any player in this gameSession");
		}
		for (Player p : players) {
			gameState.getPlayerHands().put(p.getPlayerId(), new ArrayList<>());
		}


		//Shuffle
		Collections.shuffle(newDeck);

		// Beállítjuk az új deck-et a gameState-re
		gameState.setDeck(newDeck);

		//letesszuk az elso played cardot.
		Card firstCard = gameState.getDeck().getFirst();
		gameState.getPlayedCards().add(firstCard);
		gameState.setDeck(new ArrayList<>(gameState.getDeck().subList(1, gameState.getDeck().size())));

		List<Integer>lossCounts=players.stream().map(Player::getLossCount).toList();

		//lecheckeljuk hogy ki vesztett már es beleteszzuk a gamedataba
		Set<Long> lostPlayers = gameSessionUtils.getSpecificGameDataTypeSet("lostPlayers",gameState);


		Set<Long> newLost = players.stream()
				.filter(p -> p.getLossCount() == MAXCARDNUMBER)
				.map(Player::getPlayerId)
				.collect(Collectors.toSet());

		lostPlayers.clear();
		lostPlayers.addAll(newLost);


		dealInitialCards(gameState,lossCounts );

		//nem kell beállítanunk hogy ki kezdje a kovetkezo kort mert a nextturnben az utoljára lépett user utáni player fogja inditani a kört





		//todo: (opcionális) reseteljük a version-t, vagy bármilyen round-specific mezőt itt
	}

	@Override
	public void gameFinished(GameState gameState) {
		return;
	}


	@Override
	//todo: még megkell oldalni azt hogy mitortenyen ha a user akkor lepki amikor o van soron, mert ha ő van soron és kilép akkor a helyére érkezett bot nem csinal semmit még és megálhat a játék
	public void handlePlayerLeaving(GameSession gameSession, Player leavingPlayer, User user) {
		//a userplayer lecserelese erre a botra
		Bot newBot=Bot.builder()
				.name(user.getName()+"-bot")
				.room(user.getCurrentRoom())
				.botPlayer(leavingPlayer)
				.difficulty(BotDifficulty.MEDIUM)
				.build();

		leavingPlayer.setBot(newBot);
		leavingPlayer.setBotDifficulty(newBot.getDifficulty());
		leavingPlayer.setUser(null);
		leavingPlayer.setIsBot(true);
		playerRepository.save(leavingPlayer);

		user.setCurrentRoom(null);

		userRepository.save(user);

		Cache cache=cacheManager.getCache("userStatus");
		if (cache != null) {
			cache.evict("userStatus_" + user.getId());
		}
	}
	@Override
	public void handleGamemasterLeaving(GameSession gameSession, Player leavingPlayer) {
		// End the game session
		gameSession.setGameStatus(GameStatus.FINISHED);
		gameSessionRepository.save(gameSession);

		// End game state in cache
		gameSessionUtils.deleteGameState(gameSession.getGameSessionId());





	}
	//leelenorizzuk hogy a playernek kell e huznia kartyat
	public boolean playerHaveToDrawStack(Player player,GameState gameState){
		Long playerId= player.getPlayerId();
		Map<Long,Integer> drawStack = gameSessionUtils.getSpecificGameDataTypeMap("drawStack", gameState);
		return drawStack.containsKey(playerId);
	}

	private Player getFirstPlayer(List<Player> players){
		 return players.stream()
				.min(Comparator.comparing(Player::getSeat))
				.orElseThrow(() -> new IllegalStateException("No players found"));
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
			need[i] = Math.max(0, MAXCARDNUMBER - lossCount.get(i));
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

		state.setDeck(new ArrayList<>(deck.subList(deckIdx, deck.size())));

		return state;
	}


	public boolean isPlayerFinished(Player currentPlayer, GameState gameState) {
		Set<Long> finishedPlayers=gameSessionUtils.getSpecificGameDataTypeSet("finishedPlayers",gameState);
		return finishedPlayers.contains(currentPlayer.getPlayerId());
	}

	public boolean isPlayerLost(Player currentPlayer, GameState gameState) {
		Set<Long> finishedPlayers=gameSessionUtils.getSpecificGameDataTypeSet("lostPlayers",gameState);
		return finishedPlayers.contains(currentPlayer.getPlayerId());
	}
	private List<Card> handleIfDeckIsEmpty(List<Card> deck, GameState gameState) {
		//todo: ha már tud letenni a bot kartyat akkor kell nekunk olyan  hogy ide teszunk egy custom exceptiont és majd a bot azt elcatcheli  akkor majd ha akarna huzni, de nem tud akkor helyette muszaj letennie valamelyik kartyajat. De ha nem tud letenni egy kartyat sem akkor ne csinajon semmit ebben a körben. Ez azert kell mert ha mar nincs tobb kartya a deckben akkor ne áljon meg a jaték a bot nál
		if (deck.isEmpty()) {
			if (gameState.getPlayedCards().size() == 1) {
				//ez azért kell mert ha volt akinek kellett huznia kartyat akkor most nem kell
				log.info("No more cards in deck gamesession id: {}",gameState.getGameSessionId());

				//ez azÉrt kelll mert ha az egyik user felhuzta az utolso kartyat es a played cardban is csak 1 kartya volt, ilyenkor nem kerul a deckbe kartya a következo player mar nem tudott felhuzni kartyat mert ures volt a deck. Ezért muszály neki letenni kartyat.Majd a következo player akarna kartyat huzni de az nem volt megshufflezva és nem kerult bele a frissen letett kartya a deckbe ezért empty maradt a deck. de most ez beleteszi azt a egy frissen letett kartyat a deckbe
			} else {
				//todo: ha reshuflezzuk a kartyakat akkor arrol a afrontendnek kuldeni kell infot és elkell kuldeni a decksizet is
				reShuffleCards(gameState);
				deck = gameState.getDeck();
			}
		}
		return deck;
	}
}
