package org.game.pharaohcardgame.Utils;

import org.game.pharaohcardgame.Model.DTO.Request.CardRequest;
import org.game.pharaohcardgame.Model.GameSession;
import org.game.pharaohcardgame.Model.Player;
import org.game.pharaohcardgame.Model.RedisModel.Card;
import org.game.pharaohcardgame.Model.RedisModel.GameState;
import org.game.pharaohcardgame.Model.Results.NextTurnResult;
import org.game.pharaohcardgame.Model.User;

import java.util.List;

public interface IGameEngine {
	NextTurnResult nextTurn(Player currentPlayer, GameSession gameSession, GameState gameState);

	boolean isPlayersTurn(Player player, GameState gameState);

	void initGame(Long gameSessionId, List<Player> players);

	Card drawCard(GameState gameState, Player currentPlayer);
	void reShuffleCards(GameState gameState);
	void  startNewRound(GameState gameState);
	void gameFinished(GameState gameState);
	 void handlePlayerEmptyhand(GameState gameState,Player player);

	Boolean checkCardsPlayability(List<CardRequest> playCards, GameState gameState);

	GameState playCards(List<CardRequest> playCards,Player currentPlayer,GameState gameState);

	boolean areCardsValid(Player currentPlayer,List<CardRequest> playCards, GameState gameState);


	void handlePlayerLeaving(GameSession gameSession, Player leavingPlayer, User user);

	void handleGamemasterLeaving(GameSession gameSession, Player leavingPlayer);
}

