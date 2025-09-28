package org.game.pharaohcardgame.Utils;

import org.game.pharaohcardgame.Model.GameSession;
import org.game.pharaohcardgame.Model.Player;
import org.game.pharaohcardgame.Model.RedisModel.GameState;
import org.game.pharaohcardgame.Model.Results.NextTurnResult;

public interface IBotLogic {
	NextTurnResult botDrawTest(GameSession gameSession, Player botPlayer);
}
