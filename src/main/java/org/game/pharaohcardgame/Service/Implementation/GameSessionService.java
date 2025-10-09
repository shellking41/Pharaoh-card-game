package org.game.pharaohcardgame.Service.Implementation;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.game.pharaohcardgame.Enum.CardRank;
import org.game.pharaohcardgame.Enum.CardSuit;
import org.game.pharaohcardgame.Enum.GameStatus;
import org.game.pharaohcardgame.Exception.GameSessionNotFoundException;
import org.game.pharaohcardgame.Exception.PlayerNotFoundException;
import org.game.pharaohcardgame.Exception.RoomNotFoundException;
import org.game.pharaohcardgame.Model.*;
import org.game.pharaohcardgame.Model.DTO.Request.*;
import org.game.pharaohcardgame.Model.DTO.Response.*;
import org.game.pharaohcardgame.Model.DTO.ResponseMapper;
import org.game.pharaohcardgame.Model.RedisModel.Card;
import org.game.pharaohcardgame.Model.RedisModel.GameState;
import org.game.pharaohcardgame.Model.Results.NextTurnResult;
import org.game.pharaohcardgame.Repository.BotRepository;
import org.game.pharaohcardgame.Repository.GameSessionRepository;
import org.game.pharaohcardgame.Repository.PlayerRepository;
import org.game.pharaohcardgame.Repository.RoomRepository;
import org.game.pharaohcardgame.Service.IGameSessionService;
import org.game.pharaohcardgame.Utils.BotLogic;
import org.game.pharaohcardgame.Utils.GameEngine;
import org.game.pharaohcardgame.Utils.GameSessionUtils;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

@Service
@RequiredArgsConstructor
@Slf4j
//todo: kell egy olyan endpoint ami arra van hogy a playerek felhuzzak a acard stackeket.

//todo: megkell csinalni azt amikor belepunk loginnal és van gamesessiona a usernek akkor a gamesession jelenjen meg az odlalon.(frontend)
public class GameSessionService implements IGameSessionService {

	private final AuthenticationService authenticationService;
	private final RoomService roomService;
	private final RoomRepository roomRepository;
	private final ResponseMapper responseMapper;
	private final GameSessionRepository gameSessionRepository;
	private final SimpMessagingTemplate simpMessagingTemplate;
	private final BotRepository botRepository;
	private final GameSessionUtils gameSessionUtils;
	private final GameEngine gameEngine;
	private final PlayerRepository playerRepository;
	private final CacheManager cacheManager;
	private final BotLogic botLogic;


	@Override
	//todo: még azt kell ebbe beleirni hogy ha a csak egy player van a szobvaba akkor ne lehessen elinditani a metcset
	public SuccessMessageResponse startGame(GameStartRequest gameStartRequest) {
		User gamemaster=authenticationService.getAuthenticatedUser();


		try {
			Room room = roomRepository.findByIdWithParticipants(gameStartRequest.getRoomId())
					.orElseThrow(() -> new RoomNotFoundException("Room not Found"));

			if (hasActiveGame(room)) {
				return responseMapper.createSuccessResponse(false, "A szobában már fut egy játék!");
			}

			List<Bot> bots = botRepository.loadBots(room.getRoomId());
			roomService.checkPermission(room, gamemaster);

			GameSession gameSession = GameSession.builder()
					.gameStatus(GameStatus.IN_PROGRESS)
					.room(room)
					.build();

			// Create players list
			List<Player> players = new ArrayList<>();
			int seatCounter = 1;

			// Add participants as players
			for (User participant : room.getParticipants()) {
				Player player = Player.builder()
						.user(participant)
						.gameSession(gameSession)
						.isBot(false)
						.seat(seatCounter++)
						.build();
				players.add(player);
			}

			// Add bots as players
			for (Bot bot : bots) {
				Player player = Player.builder()
						.bot(bot)
						.gameSession(gameSession)
						.isBot(true)
						.seat(seatCounter++)
						.botDifficulty(bot.getDifficulty())
						.build();
				players.add(player);

				// Set the reverse relationship
				bot.setBotPlayer(player);
			}

			// Add players to game session
			gameSession.setPlayers(players);

			gameSessionRepository.save(gameSession);
			GameState gameState=gameEngine.initGame(gameSession.getGameSessionId(), players);


			for (Player player : players) {
				if (!player.getIsBot()) {
					PlayerHandResponse playerHand = gameSessionUtils.getPlayerHand(
							gameSession.getGameSessionId(), player.getPlayerId());

					List<Card> playedCards =gameState.getPlayedCards();
					List<PlayedCardResponse> playedCardResponses = responseMapper.toPlayedCardResponseListFromCards(playedCards);
					GameSessionResponse personalizedResponse = responseMapper.toGameSessionResponse(gameSession,gameSession.getPlayers(),playerHand,playedCardResponses,gameState);

					simpMessagingTemplate.convertAndSendToUser(
							player.getUser().getId().toString(),
							"/queue/game/start",
							personalizedResponse
					);
				}
			}
			return responseMapper.createSuccessResponse(true, "Game has been successfully started");

		} catch (AccessDeniedException e) {
			return responseMapper.createSuccessResponse(false, e.getMessage());
		}
	}
	@Override
	public CurrentTurnResponse getCurrentTurnInfo(){
		User user=authenticationService.getAuthenticatedUser();
		GameSession gameSession=gameSessionRepository.findByRoomIdAndGameStatusWithPlayers(user.getCurrentRoom().getRoomId(),GameStatus.IN_PROGRESS)
				.orElseThrow(()->new GameSessionNotFoundException("Active Game not Found"));

		Long playerId=getPlayerIdFromUserAndGameSession(user,gameSession);

		Player player=playerRepository.findById(playerId)
				.orElseThrow(()-> new PlayerNotFoundException("player not found"));

		GameState gameState=gameSessionUtils.getGameState(gameSession.getGameSessionId());

		Player currantPlayer=playerRepository.findById(gameState.getCurrentPlayerId())
				.orElseThrow(()-> new PlayerNotFoundException("player not found"));

		return CurrentTurnResponse.builder()
				.isYourTurn(gameEngine.isPlayersTurn( player,  gameState))
				.currentSeat(currantPlayer.getSeat())
				.build();

	}



	@Override
	public GameSessionResponse getGameSession() {
		User user = authenticationService.getAuthenticatedUser();
		GameSession gameSession = gameSessionRepository.findByRoomIdAndGameStatusWithPlayers(
						user.getCurrentRoom().getRoomId(), GameStatus.IN_PROGRESS)
				.orElseThrow(() -> new GameSessionNotFoundException("Active Game not Found"));

		Long playerId = getPlayerIdFromUserAndGameSession(user, gameSession);

		PlayerHandResponse playerHand = gameSessionUtils.getPlayerHand(
				gameSession.getGameSessionId(), playerId);

		GameState gameState = gameSessionUtils.getGameState(gameSession.getGameSessionId());
		List<Card> playedCards = gameState.getPlayedCards();
		List<PlayedCardResponse> playedCardResponses = responseMapper.toPlayedCardResponseListFromCards(playedCards);

		GameSessionResponse response = responseMapper.toGameSessionResponse(
				gameSession, gameSession.getPlayers(), playerHand, playedCardResponses,gameState);



		return response;
	}

	@Override
	//TODO:KELL IDE EGY TRYCATCH
	//todo: lehet ide kell majd a transacitonal, de aza problema hogy a nextturn nem kerul bele a transactionba ezért nem a legfrissebb gamestatet hasznalja.Kivettem innen a transactionalt, igy megy
	public GameSessionResponse drawCard(DrawCardRequest drawCardRequest) {

		Player currentPlayer=playerRepository.findById(drawCardRequest.getPlayerId())
				.orElseThrow(()-> new PlayerNotFoundException("Player not found"));

		GameSession gameSession = gameSessionRepository.findByIdWithPlayers(currentPlayer.getGameSession().getGameSessionId())
				.orElseThrow(() -> new GameSessionNotFoundException("GameSession not found"));

		List<Player> players = gameSession.getPlayers();

		//ez azert kell mert lambdan belul nem lehet modositani olyan valtozokat amiket a lamban kivol decralaltunk
		AtomicReference<NextTurnResult> nextTurnRef = new AtomicReference<>();
		AtomicReference<Card> drawnCardRef = new AtomicReference<>();
		AtomicReference<Integer> deckSizeRef = new AtomicReference<>();

		GameState newGameState=gameSessionUtils.updateGameState(gameSession.getGameSessionId(),current->{
			if(gameEngine.isPlayerFinished(currentPlayer,current)){
				throw new IllegalStateException("You Are already finished");
			}
			if(gameEngine.isPlayerLost(currentPlayer,current)){
				throw new IllegalStateException("You already lost");
			}
			if(!gameEngine.isPlayersTurn(currentPlayer,current)){
				throw new IllegalStateException("This is not your turn");
			};

			//ha kell huznia kartyat
			if(gameEngine.playerHaveToDrawStack(currentPlayer,current)){
				throw new IllegalStateException("You have to draw stack of cards");
			}

			Card drawnCard= gameEngine.drawCard(current,currentPlayer);
			if(drawnCard==null && current.getDeck().isEmpty()){
				throw new IllegalStateException("No more cards in deck");
			}
			drawnCardRef.set(drawnCard);
			deckSizeRef.set(current.getDeck().size());

			NextTurnResult nextTurnResult=gameEngine.nextTurn(currentPlayer,gameSession,current,0);
			nextTurnRef.set(nextTurnResult);

			return current;
		});

		//itt ha huzunk egy kartyat akkor a kartyahuzo user lassa a kartyat mások nem kapjak meg a tartalmát
		sendDrawCardNotification(players,currentPlayer, Collections.singletonList(drawnCardRef.get()),deckSizeRef.get(),newGameState.getPlayedCards().size(),newGameState);


		//kikuldjuk a kovetkezo kor notifkációit
		NextTurnResult next = nextTurnRef.get();
		sendNextTurnNotification(next.nextPlayer(),players, next.nextSeatIndex());

		handleIfNextPlayerIsBot(next,gameSession);
		return null;
	}


	@Override
	public void playCards(PlayCardsRequest playCardsRequest) {

		if (playCardsRequest.getPlayCards() == null || playCardsRequest.getPlayCards().isEmpty()){
			throw new IllegalArgumentException("Play cards are empty");
		}

		Player currentPlayer=playerRepository.findById(playCardsRequest.getPlayerId())
				.orElseThrow(()-> new PlayerNotFoundException("Player not found"));

		GameSession gameSession = gameSessionRepository.findByIdWithPlayers(currentPlayer.getGameSession().getGameSessionId())
				.orElseThrow(() -> new GameSessionNotFoundException("GameSession not found"));



		//ez azert kell mert lambdan belul nem lehet modositani olyan valtozokat amiket a lamban kivol decralaltunk
		AtomicReference<NextTurnResult> nextTurnRef = new AtomicReference<>();

		//a getgameSTATE helyett egy lock alatt adjuk át a gamestatet a methodoknak mert igy megakadályozhassuk a raceconditiont
		GameState gameState=gameSessionUtils.updateGameState(gameSession.getGameSessionId(),current ->{

			if(gameEngine.isPlayerFinished(currentPlayer,current)){
				throw new IllegalStateException("You Are already finished");
			}
			if(gameEngine.isPlayerLost(currentPlayer,current)){
				throw new IllegalStateException("You already lost");
			}

			if(!gameEngine.isPlayersTurn(currentPlayer,current)){
				throw new IllegalStateException("This is not your turn");
			};


			if(!gameEngine.areCardsValid(currentPlayer,playCardsRequest.getPlayCards(),current)){
				throw new IllegalArgumentException("Invalid Cards");
			}

			if(!gameEngine.checkCardsPlayability(playCardsRequest.getPlayCards(),current)){
				throw new IllegalArgumentException("Card's suit or rank are not matching");
			};
			gameEngine.ensureNoDuplicatePlayCards(playCardsRequest.getPlayCards());

			CardRequest firstCard=playCardsRequest.getPlayCards().getFirst();
			//ha kell huznia kartyat akkor nem engedjuk hogy rakjon le kartyat és amikor kell huznia kartyat és akar letenni kartyat de a kartya nem hetes akkor exception
			if(!(firstCard.getRank().equals(CardRank.VII) || (firstCard.getRank().equals(CardRank.JACK) && firstCard.getSuit().equals(CardSuit.LEAVES))) && gameEngine.playerHaveToDrawStack(currentPlayer,current)){
				throw new IllegalStateException("You have to draw stack of cards");
			}


			gameEngine.playCards(playCardsRequest.getPlayCards(),currentPlayer,current,gameSession);

			CardRequest lastCard=playCardsRequest.getPlayCards().getLast();

			//ha over a kard rangja akkor vegye figyelembe azt hogy mire akarja váltani a színt
			if(lastCard.getRank().equals(CardRank.OVER) && playCardsRequest.getChangeSuitTo()!=null) gameEngine.suitChangedTo(playCardsRequest.getChangeSuitTo(),current);

			//ha a kartya lerakasakor olyan kartyat raktunk le ami skippeli a plajereket akkor az szerint kezdodik el a turn.
			Set<Long> skippedPlayers = gameSessionUtils.getSpecificGameDataTypeSet("skippedPlayers", current);
			//ha a player égetett akkor ujra jojjon o
			Long streakPlayerId= gameSessionUtils.getSpecificGameData("streakPlayerId",current,null);
			NextTurnResult nextTurnResult;

			if(streakPlayerId!=currentPlayer.getPlayerId()){
				nextTurnResult = gameEngine.nextTurn(currentPlayer, gameSession, current,skippedPlayers.size());
			}else{
				//ha egetett a player akkor o kovetkezzen ujra //todo ezt megkell csinalni  majd a bot oldalon is.
				nextTurnResult= new NextTurnResult(currentPlayer, currentPlayer.getSeat());
				current.getGameData().remove("streakPlayerId");
			}


			// Mentjük a referenciába, hogy a lambda végén kívül is elérjük
			nextTurnRef.set(nextTurnResult);


			//ha húznia kell a következő usernek több kartyat akkor arrol értesítjük
			Map<Long,Integer> drawStack = gameSessionUtils.getSpecificGameDataTypeMap("drawStack", current);
			if(gameEngine.playerHaveToDrawStack(nextTurnResult.nextPlayer(),current)){
				//ha kell huznia akkor elkuldjuk mennyit.
				sendPlayerHasToDrawStack(nextTurnResult.nextPlayer(),drawStack);
			}

			return current;
		});

		NextTurnResult next = nextTurnRef.get();


		List<PlayedCardResponse> playedCardResponses= responseMapper.toPlayedCardResponseListFromCardRequests(playCardsRequest.getPlayCards());

		int playedCardsSize = gameState.getPlayedCards().size();

		//ez azt kuldi el hogy milyen kartyak vannak már letéve
		Map<String, Object> payload = new HashMap<>();
		payload.put("playedCards", playedCardResponses);
		payload.put("playedCardsSize", playedCardsSize);

		simpMessagingTemplate.convertAndSend(
				"/topic/game/" + gameSession.getGameSessionId() + "/played-cards",
				payload
		);

		//ez elkuldi a frissitett player handet hogy a játszo usernek a kezebol eltunnjon a kartya es mas playerek is lassak ezt
		for (Player player : gameSession.getPlayers()) {
			if (!player.getIsBot()) {
				PlayerHandResponse playerHand = gameSessionUtils.getPlayerHand(
						gameSession.getGameSessionId(), player.getPlayerId());



				simpMessagingTemplate.convertAndSendToUser(
						player.getUser().getId().toString(),
						"/queue/game/play-cards",
						PlayCardResponse.builder().playerHand(playerHand).gameData(gameState.getGameData()).build()
				);
			}
		}
		Set<Long> skippedPlayers = gameSessionUtils.getSpecificGameDataTypeSet("skippedPlayers", gameState);
		sendSkippedPlayersNotification(skippedPlayers,gameSession.getPlayers());



		sendNextTurnNotification(next.nextPlayer(),gameSession.getPlayers(),next.nextSeatIndex());

		handleIfNextPlayerIsBot(next,gameSession);

	}



	@Override
	public void skipTurn(SkipTurnRequest skipTurnRequest) {
		Player currentPlayer = playerRepository.findById(skipTurnRequest.getPlayerId())
				.orElseThrow(() -> new PlayerNotFoundException("Player not found"));

		GameSession gameSession = gameSessionRepository.findByIdWithPlayers(currentPlayer.getGameSession().getGameSessionId())
				.orElseThrow(() -> new GameSessionNotFoundException("GameSession not found"));

		AtomicReference<NextTurnResult> nextTurnRef = new AtomicReference<>();

		GameState gameState = gameSessionUtils.updateGameState(gameSession.getGameSessionId(), current -> {

			if(gameEngine.isPlayerFinished(currentPlayer,current)){
				throw new IllegalStateException("You Are already finished");
			}
			if(gameEngine.isPlayerLost(currentPlayer,current)){
				throw new IllegalStateException("You already lost");
			}

			if (!gameEngine.isPlayersTurn(currentPlayer, current)) {
				throw new IllegalStateException("This is not your turn");
			}

			//ha kell huznia kartyat akkor nem engedjuk hogy rakjon le kartyat
			if(gameEngine.playerHaveToDrawStack(currentPlayer,current)){
				throw new IllegalStateException("You have to draw stack of cards");
			}

			// Verify that skip is valid (can't draw and can't play)
			if (!current.getDeck().isEmpty()) {
				throw new IllegalStateException("You can still draw cards");
			}

			if (current.getPlayedCards().size() > 1) {
				throw new IllegalStateException("Cards can be reshuffled");
			}

			NextTurnResult nextTurnResult = gameEngine.nextTurn(currentPlayer, gameSession, current,0);
			nextTurnRef.set(nextTurnResult);

			return current;
		});

		NextTurnResult next = nextTurnRef.get();

		// Notify all players about the skip
		for (Player player : gameSession.getPlayers()) {
			if (!player.getIsBot()) {
				simpMessagingTemplate.convertAndSendToUser(
						player.getUser().getId().toString(),
						"/queue/game/skip",
						SkipTurnResponse.builder()
								.skippedPlayerId(currentPlayer.getPlayerId())
								.skippedPlayerSeat(currentPlayer.getSeat())
								.deckSize(gameState.getDeck().size())
								.build()
				);
			}
		}

		sendNextTurnNotification(next.nextPlayer(), gameSession.getPlayers(), next.nextSeatIndex());
		handleIfNextPlayerIsBot(next, gameSession);
	}

	@Override
	public void drawStackOfCards(DrawStackOfCardsRequest drawStackOfCardsRequest) {
		Player currentPlayer=playerRepository.findById(drawStackOfCardsRequest.getPlayerId())
				.orElseThrow(()-> new PlayerNotFoundException("Player not found"));

		GameSession gameSession = gameSessionRepository.findByIdWithPlayers(currentPlayer.getGameSession().getGameSessionId())
				.orElseThrow(() -> new GameSessionNotFoundException("GameSession not found"));

		List<Player> players = gameSession.getPlayers();


		AtomicReference<NextTurnResult> nextTurnRef = new AtomicReference<>();
		AtomicReference<List<Card>> drawnCardsRef = new AtomicReference<>();
		AtomicReference<Integer> deckSizeRef = new AtomicReference<>();
		GameState newGameState=gameSessionUtils.updateGameState(gameSession.getGameSessionId(),current->{

			if(!gameEngine.playerHaveToDrawStack(currentPlayer,current)){
				throw new IllegalStateException("You do not have to draw stack of cards");
			}

			if(gameEngine.isPlayerFinished(currentPlayer,current)){
				throw new IllegalStateException("You Are already finished");
			}
			if(gameEngine.isPlayerLost(currentPlayer,current)){
				throw new IllegalStateException("You already lost");
			}
			if(!gameEngine.isPlayersTurn(currentPlayer,current)){
				throw new IllegalStateException("This is not your turn");
			};


			List<Card> drawnCards= gameEngine.drawStackOfCards(currentPlayer,current);

			drawnCardsRef.set(drawnCards);
			deckSizeRef.set(current.getDeck().size());

			NextTurnResult nextTurnResult=gameEngine.nextTurn(currentPlayer,gameSession,current,0);
			nextTurnRef.set(nextTurnResult);
			return current;
		});

		NextTurnResult nextTurnResult=nextTurnRef.get();

		//itt ha huzunk egy kartyat akkor a kartyahuzo user lassa a kartyat mások nem kapjak meg a tartalmát
		sendDrawCardNotification(players,currentPlayer,drawnCardsRef.get(),deckSizeRef.get(),newGameState.getPlayedCards().size(),newGameState);

		sendNextTurnNotification(nextTurnResult.nextPlayer(), gameSession.getPlayers(), nextTurnResult.nextSeatIndex());
		handleIfNextPlayerIsBot(nextTurnResult, gameSession);


	}



	@Transactional
	@Override
	public LeaveGameSessionResponse leaveGameSession(LeaveGameSessionRequest request) {
		User user = authenticationService.getAuthenticatedUser();

		// Get the game session
		GameSession gameSession = gameSessionRepository.findByIdWithPlayers(request.getGameSessionId())
				.orElseThrow(() -> new GameSessionNotFoundException("GameSession not found"));

		// Check if user is in this game session
		Player leavingPlayer = gameSession.getPlayers().stream()
				.filter(p -> !p.getIsBot() && p.getUser().getId().equals(user.getId()))
				.findFirst()
				.orElseThrow(() -> new PlayerNotFoundException("Player not found in this game session"));

		Room room = gameSession.getRoom();
		boolean isGamemaster = room.getGamemaster() != null &&
				room.getGamemaster().getId().equals(user.getId());

		// Cache evict for user status
		Cache cache = cacheManager.getCache("userStatus");
		if (cache != null) {
			cache.evict("userStatus_" + user.getId());
		}

		if(isGamemaster){
			gameEngine.handleGamemasterLeaving(gameSession, leavingPlayer);
			// Notify all players that game has ended
			for (Player player : gameSession.getPlayers()) {
				if (!player.getIsBot()) {
					// Update user's current room status - they stay in room but game ends

					simpMessagingTemplate.convertAndSendToUser(
							player.getUser().getId().toString(),
							"/queue/game/end",
							GameEndResponse.builder()
									.reason("Gamemaster left the game")
									.build()
					);
				}
			}
			UserCurrentStatus userStatus=responseMapper.toUserCurrentStatus(user, true);
			RoomResponse currentRoom=responseMapper.toRoomResponse(user.getCurrentRoom());
			RoomResponse managedRoom=responseMapper.toRoomResponse(Objects.requireNonNull(user.getManagedRooms().stream().filter(Room::isActive).findFirst().orElse(null)));
			return LeaveGameSessionResponse.builder().userStatus(userStatus).currentRoom(currentRoom).managedRoom(managedRoom).build();
		}else {
			//todo: még értesiteni kell a playereket hogy valaki kilepett es egy bot vette át a helyet
			gameEngine.handlePlayerLeaving(gameSession,leavingPlayer,user);

			//ha a user akkor lép ki amikor ő van soron akkor a bottal rögtön lépnünk kell
			GameState gameState = gameSessionUtils.getGameState(gameSession.getGameSessionId());

			if(gameState.getCurrentPlayerId().equals(leavingPlayer.getPlayerId())){
				//ide a bot logikát
				NextTurnResult nextTurnResult=botLogic.botDrawTest(gameSession,leavingPlayer);
				sendNextTurnNotification(nextTurnResult.nextPlayer(),gameSession.getPlayers(), nextTurnResult.nextSeatIndex());

				handleIfNextPlayerIsBot(nextTurnResult,gameSession);
			}

			sendPlayerLeftNotification(leavingPlayer,gameSession.getPlayers());
			UserCurrentStatus userStatus=responseMapper.toUserCurrentStatus(user, true);
			return LeaveGameSessionResponse.builder().userStatus(userStatus).currentRoom(null).managedRoom(null).build();
		}
	}

	private void sendPlayerLeftNotification(Player leavingPlayer, List<Player> players) {

		for (Player player : players) {
			if (!player.getIsBot() || !player.getPlayerId().equals(leavingPlayer.getPlayerId())) {
				simpMessagingTemplate.convertAndSendToUser(
						player.getUser().getId().toString(),
						"/queue/game/player-left",
						PlayerLeftResponse.builder().newName(leavingPlayer.getBot().getName()).playerId(leavingPlayer.getPlayerId()).build()
				);
			}
		}

	}
	private void sendSkippedPlayersNotification(Set<Long> skippedPlayers, List<Player> players) {
		for (Player player : players) {
			if (!player.getIsBot()) {
				simpMessagingTemplate.convertAndSendToUser(
						player.getUser().getId().toString(),
						"/queue/game/skip",
						SkipPlayersResponse.builder()
								.SkippedPlayersId(skippedPlayers)
								.build()
				);
			}
		}
		skippedPlayers.clear();
	}


	private boolean hasActiveGame(Room room) {
		return gameSessionRepository.existsByRoomAndGameStatus(room, GameStatus.IN_PROGRESS);
	}
	private void handleIfNextPlayerIsBot(NextTurnResult next,GameSession gameSession){
		//ha a nextplayer bot akkor elinditjuk a abot logikat majd a next turnrol értesitjuk a usereket,
		if(next.nextPlayer().getIsBot()){
			Player nextPlayer=next.nextPlayer();
			//addig indítgassuk el a bot logikat amig a kovetkezo user nem bot
			while (nextPlayer.getIsBot()){
				NextTurnResult nextTurnResult=botLogic.botDrawTest(gameSession,nextPlayer);
				sendNextTurnNotification(nextTurnResult.nextPlayer(),gameSession.getPlayers(), nextTurnResult.nextSeatIndex());
				nextPlayer=nextTurnResult.nextPlayer();
			}

		}
	}
	private Long getPlayerIdFromUserAndGameSession(User user, GameSession gameSession) {
		return gameSession.getPlayers().stream()
				.filter(p -> p.getUser() != null && p.getUser().getId().equals(user.getId()))
				.map(Player::getPlayerId)
				.findFirst()
				.orElseThrow(() -> new EntityNotFoundException("Player not found for this user"));
	}

	private void sendNextTurnNotification(Player nextPlayer, List<Player> players,int nextSeatIndex){
		for (Player player : players) {
			if (!player.getIsBot()) {
				boolean isCurrentPlayer = player.equals(nextPlayer);
                simpMessagingTemplate.convertAndSendToUser(
						player.getUser().getId().toString(),
                        "/queue/game/turn",
                        NextTurnResponse.builder().isYourTurn(isCurrentPlayer).currentSeat(nextSeatIndex).build()
                );
			}
		}
    }

	private void sendPlayerHasToDrawStack(Player player,Map<Long,Integer> drawStack) {
		if(!player.getIsBot()){
			simpMessagingTemplate.convertAndSendToUser(player.getUser().getId().toString(),"/queue/game/draw-stack", DrawStackResponse.builder().drawStack(drawStack).build());

		}
	}



	private void sendDrawCardNotification(List<Player> players,Player currentPlayer ,List<Card> drawnCards, Integer deckSize,Integer playedCardsSize, GameState newGameState) {
		for (Player player : players) {
			if (!player.getIsBot()) {
				DrawCardResponse personalizedResponse;
				if(player.getPlayerId().equals(currentPlayer.getPlayerId())){
					personalizedResponse = responseMapper.toDrawCardResponse(newGameState,drawnCards,player.getPlayerId(),deckSize,playedCardsSize);
				}else {
					personalizedResponse = responseMapper.toDrawCardResponse(newGameState,null,player.getPlayerId(),deckSize,playedCardsSize);
				}
				simpMessagingTemplate.convertAndSendToUser(
						player.getUser().getId().toString(),
						"/queue/game/draw",
						personalizedResponse
				);
			}
		}
	}


}
