package org.game.pharaohcardgame.Service.Implementation;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.game.pharaohcardgame.Enum.GameStatus;
import org.game.pharaohcardgame.Exception.GameSessionNotFoundException;
import org.game.pharaohcardgame.Exception.PlayerNotFoundException;
import org.game.pharaohcardgame.Exception.RoomNotFoundException;
import org.game.pharaohcardgame.Model.*;
import org.game.pharaohcardgame.Model.DTO.Request.CardRequest;
import org.game.pharaohcardgame.Model.DTO.Request.DrawCardRequest;
import org.game.pharaohcardgame.Model.DTO.Request.GameStartRequest;
import org.game.pharaohcardgame.Model.DTO.Request.PlayCardsRequest;
import org.game.pharaohcardgame.Model.DTO.Response.*;
import org.game.pharaohcardgame.Model.DTO.ResponseMapper;
import org.game.pharaohcardgame.Model.RedisModel.Card;
import org.game.pharaohcardgame.Model.RedisModel.GameState;
import org.game.pharaohcardgame.Repository.BotRepository;
import org.game.pharaohcardgame.Repository.GameSessionRepository;
import org.game.pharaohcardgame.Repository.PlayerRepository;
import org.game.pharaohcardgame.Repository.RoomRepository;
import org.game.pharaohcardgame.Service.IGameSessionService;
import org.game.pharaohcardgame.Utils.GameEngine;
import org.game.pharaohcardgame.Utils.GameSessionUtils;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.*;

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

					GameStartResponse personalizedResponse = responseMapper.toGameStartResponse(
							gameSession, players, playerHand);

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
	public GameSessionResponse getGameSession() {
		User user=authenticationService.getAuthenticatedUser();
		GameSession gameSession=gameSessionRepository.findByRoomIdAndGameStatusWithPlayers(user.getCurrentRoom().getRoomId(),GameStatus.IN_PROGRESS)
				.orElseThrow(()->new GameSessionNotFoundException("Active Game not Found"));

		Long playerId = gameSession.getPlayers().stream()
				.filter(p -> p.getUser() != null && p.getUser().getId().equals(user.getId()))
				.map(Player::getPlayerId)
				.findFirst()
				.orElseThrow(() -> new EntityNotFoundException("Player not found for this user"));

		PlayerHandResponse playerHand = gameSessionUtils.getPlayerHand(
				gameSession.getGameSessionId(), playerId);

		List<Card> playedCards =gameSessionUtils.getGameState(gameSession.getGameSessionId()).getPlayedCards();
		List<PlayedCardResponse> playedCardResponses = responseMapper.toPlayedCardResponseListFromCards(playedCards);
		return responseMapper.toGameSessionResponse(gameSession,gameSession.getPlayers(),playerHand,playedCardResponses);
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


		GameState newGameState= gameEngine.drawCard(gameSession,currentPlayer);


		for (Player player : players) {
			if (!player.getIsBot()) {
				Card drawnCard=null;
				if(player.getPlayerId().equals(currentPlayer.getPlayerId())){
					List<Card> newHand = newGameState.getPlayerHands().get(player.getPlayerId());
					drawnCard= newHand.getLast();

				}

				DrawCardResponse personalizedResponse = responseMapper.toDrawCardResponse(newGameState,drawnCard,player.getPlayerId());


				simpMessagingTemplate.convertAndSendToUser(
						player.getUser().getId().toString(),
						"/queue/game/draw",
						personalizedResponse
				);
			}
		}
		gameEngine.nextTurn(currentPlayer,gameSession);
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

		GameState gameState=gameSessionUtils.getGameState(getGameSession().getGameSessionId());

		if(!gameEngine.isPlayersTurn(currentPlayer,gameState)){
			throw new IllegalStateException("This is not your turn");
		};

		if(!gameEngine.areCardsValid(currentPlayer,playCardsRequest.getPlayCards(),gameSession)){
			throw new IllegalArgumentException("Invalid Cards");
		}

		if(!gameEngine.checkCardsPlayability(playCardsRequest.getPlayCards(),gameSession)){
			throw new IllegalArgumentException("Card's suit or rank are not matching");
		};

		gameEngine.playCards(playCardsRequest.getPlayCards(),gameSession);

		List<PlayedCardResponse> playedCardResponses= responseMapper.toPlayedCardResponseListFromCardRequests(playCardsRequest.getPlayCards());

		simpMessagingTemplate.convertAndSend(
				"/topic/game/"+gameSession.getGameSessionId()+"/played-cards",
				playedCardResponses
				);


		gameEngine.nextTurn(currentPlayer,gameSession);

	}


	private boolean hasActiveGame(Room room) {
		return gameSessionRepository.existsByRoomAndGameStatus(room, GameStatus.IN_PROGRESS);
	}







}
