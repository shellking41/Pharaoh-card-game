package org.game.pharaohcardgame.Model.DTO;

import org.game.pharaohcardgame.Model.*;
import org.game.pharaohcardgame.Model.DTO.Request.CardRequest;
import org.game.pharaohcardgame.Model.DTO.Response.*;
import org.game.pharaohcardgame.Model.RedisModel.Card;
import org.game.pharaohcardgame.Model.RedisModel.GameState;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class ResponseMapper {


	// User mappings
	public UserInfoResponse toUserInfoResponse(User user) {
		return UserInfoResponse.builder()
				.userId(user.getId())
				.username(user.getName())
				.role(user.getRole())
				.build();
	}

	public List<UserInfoResponse> toUserInfoResponseList(List<User> users) {
		return users.stream()
				.map(this::toUserInfoResponse)
				.toList();
	}



	// Room mappings
	public RoomResponse toRoomResponse(Room room) {
		List<UserInfoResponse> participants = room.getParticipants() != null
				? toUserInfoResponseList(room.getParticipants().stream().toList())
				: List.of();
		List<BotInfoResponse> bots = room.getBots() != null
				? toBotResponseList(room.getBots().stream().toList())
				: List.of();

		return RoomResponse.builder()
				.roomId(room.getRoomId())
				.roomName(room.getName())
				.participants(participants)
				.bots(bots)
				.build();
	}

	public List<BotInfoResponse> toBotResponseList(List<Bot> bots) {
		return bots.stream()
				.map(this::toBotResponse)
				.toList();
	}

	public BotInfoResponse toBotResponse(Bot bot) {
		return BotInfoResponse.builder()
				.botId(bot.getId())
				.name(bot.getName())
				.difficulty(bot.getDifficulty())
				.build();

	}

	public List<RoomResponse> toRoomResponseList(List<Room> rooms) {
		return rooms.stream()
				.map(this::toRoomResponse)
				.toList();
	}

	// Message mappings
	public MessageResponse toMessageResponse(Message message) {
		return MessageResponse.builder()
				.messageId(message.getMessageId())
				.message(message.getMessage())
				.username(message.getSender().getName())
				.build();
	}

	// Success message mappings
	public SuccessMessageResponse createSuccessResponse(boolean success, String message) {
		return SuccessMessageResponse.builder()
				.success(success)
				.message(message)
				.build();
	}

	// Authentication response mappings
	public RegisterResponse toRegisterResponse(User user, boolean success, String message) {
		return RegisterResponse.builder()
				.status(createSuccessResponse(success, message))
				.userId(user != null ? user.getId() : null)
				.username(user != null ? user.getName() : null)
				.build();
	}

	public LoginResponse toLoginResponse(User user, String accessToken, boolean success, String message) {
		return LoginResponse.builder()
				.status(createSuccessResponse(success, message))
				.userCurrentStatus(toUserCurrentStatus(user,success))
				.accessToken(accessToken)
				.build();
	}

	public RefreshResponse toRefreshResponse(String accessToken) {
		return RefreshResponse.builder()
				.accessToken(accessToken)
				.build();
	}

	// Room operation response mappings
	public JoinRequestResponse toJoinRequestResponse(Long roomId, String message, Long userId, String username) {
		return JoinRequestResponse.builder()
				.roomId(roomId)
				.message(message)
				.userId(userId)
				.username(username)
				.build();
	}

	public ConfirmOrDeclineJoinResponse toConfirmOrDeclineJoinResponse(boolean confirmed, String message, Room room) {
		RoomResponse currentRoom = room != null ? toRoomResponse(room) : null;

		return ConfirmOrDeclineJoinResponse.builder()
				.confirmed(confirmed)
				.message(message)
				.currentRoom(currentRoom)
				.build();
	}

	public RoomCreationResponse toRoomCreationResponse(Room room, User user, boolean success, String message) {
		RoomResponse roomResponse = room != null ? toRoomResponse(room) : null;

		return RoomCreationResponse.builder()
				.managedRoom(roomResponse)
				.currentRoom(roomResponse)
				.status(createSuccessResponse(success, message))
				.username(user != null ? user.getName() : null)
				.build();
	}


	public UserCurrentStatus toUserCurrentStatus(User user, boolean authenticated) {
		if (!authenticated) {
			return UserCurrentStatus.builder().authenticated(false).build();
		}

		UserInfoResponse userInfo = toUserInfoResponse(user);


		// Egyetlen query helyett a már betöltött managedRooms-ot használjuk
		RoomResponse managedRoom = user.getManagedRooms().stream()
				.filter(Room::isActive)
				.findFirst()
				.map(this::toRoomResponse)
				.orElse(null);

		return UserCurrentStatus.builder()
				.userInfo(userInfo)
				.currentRoomId(user.getCurrentRoom() != null ? user.getCurrentRoom().getRoomId() : null)
				.managedRoomId(managedRoom != null ? managedRoom.getRoomId() : null)
				.authenticated(true)
				.build();

	}


	public List<PlayerStatusResponse> toPlayerStatusResponseList(List<Player> players) {
		return players.stream()
				.map(this::toPlayerStatusResponse)
				.toList();
	}

	public PlayerStatusResponse toPlayerStatusResponse(Player player) {
		return PlayerStatusResponse.builder()
				.seat(player.getSeat())
				.playerId(player.getPlayerId())
				.isBot(player.getIsBot())
				.lossCount(player.getLossCount())
				.playerName(player.getUser()!=null?player.getUser().getName():player.getBot().getName())
				.userId(player.getUser() != null ? player.getUser().getId() : null)
				.botDifficulty(player.getBotDifficulty())
				.build();
	}



	public GameSessionResponse toGameSessionResponse(GameSession gameSession, List<Player> players, PlayerHandResponse playerHand, List<PlayedCardResponse> playedCards, GameState gameState) {
		return GameSessionResponse.builder()
				.gameSessionId(gameSession.getGameSessionId())
				.players(toPlayerStatusResponseList(gameSession.getPlayers()))
				.playerHand(playerHand)
				.playedCards(playedCards)
				.deckSize(gameState.getDeck().size())
				.playedCardsSize(gameState.getPlayedCards().size())
				.gameData(gameState.getGameData())
				.gameStatus(gameSession.getGameStatus())
				.build();
	}

	public CardInHandResponse toCardInHandResponse(Card card){
		return CardInHandResponse.builder()
				.cardId(card.getCardId())
				.suit(card.getSuit())
				.rank(card.getRank())
				.position(card.getPosition())
				.ownerId(card.getOwnerId())
				.build();
	}

	public List<CardInHandResponse> toCardInHandResponseList(List<Card> cards) {

		return cards.stream()
				.map(this::toCardInHandResponse)
				.toList();

	}

	public PlayedCardResponse toPlayedCardResponse(Card card){
		return PlayedCardResponse.builder()
				.cardId(card.getCardId())
				.suit(card.getSuit())
				.rank(card.getRank())
				.build();
	}
	public PlayedCardResponse toPlayedCardResponse(CardRequest card){
		return PlayedCardResponse.builder()
				.cardId(card.getCardId())
				.suit(card.getSuit())
				.rank(card.getRank())
				.build();
	}

	public List<PlayedCardResponse> toPlayedCardResponseListFromCards(List<Card> cards) {

		return cards.stream()
				.map(this::toPlayedCardResponse)
				.toList();

	}
	public List<PlayedCardResponse> toPlayedCardResponseListFromCardRequests(List<CardRequest> cards) {

		return cards.stream()
				.map(this::toPlayedCardResponse)
				.toList();

	}

	public DrawCardResponse toDrawCardResponse(GameState gameState, List<Card> drawnCards,Long playerId,Integer deckSize,Integer playedCardsSize) {

		Map<Long, Integer> otherPlayersCardCount = gameState.getPlayerHands().entrySet()
				.stream()
				.filter(entry -> !entry.getKey().equals(playerId))
				.collect(Collectors.toMap(
						Map.Entry::getKey,
						entry -> entry.getValue().size()
				));
		List<CardInHandResponse> cardInHandResponses = drawnCards != null ? toCardInHandResponseList(drawnCards) : null;

		return DrawCardResponse.builder()
				.newCard(cardInHandResponses)
				.playerId(playerId)
				.gameSessionId(gameState.getGameSessionId())
				.otherPlayersCardCount(otherPlayersCardCount)
				.deckSize(deckSize)
				.gameData(gameState.getGameData())
				.playedCardsSize(playedCardsSize)
				.build();
	}
}