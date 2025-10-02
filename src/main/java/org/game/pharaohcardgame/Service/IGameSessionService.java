package org.game.pharaohcardgame.Service;

import org.game.pharaohcardgame.Model.DTO.Request.*;
import org.game.pharaohcardgame.Model.DTO.Response.CurrentTurnResponse;
import org.game.pharaohcardgame.Model.DTO.Response.GameSessionResponse;
import org.game.pharaohcardgame.Model.DTO.Response.LeaveGameSessionResponse;
import org.game.pharaohcardgame.Model.DTO.Response.SuccessMessageResponse;

public interface IGameSessionService {
	SuccessMessageResponse startGame(GameStartRequest gameStartRequest);
	GameSessionResponse getGameSession();
	GameSessionResponse drawCard(DrawCardRequest drawCardRequest);
	void playCards(PlayCardsRequest playCardsRequest);
	 CurrentTurnResponse getCurrentTurnInfo();
	void skipTurn(SkipTurnRequest skipTurnRequest);

	LeaveGameSessionResponse leaveGameSession(LeaveGameSessionRequest request);
}
