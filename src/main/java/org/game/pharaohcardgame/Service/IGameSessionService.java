package org.game.pharaohcardgame.Service;

import jakarta.transaction.Transactional;
import org.game.pharaohcardgame.Model.DTO.Request.DrawCardRequest;
import org.game.pharaohcardgame.Model.DTO.Request.GameStartRequest;
import org.game.pharaohcardgame.Model.DTO.Request.LeaveGameSessionRequest;
import org.game.pharaohcardgame.Model.DTO.Request.PlayCardsRequest;
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


	void leaveGameSession(LeaveGameSessionRequest request);
}
