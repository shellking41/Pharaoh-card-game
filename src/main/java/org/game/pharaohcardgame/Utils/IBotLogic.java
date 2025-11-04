package org.game.pharaohcardgame.Utils;

import org.game.pharaohcardgame.Model.GameSession;
import org.game.pharaohcardgame.Model.Player;
import org.game.pharaohcardgame.Model.RedisModel.Card;
import org.game.pharaohcardgame.Model.RedisModel.GameState;
import org.game.pharaohcardgame.Model.Results.NextTurnResult;

import java.util.List;

public interface IBotLogic {
	NextTurnResult botDrawTest(GameSession gameSession, Player botPlayer);
	 List<Card> chooseMonteCarloPlay(List<List<Card>>validPlays,Player botPlayer, GameState realState, GameSession realSession, int playoutsPerMove) ;
	 GameState cloneState(GameState realState) ;
	 List<List<Card>> calculateValidPlays(GameState gameState, Player currentPlayer) ;
	 NextTurnResult botPlays(GameState gameState,GameSession gameSession,Player botPlayer);



	}
