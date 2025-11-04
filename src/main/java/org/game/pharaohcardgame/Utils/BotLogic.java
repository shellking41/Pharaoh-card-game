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
import org.game.pharaohcardgame.Repository.GameSessionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadLocalRandom;
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
	private final ThreadPoolTaskScheduler taskScheduler;
	private final GameSessionRepository gameSessionRepository;

	@Value("${application.game.BOT.THINK_TIME_Ms}")
	private int BOT_THINK_TIME_Ms;
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

	public NextTurnResult botPlays(GameState gameState, GameSession gameSession, Player botPlayer){
		if(!botPlayer.getIsBot()) throw new IllegalStateException("This player is not bot");
		if(!gameState.getCurrentPlayerId().equals(botPlayer.getPlayerId()))
			throw new IllegalStateException("This bot is not the current player");

		AtomicReference<NextTurnResult> nextTurnRef = new AtomicReference<>();
		Random random = new Random();

		gameSessionUtils.updateGameState(gameSession.getGameSessionId(), current -> {

			// ELŐSZÖR ellenőrizzük, hogy kell-e stacket húzni
			if(gameEngine.playerHaveToDrawStack(botPlayer, current)){
				return handleDrawStackSituation(botPlayer, gameSession, current, nextTurnRef);
			}

			// Nincs stack húzási kötelezettség, normál játék
			List<List<Card>> validPlays = calculateValidPlays(current, botPlayer);

			if(validPlays.isEmpty()){
				return handleNoValidPlays(botPlayer, gameSession, current, nextTurnRef);
			}

			// Gyors heurisztikus döntések HARD botoknak
			if(botPlayer.getBotDifficulty() == BotDifficulty.HARD){
				List<Card> heuristicChoice = tryHeuristicMove(validPlays, botPlayer, current, gameSession);
				if(heuristicChoice != null){
					handleCardPlay(heuristicChoice, botPlayer, gameSession, current, nextTurnRef);
					return current;
				}
			}

			// Van játszható kártya - döntés húzásról
			boolean shouldDrawInsteadOfPlay = shouldDrawInsteadOfPlaying(botPlayer, current, random);

			if(shouldDrawInsteadOfPlay && !current.getDeck().isEmpty()){
				Card drawnCard = gameEngine.drawCard(current, botPlayer);
				notificationHelpers.sendDrawCardNotification(
						gameSession.getPlayers(), botPlayer,
						Collections.singletonList(drawnCard),
						current.getDeck().size(),
						current.getPlayedCards().size(),
						current
				);
				NextTurnResult nextTurnResult = gameEngine.nextTurn(botPlayer, gameSession, current, 0);
				nextTurnRef.set(nextTurnResult);
				return current;
			}

			// Monte Carlo alapú választás
			List<Card> chosen = chooseMonteCarloPlay(validPlays, botPlayer, current, gameSession, 50);
			handleCardPlay(chosen, botPlayer, gameSession, current, nextTurnRef);

			return current;
		});

		return nextTurnRef.get();
	}
//todo: itt esik el a kód olyan mint ha a egy bot finishel majd egy masik is finishel vagy letesz egy kartyat akkor megbolondulna UPDATE: AKKOR ESIK EL HA OVERT TESZ LE
	private NextTurnResult handleAfterPlayCards(List<Card> chosen,GameState current,Player botPlayer,GameSession gameSession){
		if (!chosen.isEmpty() && chosen.getFirst().getRank() == CardRank.OVER) {
			List<Card> hand = current.getPlayerHands().get(botPlayer.getPlayerId());
			//TODO: AZ A BAJ HOGY AMIKOR A BOT FINISHEL OVERREL AKKOR NINCS MAR A KEZEBE SEMMI SZOVAL A HAND URES ES NEM TUDJA A MOST COMMONSUITINHANDET MUKODTETNI
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

		List<PlayedCardResponse> playedCardResponses= responseMapper.toPlayedCardResponseListFromCards(current.getPlayedCards());

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

	public List<Card> chooseMonteCarloPlay(List<List<Card>> validPlays, Player botPlayer, GameState realState, GameSession realSession, int playoutsPerMove) {
		// Ellenőrizzük, hogy van-e érvényes lépés
		if (validPlays == null || validPlays.isEmpty()) {
			log.warn("No valid plays available for bot player {}", botPlayer.getPlayerId());
			return null;
		}

		// Ha csak egy lehetőség van, ne futtassunk Monte Carlot
		if (validPlays.size() == 1) {
			log.info("Only one valid play, skipping Monte Carlo for bot {}", botPlayer.getPlayerId());
			return validPlays.get(0);
		}

		Map<List<Card>, DoubleAdder> acc = new HashMap<>();
		for (var c : validPlays) {
			acc.put(c, new DoubleAdder());
		}

		// Csökkentsük a playoutok számát nagy választék esetén
		int actualPlayouts = Math.min(playoutsPerMove, 100); // Max 100 playout

		try {
			for (var entry : acc.entrySet()) {
				for (int i = 0; i < actualPlayouts; i++) {
					try {
						GameState sc = cloneState(realState);
						GameSession ss = cloneSessionLight(realSession);
						Player botClone = findPlayerInSession(ss, botPlayer.getPlayerId());

						// root apply
						NextTurnResult nextTurnResult = applyPlayInClone(sc, ss, botClone, entry.getKey());

						// handle OVER: choose suit heuristically
						if (containsOVER(entry.getKey())) {
							List<Card> handAfterPlay = sc.getPlayerHands().get(botClone.getPlayerId());
							if (handAfterPlay != null && !handAfterPlay.isEmpty()) {
								CardSuit suit = mostCommonSuitInHand(handAfterPlay);
								sc.getGameData().put("suitChangedTo", suit);
							}
						}

						SplittableRandom random = new SplittableRandom();
						double reward = runPlayout(sc, ss, nextTurnResult.nextPlayer(), random, 50);
						acc.get(entry.getKey()).add(reward);

					} catch (Exception e) {
						log.error("Error during Monte Carlo playout for bot {}: {}", botPlayer.getPlayerId(), e.getMessage());
						// Folytatjuk a következő playouttal
					}
				}
			}

			// Rendezzük a lépéseket score szerint
			List<Map.Entry<List<Card>, Double>> sortedPlays = acc.entrySet().stream()
					.map(e -> Map.entry(e.getKey(), e.getValue().sum() / actualPlayouts))
					.sorted(Comparator.comparingDouble(Map.Entry::getValue))
					.toList();

			if (sortedPlays.isEmpty()) {
				log.warn("No plays evaluated in Monte Carlo, choosing random for bot {}", botPlayer.getPlayerId());
				return validPlays.get(new Random().nextInt(validPlays.size()));
			}

			// Választás nehézségi szint alapján
			List<Card> chosenPlay;
			BotDifficulty difficulty = botPlayer.getBotDifficulty();

			if (difficulty == BotDifficulty.EASY) {
				// EASY: A legrosszabb lépést választja (legkisebb score)
				chosenPlay = sortedPlays.getFirst().getKey();
				double worstScore = sortedPlays.getFirst().getValue();
				log.info("EASY Bot {} chose WORST play with score: {}", botPlayer.getPlayerId(), worstScore);

			} else if (difficulty == BotDifficulty.MEDIUM) {
				// MEDIUM: A középső lépést választja
				int middleIndex = sortedPlays.size() / 2;
				chosenPlay = sortedPlays.get(middleIndex).getKey();
				double middleScore = sortedPlays.get(middleIndex).getValue();
				log.info("MEDIUM Bot {} chose MIDDLE play with score: {} (index: {}/{})",
						botPlayer.getPlayerId(), middleScore, middleIndex, sortedPlays.size());

			} else { // HARD
				// HARD: A legjobb lépést választja (legnagyobb score)
				chosenPlay = sortedPlays.getLast().getKey();
				double bestScore = sortedPlays.getLast().getValue();
				log.info("HARD Bot {} chose BEST play with score: {}", botPlayer.getPlayerId(), bestScore);
			}

			return chosenPlay;

		} catch (Exception e) {
			log.error("Critical error in Monte Carlo for bot {}: {}", botPlayer.getPlayerId(), e.getMessage(), e);
			// Fallback: random választás
			return validPlays.get(new Random().nextInt(validPlays.size()));
		}
	}

	private double runPlayout(GameState sc, GameSession ss, Player mainBotClone, SplittableRandom rnd, int maxTurns) {
		if(sc==null || ss==null || mainBotClone==null)return 0.0;

		List<Card> initialPlayerHand=sc.getPlayerHands().get(mainBotClone.getPlayerId());
		int initialPlayerHandSize=initialPlayerHand.size();

		int turns=0;
		while (turns < maxTurns) {
			turns++;

			if(sc.getGameData().getOrDefault("roundEnded", false).equals(true)){
				// ellenőrizzük: bot nyert-e
				List<Card> botHandNow = sc.getPlayerHands().get(mainBotClone.getPlayerId());
				int botHandSizeNow = botHandNow == null ? 0 : botHandNow.size();
				if (botHandSizeNow == 0) return 1.0; // megnyerte a kört

				// ellenőrizzük: bot kiesett-e (lostPlayers-ban)
				Set<Long> lostPlayers = gameSessionUtils.getSpecificGameDataTypeSet("lostPlayers", sc);
				if (lostPlayers.contains(mainBotClone.getPlayerId())) return 0.0;
			}

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

	private GameState handleDrawStackSituation(Player botPlayer,
											   GameSession gameSession,
											   GameState current,
											   AtomicReference<NextTurnResult> nextTurnRef) {
		// EASY bot SOHA nem counterel
		if(botPlayer.getBotDifficulty() == BotDifficulty.EASY){
			List<Card> drawnCards = gameEngine.drawStackOfCards(botPlayer, current);
			NextTurnResult nextTurnResult = gameEngine.nextTurn(botPlayer, gameSession, current, 0);
			nextTurnRef.set(nextTurnResult);
			notificationHelpers.sendDrawCardNotification(
					gameSession.getPlayers(), botPlayer, drawnCards,
					current.getDeck().size(), current.getPlayedCards().size(), current
			);
			return current;
		}

		// MEDIUM és HARD bot megpróbál counterelni
		List<List<Card>> validPlays = calculateValidPlays(current, botPlayer);
		List<List<Card>> counterPlays = findCounterPlays(validPlays);

		if(!counterPlays.isEmpty()){
			// Csökkentett playout counter esetén (gyors döntés kell)
			int playouts = botPlayer.getBotDifficulty() == BotDifficulty.HARD ? 30 : 20;
			List<Card> chosen = chooseMonteCarloPlay(counterPlays, botPlayer, current, gameSession, playouts);
			handleCardPlay(chosen, botPlayer, gameSession, current, nextTurnRef);
		} else {
			// Nincs counter -> húzás
			List<Card> drawnCards = gameEngine.drawStackOfCards(botPlayer, current);
			NextTurnResult nextTurnResult = gameEngine.nextTurn(botPlayer, gameSession, current, 0);
			nextTurnRef.set(nextTurnResult);
			notificationHelpers.sendDrawCardNotification(
					gameSession.getPlayers(), botPlayer, drawnCards,
					current.getDeck().size(), current.getPlayedCards().size(), current
			);
		}
		return current;
	}

	private List<List<Card>> findCounterPlays(List<List<Card>> validPlays) {
		return validPlays.stream()
				.filter(cards -> {
					Card firstCard = cards.getFirst();
					return firstCard.getRank().equals(CardRank.VII) ||
							(firstCard.getRank().equals(CardRank.JACK) &&
									firstCard.getSuit().equals(CardSuit.LEAVES));
				})
				.toList();
	}

	private GameState handleNoValidPlays(Player botPlayer,
										 GameSession gameSession,
										 GameState current,
										 AtomicReference<NextTurnResult> nextTurnRef) {
		// Ha nem tudunk reshufflezni akkor skippeljük a kört
		if (current.getDeck().isEmpty() && current.getPlayedCards().size() > 1) {
			NextTurnResult nextTurnResult = gameEngine.nextTurn(botPlayer, gameSession, current, 0);
			nextTurnRef.set(nextTurnResult);
			notificationHelpers.sendTurnSkipped(gameSession, botPlayer, current);
			return current;
		}

		Card drawnCard = gameEngine.drawCard(current, botPlayer);
		notificationHelpers.sendDrawCardNotification(
				gameSession.getPlayers(), botPlayer,
				Collections.singletonList(drawnCard),
				current.getDeck().size(), current.getPlayedCards().size(), current
		);
		NextTurnResult nextTurnResult = gameEngine.nextTurn(botPlayer, gameSession, current, 0);
		nextTurnRef.set(nextTurnResult);
		return current;
	}

	private boolean shouldDrawInsteadOfPlaying(Player botPlayer,
											   GameState current,
											   Random random) {
		if(botPlayer.getBotDifficulty() == BotDifficulty.EASY){
			return random.nextDouble() < 0.10; // 10%
		} else if(botPlayer.getBotDifficulty() == BotDifficulty.MEDIUM){
			return random.nextDouble() < 0.05; // 5%
		}
		return false; // HARD soha nem húz ha tud játszani
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
	//todo: amikor a bot nyert akkor valamiert nem volt elkuldve a playedCards amikor uj kor kezdodott
	//todo: A montecarlo tul lassu es ilyen 60-50% os esélyek vannak ami nem nagyon nagy elteres
	//todo: amikor a bot nyert es a first playedcard 7es lett akkor kell huznom 3mat.

	//todo: itt is meg kell csinalni azt hogy meghivjuk a determineWhoWillStartTheRound-t

	public void handleIfNextPlayerIsBot(NextTurnResult next, GameSession gameSession) {
		if (next.nextPlayer().getIsBot()) {
			// első hívás azonnal (vagy kis késleltetéssel)
			scheduleBotIteration(next, gameSession, 0);
		}
	}
	private void scheduleBotIteration(NextTurnResult next, GameSession gameSession, long delayMs) {
		Instant runAt = Instant.now().plusMillis(BOT_THINK_TIME_Ms);

		try {
			taskScheduler.schedule(() -> {
				try {
					processOneBotIteration(next, gameSession);
				} catch (Exception e) {
					log.error("❌ Bot iteration failed for game {}, fallback: draw card",
							gameSession.getGameSessionId(), e);
					botDrawCardAndSkipTurn(next.nextPlayer(), gameSession);
				}
			}, runAt);

		} catch (RejectedExecutionException e) {
			log.error("❌ Scheduler rejected for game {}, fallback: draw card",
					gameSession.getGameSessionId());
			botDrawCardAndSkipTurn(next.nextPlayer(), gameSession);
		}
	}

	//ez azért kell mert ha elfogy a que a schedulerbe akkor ne álljon meg a játék
	private void botDrawCardAndSkipTurn(Player botPlayer, GameSession gameSession) {
		try {
			AtomicReference<NextTurnResult> nextTurnRef = new AtomicReference<>();
			AtomicReference<Card> drawnCardRef = new AtomicReference<>();

			GameState newGameState = gameSessionUtils.updateGameState(
					gameSession.getGameSessionId(),
					current -> {
						// Húz 1 kártyát (ha van deck)
						if (!current.getDeck().isEmpty()) {
							Card drawnCard = gameEngine.drawCard(current, botPlayer);
							drawnCardRef.set(drawnCard);
						}

						// Következő játékos
						NextTurnResult nextTurnResult = gameEngine.nextTurn(
								botPlayer,
								gameSession,
								current,
								0
						);
						nextTurnRef.set(nextTurnResult);

						return current;
					}
			);

			// Értesítések
			if (drawnCardRef.get() != null) {
				notificationHelpers.sendDrawCardNotification(
						gameSession.getPlayers(),
						botPlayer,
						Collections.singletonList(drawnCardRef.get()),
						newGameState.getDeck().size(),
						newGameState.getPlayedCards().size(),
						newGameState
				);
			}

			NextTurnResult next = nextTurnRef.get();
			notificationHelpers.sendNextTurnNotification(
					next.nextPlayer(),
					gameSession.getPlayers(),
					next.nextSeatIndex()
			);

			// Ha a következő is bot, folytatjuk
			handleIfNextPlayerIsBot(next, gameSession);

		} catch (Exception e) {
			log.error("❌ CRITICAL: Even fallback failed for game {}",
					gameSession.getGameSessionId(), e);
			// Végső mentőöv: játék vége
			//endGameWithError(gameSession);
		}
	}
	private void processOneBotIteration(NextTurnResult next, GameSession gameSession) {
		try {
			Player currentPlayer = next.nextPlayer();

			// Frissített gameState lekérése
			GameState gameState = gameSessionUtils.getGameState(gameSession.getGameSessionId());

			NextTurnResult nextTurnResult = null;

			if (!gameEngine.isPlayerFinished(currentPlayer, gameState) &&
					!gameEngine.isPlayerLost(currentPlayer, gameState)) {

				if (currentPlayer.getBotDifficulty() == BotDifficulty.EASY) {
					nextTurnResult = botPlays(gameState, gameSession, currentPlayer);
				} else {
					nextTurnResult = botPlays(gameState, gameSession, currentPlayer);
				}


				// új gameState után
				gameState = gameSessionUtils.getGameState(gameSession.getGameSessionId());
				//ha vége a jateknak akkor toroljuk a gamestatust es ertesitjuk a playereket
				if(gameState.getStatus().equals(GameStatus.FINISHED)){
					gameSession.setGameStatus(GameStatus.FINISHED);
					gameSessionRepository.save(gameSession);
					gameSessionUtils.deleteGameState(gameSession.getGameSessionId());
					notificationHelpers.sendGameEnded(gameSession,"Game is finished");
					return;
				}
				Boolean roundEnded = (Boolean) gameState.getGameData().getOrDefault("roundEnded", false);
				if (roundEnded) {

					log.info("Bot {} finished the round, starting new round", currentPlayer.getPlayerId());

					AtomicReference<NextTurnResult> newRoundStartRef = new AtomicReference<>();
					gameSessionUtils.updateGameState(gameSession.getGameSessionId(), current -> {
						NextTurnResult startNextTurn = gameEngine.determineWhoWillStartTheRound(gameSession, current);
						newRoundStartRef.set(startNextTurn);
						current.getGameData().remove("roundEnded");
						current.setCurrentPlayerId(startNextTurn.nextPlayer().getPlayerId());
						return current;
					});
					nextTurnResult = newRoundStartRef.get();
				}

			} else {
				nextTurnResult = gameEngine.nextTurn(currentPlayer, gameSession, gameState, 0);
			}

			// értesítések
			notificationHelpers.sendNextTurnNotification(
					nextTurnResult.nextPlayer(),
					gameSession.getPlayers(),
					nextTurnResult.nextSeatIndex()
			);

			Player nextPlayer = nextTurnResult.nextPlayer();

			// friss gameState és egyéb értesítések
			GameState newState = gameSessionUtils.getGameState(gameSession.getGameSessionId());
			Map<Long, Integer> drawStack = gameSessionUtils.getSpecificGameDataTypeMap("drawStack", newState);
			if (gameEngine.playerHaveToDrawStack(nextPlayer, newState)) {
				notificationHelpers.sendPlayerHasToDrawStack(nextPlayer, drawStack);
			}
			Set<Long> skippedPlayers = gameSessionUtils.getSpecificGameDataTypeSet("skippedPlayers", newState);
			notificationHelpers.sendSkippedPlayersNotification(skippedPlayers, gameSession.getPlayers());

			// Ha a következő is bot, schedule-oljuk újra 2-3s késleltetéssel
			if (nextPlayer.getIsBot()) {
				long delay = BOT_THINK_TIME_Ms + ThreadLocalRandom.current().nextLong(1000); // 1000-1999 ms emberibb effekt
				scheduleBotIteration(nextTurnResult, gameSession, delay);
			}

		} catch (Exception e) {
			log.error("Error processing bot iteration for game " + gameSession.getGameSessionId(), e);
			// hiba esetén érdemes dönteni: újrapróbál, leállít vagy jelzi a játékot
		}
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

	/**
	 * Gyors heurisztikus lépések HARD botoknak - Monte Carlo nélkül
	 * Returns null ha nincs egyértelmű jó lépés
	 */
	private List<Card> tryHeuristicMove(List<List<Card>> validPlays,
										Player botPlayer,
										GameState gameState,
										GameSession gameSession) {
		List<Card> hand = gameState.getPlayerHands().get(botPlayer.getPlayerId());

		// WINNING MOVE: Ha el tudja érni hogy 0 lap maradjon
		Optional<List<Card>> winningMove = validPlays.stream()
				.filter(play -> play.size() == hand.size())
				.findFirst();
		if(winningMove.isPresent()){
			log.info("HARD bot {} found WINNING move!", botPlayer.getPlayerId());
			return winningMove.get();
		}

		List<List<Card>> acePlays = validPlays.stream()
				.filter(cards -> cards.stream().allMatch(c -> c.getRank() == CardRank.ACE))
				.toList();

		if(!acePlays.isEmpty()){
			// Aktív játékosok száma (akik még játékban vannak)
			List<Player> activePlayers=gameEngine.getActivePlayers(gameState,gameSession);
			long activePlayerCount =activePlayers.size();

			// Mennyi Ász kell ahhoz hogy újra ő jöjjön egy körben
			int acesNeededForSelfTurn = (int)(activePlayerCount - 1);

			// Megkeressük a leghosszabb Ász sorozatot amit le tud rakni
			Optional<List<Card>> longestAcePlay = acePlays.stream()
					.max(Comparator.comparingInt(List::size));

            int totalAces = longestAcePlay.get().size();

            // Ha van legalább annyi Ász amennyi kell egy körre
            if(totalAces >= acesNeededForSelfTurn){
                // Ellenőrizzük hogy tényleg ő jönne-e újra
                NextTurnResult testNext = gameSessionUtils.calculateNextTurn(
                        botPlayer, gameSession, gameState, acesNeededForSelfTurn
                );

                if(testNext.nextPlayer().getPlayerId().equals(botPlayer.getPlayerId())){
                    // ✨ Pontosan annyit rakjunk le amennyi kell (nem többet!)
                    List<Card> optimalAcePlay = longestAcePlay.get()
                            .subList(0, acesNeededForSelfTurn);

                    log.info("HARD bot {} plays {} ACE(s) to get turn back (has {} total, needs {} per turn, {} active players)",
                            botPlayer.getPlayerId(),
                            acesNeededForSelfTurn,
                            totalAces,
                            acesNeededForSelfTurn,
                            activePlayerCount);

                    return optimalAcePlay;
                }
            }
        }

		// STREAK (égetés): Ha 4 azonos rangú van
		Optional<List<Card>> streakPlay = validPlays.stream()
				.filter(play -> play.size() == 4)
				.findFirst();
		if(streakPlay.isPresent()){
			log.info("HARD bot {} performs STREAK (4 cards)!", botPlayer.getPlayerId());
			return streakPlay.get();
		}

		return null; // Nincs egyértelmű heurisztikus választás -> Monte Carlo
	}

	private boolean isSpecialCard(Card card) {
		return card.getRank() == CardRank.VII ||
				card.getRank() == CardRank.ACE ||
				card.getRank() == CardRank.OVER ||
				(card.getRank() == CardRank.JACK && card.getSuit() == CardSuit.LEAVES);
	}

	private CardSuit mostCommonSuitInHand(List<Card> hand) {
		if(hand.isEmpty()){
			//fallback, ez azert kellett mert ha a bot finishel és az utolso kartya amit lettett over volt akkor mar a hand ures volt es a hand.stream dobott egy exceptiont
			return CardSuit.HEARTS;
		}
		return hand.stream()
				.collect(Collectors.groupingBy(Card::getSuit, Collectors.counting()))
				.entrySet().stream()
				.max(Map.Entry.comparingByValue())
				.map(Map.Entry::getKey)
				.orElse(hand.getFirst().getSuit());
	}

}
