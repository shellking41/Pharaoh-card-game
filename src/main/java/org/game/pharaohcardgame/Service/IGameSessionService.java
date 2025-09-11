package org.game.pharaohcardgame.Service;

import org.game.pharaohcardgame.Model.DTO.Request.DrawCardRequest;
import org.game.pharaohcardgame.Model.DTO.Request.GameStartRequest;
import org.game.pharaohcardgame.Model.DTO.Request.PlayCardsRequest;
import org.game.pharaohcardgame.Model.DTO.Response.GameSessionResponse;
import org.game.pharaohcardgame.Model.DTO.Response.SuccessMessageResponse;

public interface IGameSessionService {
	SuccessMessageResponse startGame(GameStartRequest gameStartRequest);
	GameSessionResponse getGameSession();
	GameSessionResponse drawCard(DrawCardRequest drawCardRequest);
	void playCards(PlayCardsRequest playCardsRequest);

}
