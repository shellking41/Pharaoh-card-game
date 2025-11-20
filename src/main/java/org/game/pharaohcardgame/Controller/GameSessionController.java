package org.game.pharaohcardgame.Controller;


import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.game.pharaohcardgame.Authentication.UserPrincipal;
import org.game.pharaohcardgame.Model.DTO.Request.*;
import org.game.pharaohcardgame.Model.DTO.Response.CurrentTurnResponse;
import org.game.pharaohcardgame.Model.DTO.Response.GameSessionResponse;
import org.game.pharaohcardgame.Model.DTO.Response.LeaveGameSessionResponse;
import org.game.pharaohcardgame.Model.DTO.Response.SuccessMessageResponse;
import org.game.pharaohcardgame.Model.User;
import org.game.pharaohcardgame.Repository.UserRepository;
import org.game.pharaohcardgame.Service.Implementation.AuthenticationService;
import org.game.pharaohcardgame.Service.Implementation.GameSessionService;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@RestController
@Controller
@RequiredArgsConstructor
@RequestMapping("/game")
public class GameSessionController {

    private final GameSessionService gameSessionService;
    private final AuthenticationService authenticationService;
    private final UserRepository userRepository;

    @PostMapping("/start")
    public SuccessMessageResponse StartGame(@RequestBody GameStartRequest gameStartRequest) {
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
    public void playCards(PlayCardsRequest playCardsRequest) {
        gameSessionService.playCards(playCardsRequest);
    }

    @MessageMapping("/game/draw-stack-of-cards")
    public void drawStackOfCards(DrawStackOfCardsRequest drawStackOfCardsRequest) {
        gameSessionService.drawStackOfCards(drawStackOfCardsRequest);
    }

    @PostMapping("/leave")
    public LeaveGameSessionResponse leaveGameSession(@RequestBody LeaveGameSessionRequest leaveGameSessionRequest) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        Long id = ((UserPrincipal) authentication.getPrincipal()).getUserId();
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        LeaveGameSessionResponse response = gameSessionService.leaveGameSession(leaveGameSessionRequest, user);
        return response;

    }

    @MessageMapping("/game/skip")
    public void skipTurn(SkipTurnRequest request) {
        gameSessionService.skipTurn(request);
    }

    @MessageExceptionHandler
    @SendToUser("/queue/errors")
    public String handleException(Exception ex) {
        return ex.getMessage();
    }
}
