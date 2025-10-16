package org.game.pharaohcardgame.Utils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.game.pharaohcardgame.Enum.BotDifficulty;
import org.game.pharaohcardgame.Enum.CardRank;
import org.game.pharaohcardgame.Enum.CardSuit;
import org.game.pharaohcardgame.Enum.GameStatus;
import org.game.pharaohcardgame.Model.DTO.Request.CardRequest;
import org.game.pharaohcardgame.Model.DTO.RequestMapper;
import org.game.pharaohcardgame.Model.DTO.Response.DrawCardResponse;
import org.game.pharaohcardgame.Model.DTO.Response.PlayedCardResponse;
import org.game.pharaohcardgame.Model.DTO.ResponseMapper;
import org.game.pharaohcardgame.Model.GameSession;
import org.game.pharaohcardgame.Model.Player;
import org.game.pharaohcardgame.Model.RedisModel.Card;
import org.game.pharaohcardgame.Model.RedisModel.GameState;
import org.game.pharaohcardgame.Model.Results.NextTurnResult;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.DoubleAccumulator;
import java.util.concurrent.atomic.DoubleAdder;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Slf4j
@Component
public class BotLogic implements IBotLogic{

	private final ResponseMapper responseMapper;
	private final GameSessionUtils gameSessionUtils;
	private final SimpMessagingTemplate simpMessagingTemplate;
	private final GameEngine gameEngine;
	private final RequestMapper requestMapper;
	private final NotificationHelpers notificationHelpers;

	@Override
	public NextTurnResult botDrawTest( GameSession gameSession, Player botPlayer) {

		AtomicReference<NextTurnResult> nextTurnRef = new AtomicReference<>();
		AtomicReference<Integer> deckSizeRef = new AtomicReference<>();
		GameState gameState=gameSessionUtils.updateGameState(gameSession.getGameSessionId(),current->{

			//ha kell huznia kartyat akkor nem engedjuk hogy rakjon le kartyat
			if(gameEngine.playerHaveToDrawStack(botPlayer,current)){
				return current;//itt kellhuznia a stecket
			}

			Card drawnCard=gameEngine.drawCard(current,botPlayer);
			deckSizeRef.set(current.getDeck().size());
			NextTurnResult nextTurnResult=gameEngine.nextTurn(botPlayer,gameSession,current,0);
			nextTurnRef.set(nextTurnResult);
			return current;
		});


		for (Player player : gameSession.getPlayers()) {
			if (!player.getIsBot()) {

				DrawCardResponse personalizedResponse = responseMapper.toDrawCardResponse(gameState,null,player.getPlayerId(),deckSizeRef.get(),gameState.getPlayedCards().size());

				simpMessagingTemplate.convertAndSendToUser(
						player.getUser().getId().toString(),
						"/queue/game/draw",
						personalizedResponse
				);
			}
		}
		return nextTurnRef.get();
	}
	public NextTurnResult botPlays(GameState gameState,GameSession gameSession,Player botPlayer){
		if(!botPlayer.getIsBot()) throw  new IllegalStateException("This player is not bot");
		if(!gameState.getCurrentPlayerId().equals(botPlayer.getPlayerId())) throw new IllegalStateException("This bot is not the current player");

		AtomicReference<NextTurnResult> nextTurnRef = new AtomicReference<>();

		gameSessionUtils.updateGameState(gameSession.getGameSessionId(),current->{
			// ELŐSZÖR ellenőrizzük, hogy kell-e stacket húzni
			if(gameEngine.playerHaveToDrawStack(botPlayer,current)){
				// Csak hetes vagy fáraó kártyákat keresünk
				List<List<Card>> validPlays=calculateValidPlays(current,botPlayer);

				List<List<Card>> pharaohOrSevenPlays = validPlays.stream()
						.filter(cards -> {
							Card firstCard = cards.getFirst();
							return firstCard.getRank().equals(CardRank.VII) ||
									(firstCard.getRank().equals(CardRank.JACK) &&
											firstCard.getSuit().equals(CardSuit.LEAVES));
						})
						.toList();

				if(!pharaohOrSevenPlays.isEmpty()){
					// Van hetes vagy fáraó, lerakjuk
					Random random = new Random();
					List<Card> chosen = pharaohOrSevenPlays.get(random.nextInt(pharaohOrSevenPlays.size()));

					handleCardPlay(chosen, botPlayer, gameSession, current, nextTurnRef);

				} else {
					// Nincs hetes/fáraó, húzni kell a stacket
					List<Card> drawnCards=gameEngine.drawStackOfCards(botPlayer,current);
					NextTurnResult nextTurnResult = gameEngine.nextTurn(botPlayer, gameSession, current,0);
					nextTurnRef.set(nextTurnResult);
					notificationHelpers.sendDrawCardNotification(gameSession.getPlayers(),botPlayer,drawnCards,current.getDeck().size(),current.getPlayedCards().size(),current);
				}
				return current;
			}

			// Nincs stack húzási kötelezettség, normál játék
			List<List<Card>> validPlays=calculateValidPlays(current,botPlayer);

			if(validPlays.isEmpty()){
				//ha nem tudunk reshufflezni akkor skippeljuk a kort
				if (current.getDeck().isEmpty() && current.getPlayedCards().size() > 1) {
					NextTurnResult nextTurnResult = gameEngine.nextTurn(botPlayer, gameSession, current,0);
					nextTurnRef.set(nextTurnResult);
					notificationHelpers.sendTurnSkipped(gameSession,botPlayer,current);

					return current;
				}

				Card drawnCard=gameEngine.drawCard(current,botPlayer);

				notificationHelpers.sendDrawCardNotification(gameSession.getPlayers(),botPlayer,Collections.singletonList(drawnCard),current.getDeck().size(),current.getPlayedCards().size(),current);
				NextTurnResult nextTurnResult = gameEngine.nextTurn(botPlayer, gameSession, current,0);
				nextTurnRef.set(nextTurnResult);

				return current;
			}

			// Véletlenszerűen választ egy kártyát
			if(botPlayer.getBotDifficulty()==BotDifficulty.EASY){
				Random random =new Random();
				List<Card> chosen = validPlays.get(random.nextInt(validPlays.size()));
				handleCardPlay(chosen, botPlayer, gameSession, current, nextTurnRef);
			}else{
				//ha a bot diff nem easy akkor külön logikat adunk neki;
				List<Card> chosen=chooseMonteCarloPlay(botPlayer,current,gameSession,100);
				handleCardPlay(chosen, botPlayer, gameSession, current, nextTurnRef);
			}

			return current;

		});
		return nextTurnRef.get();
	}
	private NextTurnResult handleAfterPlayCards(List<Card> chosen,GameState current,Player botPlayer,GameSession gameSession){
		if (!chosen.isEmpty() && chosen.getFirst().getRank() == CardRank.OVER) {
			List<Card> hand = current.getPlayerHands().get(botPlayer.getPlayerId());
			CardSuit chosenSuit = mostCommonSuitInHand(hand);
			gameEngine.suitChangedTo(chosenSuit,current);
		}

		//ha a kartya lerakasakor olyan kartyat raktunk le ami skippeli a plajereket akkor az szerint kezdodik el a turn.
		Set<Long> skippedPlayers = gameSessionUtils.getSpecificGameDataTypeSet("skippedPlayers", current);
		//ha a player égetett akkor ujra jojjon o
		Long streakPlayerId= gameSessionUtils.getSpecificGameData("streakPlayerId",current,null);
		NextTurnResult nextTurnResult;

		if(streakPlayerId!=botPlayer.getPlayerId()){
			nextTurnResult = gameEngine.nextTurn(botPlayer, gameSession, current,skippedPlayers.size());
		}else{
			//ha egetett a player akkor o kovetkezzen ujra
			nextTurnResult= new NextTurnResult(botPlayer, botPlayer.getSeat());
			current.getGameData().remove("streakPlayerId");
		}
		return nextTurnResult;
	}
	private void handleCardPlay(List<Card> chosen, Player botPlayer, GameSession gameSession,
								GameState current, AtomicReference<NextTurnResult> nextTurnRef) {
		gameEngine.playCards(requestMapper.toCardRequestList(chosen),botPlayer,current,gameSession);

		NextTurnResult nextTurnResult=handleAfterPlayCards(chosen, current,botPlayer,gameSession);

		// Mentjük a referenciába, hogy a lambda végén kívül is elérjük
		nextTurnRef.set(nextTurnResult);

		List<PlayedCardResponse> playedCardResponses= responseMapper.toPlayedCardResponseListFromCards(chosen);

		//ez azt kuldi el hogy milyen kartyak vannak már letéve
		notificationHelpers.sendPlayedCardsNotification(gameSession.getGameSessionId(),current,playedCardResponses);

		//ez elkuldi a frissitett player handet hogy a játszo usernek a kezebol eltunnjon a kartya es mas playerek is lassak ezt
		notificationHelpers.sendPlayCardsNotification(gameSession,current);
	}
	@Override
	public List<List<Card>> calculateValidPlays(GameState gameState, Player currentPlayer) {
		List<Card> currentPlayerHand = gameState.getPlayerHands().get(currentPlayer.getPlayerId());
		if (currentPlayerHand == null || currentPlayerHand.isEmpty()) return Collections.emptyList();

		List<Card> playedCards = gameState.getPlayedCards();
		if (playedCards == null || playedCards.isEmpty()) return Collections.emptyList();

		Card lastPlayedCard = playedCards.getLast();
		CardSuit suitChangedTo = gameSessionUtils.getSpecificGameData("suitChangedTo", gameState, null);

		// letehető kártyák (single-k)
		List<Card> playableFirstCards = currentPlayerHand.stream()
				.filter(c ->
						c.getRank() == CardRank.OVER
								|| c.getRank() == lastPlayedCard.getRank()
								|| (lastPlayedCard.getRank() == CardRank.JACK && lastPlayedCard.getSuit() == CardSuit.LEAVES)
								|| (suitChangedTo == null && c.getSuit() == lastPlayedCard.getSuit())
								|| (suitChangedTo != null && c.getSuit() == suitChangedTo)
				)
				.toList();

		// Építjük a teljes jelöltek listáját (egykártyás + multi-kombók)
		List<List<Card>> validPlays = new ArrayList<>();

		// adjuk hozzá az egykártyás (singleton) lépéseket
		for (Card single : playableFirstCards) {
			validPlays.add(Collections.singletonList(single));
		}

		// csoportosítunk rang szerint -- ez egy lokális változó, nem kell külső metódus
		Map<CardRank, List<Card>> groupsByRank = currentPlayerHand.stream()
				.collect(Collectors.groupingBy(Card::getRank, LinkedHashMap::new, Collectors.toList()));

		// Generáljuk a multi-card kombinációkat rank-onként (így nincs duplikáció)
		for (Map.Entry<CardRank, List<Card>> entry : groupsByRank.entrySet()) {
			List<Card> group = entry.getValue();
			int n = group.size();
			if (n < 2) continue; // csak 2+ lapból érdemes kombinációkat generálni

			int maxMask = 1 << n; // 2^n maszk
			for (int mask = 1; mask < maxMask; mask++) {
				if (Integer.bitCount(mask) < 2) continue; // csak >=2 elemes részhalmazok

				// build subset
				List<Card> combo = new ArrayList<>();
				for (int i = 0; i < n; i++) {
					if ((mask & (1 << i)) != 0) {
						combo.add(group.get(i));
					}
				}

				// csak akkor vegyük fel, ha a combo tartalmaz legalább egy playableFirstCard-ot
				boolean hasPlayableStarter = combo.stream()
						.anyMatch(card -> playableFirstCards.stream()
								.anyMatch(p -> p.getCardId().equals(card.getCardId())));
				if (!hasPlayableStarter) continue;

				// KERESSÜK meg a startert (az első playableFirstCard-ot a combo-ban)
				Optional<Card> maybeStarter = combo.stream()
						.filter(card -> playableFirstCards.stream()
								.anyMatch(p -> p.getCardId().equals(card.getCardId())))
						.findFirst();
				if (maybeStarter.isEmpty()) continue; // biztonsági ellenőrzés

				// feltételezzük: 'combo' tartalmazza a kártyákat (starter is benne van)
				Card starterCard = maybeStarter.get();

				// készítünk egy másolatot, hogy ne változtassuk meg az eredeti combo-t
				List<Card> ordered = new ArrayList<>(combo);

				ordered.removeIf(c -> c.getCardId().equals(starterCard.getCardId()));

				ordered.add(0, starterCard);

				validPlays.add(ordered);
			}
		}

		//  csak azok maradjanak, amelyek a GameEngine szerint is érvényesek
		List<List<Card>> filteredValidPlays = validPlays.stream()
				.filter(cList -> {

					List<CardRequest> crList = requestMapper.toCardRequestList(cList);
					return gameEngine.checkCardsPlayability(crList, gameState);
				})
				.toList();

		return filteredValidPlays;
	}
	@Override
	//todo: ez talan jó de még le kell ellenorizni hogy tgenyleg jol mukodik-e, asyncra kell csinálni, finomitani kell a pontrendszert, olyan lassu hogy volt olyan nem jott meg az adato
	//todo: valamiért nem talalja a gamet valoszinuleg a montekarlo bassza el  Game session not found: Active Game not Found, Azért mert valami átálitja a gamestatust finishedre!!!!

	public List<Card> chooseMonteCarloPlay(Player botPlayer, GameState realState, GameSession realSession, int playoutsPerMove) {
		List<List<Card>> candidates = calculateValidPlays(realState, botPlayer);
		if (candidates.isEmpty()) return null; // vagy draw

		Map<List<Card>, DoubleAdder> acc = new HashMap<>();
		for (var c : candidates) acc.put(c, new DoubleAdder());

		for (var entry : acc.entrySet()) {
			for (int i=0;i<playoutsPerMove;i++){
				GameState sc = cloneState(realState);
				GameSession ss = cloneSessionLight(realSession);
				Player botClone = findPlayerInSession(ss, botPlayer.getPlayerId());

				// root apply
				NextTurnResult nextTurnResult=applyPlayInClone(sc, ss, botClone, entry.getKey());
				// handle OVER: choose suit heuristically
				if (containsOVER(entry.getKey())) {
					CardSuit suit = mostCommonSuitInHand(sc.getPlayerHands().get(botClone.getPlayerId()));
					sc.getGameData().put("suitChangedTo", suit);
				}
				SplittableRandom random=new SplittableRandom();
				double reward = runPlayout(sc, ss, nextTurnResult.nextPlayer(),random,100);
				acc.get(entry.getKey()).add(reward);
			}
		}

		// pick max avg
		return acc.entrySet().stream().max(Comparator.comparingDouble(e-> e.getValue().sum() / playoutsPerMove)).get().getKey();
	}

	private double runPlayout(GameState sc, GameSession ss, Player mainBotClone, SplittableRandom rnd, int maxTurns) {
		if(sc==null || ss==null || mainBotClone==null)return 0.0;

		List<Card> initialPlayerHand=sc.getPlayerHands().get(mainBotClone.getPlayerId());
		int initialPlayerHandSize=initialPlayerHand.size();

		int turns=0;
		while (turns < maxTurns) {
			turns++;


			Player currentPlayer = findPlayerInSession(ss, sc.getCurrentPlayerId());
			if (currentPlayer == null) break; // valami szokatlan történt

			// ha ez a játékos már befejezte, léptessünk tovább
			if (gameEngine.isPlayerFinished(currentPlayer, sc) || gameEngine.isPlayerLost(currentPlayer, sc)) {
				gameEngine.nextTurn(currentPlayer, ss, sc, 0);
				// nextTurn already updates sc.currentPlayerId inside GameEngine
				continue;
			}

			//  Ha van draw-stack, akkor azt kell először kezelni (stacket húzza)
			if (gameEngine.playerHaveToDrawStack(currentPlayer, sc)) {
				gameEngine.drawStackOfCards(currentPlayer, sc);
				// nem küldünk notifokat a szimulációban
				gameEngine.nextTurn(currentPlayer, ss, sc, 0);
				continue;
			}

			//  normál lépések: keressük a valid játékokat
			List<List<Card>> validPlays = calculateValidPlays(sc, currentPlayer);

			if (validPlays.isEmpty()) {
				// nincs letehető lap: húzzunk (vagy ha reshuffle kell, skip)
				if (sc.getDeck().isEmpty() && sc.getPlayedCards().size() > 1) {
					// reshuffle szükséges / lehetőség: a GameEngine skip-elést várja
					gameEngine.nextTurn(currentPlayer, ss, sc, 0);
					continue;
				} else {
					gameEngine.drawCard(sc, currentPlayer);
					// drawCard helyreállítja ownerId/position; folytassuk a következő játékossal
					gameEngine.nextTurn(currentPlayer, ss, sc, 0);
					continue;
				}
			}

			//  van legal lépés: válasszunk véletlenszerűt (flat random)
			List<Card> chosen = validPlays.get(rnd.nextInt(validPlays.size()));


			// alkalmazzuk a play-t (GameEngine.playCards módosítja a sc-t)
			gameEngine.playCards(requestMapper.toCardRequestList(chosen), currentPlayer, sc, ss);


			// ellenőrizzük: bot nyert-e
			List<Card> botHandNow = sc.getPlayerHands().get(mainBotClone.getPlayerId());
			int botHandSizeNow = botHandNow == null ? 0 : botHandNow.size();
			if (botHandSizeNow == 0) return 1.0; // megnyerte a kört

			// ellenőrizzük: bot kiesett-e (lostPlayers-ban)
			Set<Long> lostPlayers = gameSessionUtils.getSpecificGameDataTypeSet("lostPlayers", sc);
			if (lostPlayers.contains(mainBotClone.getPlayerId())) return 0.0;

			// folytatjuk a következő játékosra (nextTurn meghívása és a ciklus megy tovább)
			// nextTurn eltárolása/relevanciája: GameEngine.nextTurn is sets currentPlayerId
			handleAfterPlayCards(chosen,sc,currentPlayer,ss);
		}

		// maxTurns lejárt: heuristikus reward: mennyi lapot csökkentünk (normalizált 0..1)
		List<Card> botFinalHand = sc.getPlayerHands().get(mainBotClone.getPlayerId());
		int finalSize = botFinalHand == null ? 0 : botFinalHand.size();

		double progress = (double)(initialPlayerHandSize - finalSize) / (double)Math.max(1, initialPlayerHandSize);
		// clamp 0..1
		if (progress < 0) progress = 0;
		if (progress > 1) progress = 1;
		return progress;
	}

	private NextTurnResult applyPlayInClone(GameState sc, GameSession ss, Player botClone, List<Card> key) {
		gameEngine.playCards(requestMapper.toCardRequestList(key),botClone,sc,ss);

		return handleAfterPlayCards(key, sc,botClone,ss);
	}

	private boolean containsOVER(List<Card> key) {
		return key.getFirst().getRank().equals(CardRank.OVER);
	}

	private Player findPlayerInSession(GameSession session, Long playerId) {
		return session.getPlayers().stream()
				.filter(p -> p.getPlayerId().equals(playerId))
				.findFirst()
				.orElseThrow(() -> new IllegalStateException("Player not found in cloned session: " + playerId));
	}


	public GameSession cloneSessionLight(GameSession src) {
		List<Player> playerCopies = src.getPlayers().stream()
				.map(p -> Player.builder()
						.playerId(p.getPlayerId())
						.isBot(true)
						.seat(p.getSeat())
						.botDifficulty(p.getBotDifficulty())
						.build())
				.toList();

		return GameSession.builder()
				.gameSessionId(src.getGameSessionId())
				.gameStatus(src.getGameStatus())
				.players(playerCopies)
				.build();
	}

	@Override
	public GameState cloneState(GameState src) {

		Long gameSessionId=src.getGameSessionId();
		GameStatus gameStatus=src.getStatus();
		Long currentPlayerId=src.getCurrentPlayerId();

		// Deep copy lists
		List<Card>deck=src.getDeck().stream()
				.map(this::cloneCard)
				.collect(Collectors.toCollection(ArrayList::new));

		List<Card>playedCards=src.getPlayedCards().stream()
				.map(this::cloneCard)
				.collect(Collectors.toCollection(ArrayList::new));

		// Deep copy player hands
		Map<Long, List<Card>> handsCopy = new HashMap<>();
		src.getPlayerHands().forEach((id, hand) -> {
			handsCopy.put(id, hand.stream()
					.map(this::cloneCard)
					.collect(Collectors.toCollection(ArrayList::new)));
		});


		// Deep copy gameData (Set/Map típusok új példánnyal)
		Map<String, Object> dataCopy = new HashMap<>();
		src.getGameData().forEach((k, v) -> {
			if (v instanceof Set<?> setVal) {
				dataCopy.put(k, new HashSet<>(setVal));
			} else if (v instanceof Map<?,?> mapVal) {
				dataCopy.put(k, new HashMap<>(mapVal));
			} else {
				dataCopy.put(k, v);
			}
		});


		return GameState.builder()
				.playerHands(handsCopy)
				.playedCards(playedCards)
				.deck(deck)
				.status(gameStatus)
				.gameData(dataCopy)
				.currentPlayerId(currentPlayerId)
				.gameSessionId(gameSessionId)
				.build();
	}

	private Card cloneCard(Card c) {
	
		return Card.builder()
				.ownerId(c.getOwnerId())
				.cardId(c.getCardId())
				.position(c.getPosition())
				.suit(c.getSuit())
				.rank(c.getRank())
				.build();
	}



	private CardSuit mostCommonSuitInHand(List<Card> hand) {

		return hand.stream()
				.collect(Collectors.groupingBy(Card::getSuit, Collectors.counting()))
				.entrySet().stream()
				.max(Map.Entry.comparingByValue())
				.map(Map.Entry::getKey)
				.orElse(hand.getFirst().getSuit());
	}

}
