package org.game.pharaohcardgame.Controller;


import lombok.RequiredArgsConstructor;
import org.game.pharaohcardgame.Model.DTO.Request.DrawCardRequest;
import org.game.pharaohcardgame.Model.DTO.Request.GameStartRequest;
import org.game.pharaohcardgame.Model.DTO.Request.LeaveGameSessionRequest;
import org.game.pharaohcardgame.Model.DTO.Request.PlayCardsRequest;
import org.game.pharaohcardgame.Model.DTO.Response.CurrentTurnResponse;
import org.game.pharaohcardgame.Model.DTO.Response.GameSessionResponse;
import org.game.pharaohcardgame.Model.DTO.Response.SuccessMessageResponse;
import org.game.pharaohcardgame.Service.Implementation.GameSessionService;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@RestController
@Controller
@RequiredArgsConstructor
@RequestMapping("/game")
public class GameSessionController {

	private final GameSessionService gameSessionService;

	@PostMapping("/start")
	public SuccessMessageResponse StartGame(@RequestBody GameStartRequest gameStartRequest){
		return gameSessionService.startGame(gameStartRequest);
	}

	@GetMapping("/state")
	public GameSessionResponse getGameSession() {
		return gameSessionService.getGameSession();
	}
	@GetMapping("/current-turn")
	public CurrentTurnResponse getCurrentTurnInfo() {
		return gameSessionService.getCurrentTurnInfo();
	}
	@MessageMapping("/game/draw")
	public void draw(DrawCardRequest drawCardRequest) {
		gameSessionService.drawCard(drawCardRequest);
	}
	@MessageMapping("/game/play-cards")
	public void playCards(PlayCardsRequest playCardsRequest){
		gameSessionService.playCards(playCardsRequest);
	}


	@PostMapping("/leave")
	public void leaveGameSession(@RequestBody LeaveGameSessionRequest leaveGameSessionRequest) {
			 gameSessionService.leaveGameSession(leaveGameSessionRequest);

	}

	@MessageExceptionHandler
	@SendToUser("/queue/errors")
	public String handleException(Exception ex) {
		return ex.getMessage();
	}
}
