package org.game.pharaohcardgame.Utils;

import org.game.pharaohcardgame.Model.DTO.Request.CardRequest;
import org.game.pharaohcardgame.Model.GameSession;
import org.game.pharaohcardgame.Model.Player;
import org.game.pharaohcardgame.Model.RedisModel.Card;
import org.game.pharaohcardgame.Model.RedisModel.GameState;
import org.game.pharaohcardgame.Model.User;

import java.util.List;

public interface IGameEngine {
	Player nextTurn(Player currentPlayer, GameSession gameSession);

	boolean isPlayersTurn(Player player, GameState gameState);

	void initGame(Long gameSessionId, List<Player> players);

	Card drawCard(GameSession gameSession, Player currentPlayer);

	Boolean checkCardsPlayability(List<CardRequest> playCards, GameSession gameSession);

	GameState playCards(List<CardRequest> playCards, GameSession gameSession,Player currentPlayer);

	boolean areCardsValid(Player currentPlayer,List<CardRequest> playCards, GameSession gameSession);


	void handlePlayerLeaving(GameSession gameSession, Player leavingPlayer, User user);

	void handleGamemasterLeaving(GameSession gameSession, Player leavingPlayer);
}

