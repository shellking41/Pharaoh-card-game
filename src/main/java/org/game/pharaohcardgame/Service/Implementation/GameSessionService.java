package org.game.pharaohcardgame.Service.Implementation;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
			gameEngine.initGame(gameSession.getGameSessionId(), players);


			for (Player player : players) {
				if (!player.getIsBot()) {
					PlayerHandResponse playerHand = gameSessionUtils.getPlayerHand(
							gameSession.getGameSessionId(), player.getPlayerId());

					List<Card> playedCards =gameSessionUtils.getGameState(gameSession.getGameSessionId()).getPlayedCards();
					List<PlayedCardResponse> playedCardResponses = responseMapper.toPlayedCardResponseListFromCards(playedCards);
					GameSessionResponse personalizedResponse = responseMapper.toGameSessionResponse(gameSession,gameSession.getPlayers(),playerHand,playedCardResponses);

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
	//todo:!!!FONTOS!!!! ha majd akarok a gamekozbeni kilépést, akkor a szobából, a gamesessionbol és a gameStatebol is kikell leptetnem a usert, és a a gamestateben eltudntetem a usert akkor megkell oldani a sorrendet
	public GameSessionResponse getGameSession() {
		User user=authenticationService.getAuthenticatedUser();
		GameSession gameSession=gameSessionRepository.findByRoomIdAndGameStatusWithPlayers(user.getCurrentRoom().getRoomId(),GameStatus.IN_PROGRESS)
				.orElseThrow(()->new GameSessionNotFoundException("Active Game not Found"));

		Long playerId=getPlayerIdFromUserAndGameSession(user,gameSession);

		PlayerHandResponse playerHand = gameSessionUtils.getPlayerHand(
				gameSession.getGameSessionId(), playerId);



		List<Card> playedCards =gameSessionUtils.getGameState(gameSession.getGameSessionId()).getPlayedCards();
		List<PlayedCardResponse> playedCardResponses = responseMapper.toPlayedCardResponseListFromCards(playedCards);
		return responseMapper.toGameSessionResponse(gameSession,gameSession.getPlayers(),playerHand,playedCardResponses);


	}

	@Override
	//TODO:KELL IDE EGY TRYCATCH
	//todo: lehet ide kell majd a transacitonal, de aza problema hogy a nextturn nem kerul bele a transactionba ezért nem a legfrissebb gamestatet hasznalja.Kivettem innen a transactionalt, igy megy


	//todo: Ha már a player nem tud huzni kartyát és letenni sem tud akkor azt Frontenden megkell oldalni ugy hogy a frontend majd nezni fogja hogy milyen kartyakat tehet le a user. és ha nem tud letenni egyet sem és nem tud huzni sem akkor calloljon egy endpointot hogy ő most kimarad.
	public GameSessionResponse drawCard(DrawCardRequest drawCardRequest) {

		Player currentPlayer=playerRepository.findById(drawCardRequest.getPlayerId())
				.orElseThrow(()-> new PlayerNotFoundException("Player not found"));

		GameSession gameSession = gameSessionRepository.findByIdWithPlayers(currentPlayer.getGameSession().getGameSessionId())
				.orElseThrow(() -> new GameSessionNotFoundException("GameSession not found"));

		List<Player> players = gameSession.getPlayers();

		//ez azert kell mert lambdan belul nem lehet modositani olyan valtozokat amiket a lamban kivol decralaltunk
		AtomicReference<NextTurnResult> nextTurnRef = new AtomicReference<>();
		AtomicReference<Card> drawnCardRef = new AtomicReference<>();

		GameState newGameState=gameSessionUtils.updateGameState(gameSession.getGameSessionId(),current->{
			if(!gameEngine.isPlayersTurn(currentPlayer,current)){
				throw new IllegalStateException("This is not your turn");
			};

			Card drawnCard= gameEngine.drawCard(current,currentPlayer);
			drawnCardRef.set(drawnCard);


			NextTurnResult nextTurnResult=gameEngine.nextTurn(currentPlayer,gameSession,current);
			nextTurnRef.set(nextTurnResult);

			return current;
		});

		//itt ha huzunk egy kartyat akkor a kartyahuzo user lassa a kartyat mások nem kapjak meg a tartalmát
		for (Player player : players) {
			if (!player.getIsBot()) {
				DrawCardResponse personalizedResponse;
				if(player.getPlayerId().equals(currentPlayer.getPlayerId())){
					 personalizedResponse = responseMapper.toDrawCardResponse(newGameState,drawnCardRef.get(),player.getPlayerId());
				}else {
					 personalizedResponse = responseMapper.toDrawCardResponse(newGameState,null,player.getPlayerId());
				}
				simpMessagingTemplate.convertAndSendToUser(
						player.getUser().getId().toString(),
						"/queue/game/draw",
						personalizedResponse
				);
			}
		}

		NextTurnResult next = nextTurnRef.get();
		sendNextTurnNotification(next.nextPlayer(),players, next.nextSeatIndex());

		handleIfNextPlayerIsBot(next,gameSession);
		return null;
	}

	@Override
	//todo: kell egy olyan logika hogy ha leteszunk kartyakat és mondjuka  közepebol majd aa elejerol is kiveszunk a akezunkbol kartyakat akkor az osszes tobbi kartyank positionja legyen aktuális
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
			if(!gameEngine.isPlayersTurn(currentPlayer,current)){
				throw new IllegalStateException("This is not your turn");
			};

			if(!gameEngine.areCardsValid(currentPlayer,playCardsRequest.getPlayCards(),current)){
				throw new IllegalArgumentException("Invalid Cards");
			}

			if(!gameEngine.checkCardsPlayability(playCardsRequest.getPlayCards(),current)){
				throw new IllegalArgumentException("Card's suit or rank are not matching");
			};

			gameEngine.playCards(playCardsRequest.getPlayCards(),currentPlayer,current);

			NextTurnResult nextTurnResult = gameEngine.nextTurn(currentPlayer, gameSession, current);

			// Mentjük a referenciába, hogy a lambda végén kívül is elérjük
			nextTurnRef.set(nextTurnResult);

			return current;
		});

		NextTurnResult next = nextTurnRef.get();


		List<PlayedCardResponse> playedCardResponses= responseMapper.toPlayedCardResponseListFromCardRequests(playCardsRequest.getPlayCards());
		//ez azt kuldi el hogy milyen kartyak vannak már letéve
		simpMessagingTemplate.convertAndSend(
				"/topic/game/"+gameSession.getGameSessionId()+"/played-cards",
				playedCardResponses
				);

		//ez elkuldi a frissitett player handet hogy a játszo usernek a kezebol eltunnjon a kartya es mas playerek is lassak ezt
		for (Player player : gameSession.getPlayers()) {
			if (!player.getIsBot()) {
				PlayerHandResponse playerHand = gameSessionUtils.getPlayerHand(
						gameSession.getGameSessionId(), player.getPlayerId());

				simpMessagingTemplate.convertAndSendToUser(
						player.getUser().getId().toString(),
						"/queue/game/play-cards",
						playerHand
				);
			}
		}

		sendNextTurnNotification(next.nextPlayer(),gameSession.getPlayers(),next.nextSeatIndex());

		handleIfNextPlayerIsBot(next,gameSession);

	}
	@Transactional
	@Override
	public void leaveGameSession(LeaveGameSessionRequest request) {
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
		}else {
			//todo: még értesiteni kell a playereket hogy valaki kilepett es egy bot vette át a helyet
			gameEngine.handlePlayerLeaving(gameSession,leavingPlayer,user);
		}


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

	public void sendNextTurnNotification(Player nextPlayer, List<Player> players,int nextSeatIndex){
        if (!nextPlayer.getIsBot()) {
            for (Player player : players) {
                boolean isCurrentPlayer = player.equals(nextPlayer);
                simpMessagingTemplate.convertAndSendToUser(
                        player.getUser().getId().toString(),
                        "/queue/game/turn",
                        NextTurnResponse.builder().isYourTurn(isCurrentPlayer).currentSeat(nextSeatIndex).build()
                );
            }
        }
    }

	private void sendPersonalizedGameStateResponse(){

	}


}
