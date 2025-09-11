package org.game.pharaohcardgame.Utils;

import org.game.pharaohcardgame.Model.DTO.Request.CardRequest;
import org.game.pharaohcardgame.Model.GameSession;
import org.game.pharaohcardgame.Model.Player;
import org.game.pharaohcardgame.Model.RedisModel.GameState;

import java.util.List;

public interface IGameEngine {
	Player nextTurn(Player currentPlayer, GameSession gameSession);

	boolean isPlayersTurn(Player player, GameState gameState);

	void initGame(Long gameSessionId, List<Player> players);

	GameState drawCard(GameSession gameSession, Player currentPlayer);

	Boolean checkCardsPlayability(List<CardRequest> playCards, GameSession gameSession);

	GameState playCards(List<CardRequest> playCards, GameSession gameSession);

	boolean areCardsValid(Player currentPlayer,List<CardRequest> playCards, GameSession gameSession);
}
