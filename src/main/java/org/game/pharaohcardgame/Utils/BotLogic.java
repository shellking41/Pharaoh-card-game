package org.game.pharaohcardgame.Utils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.game.pharaohcardgame.Model.DTO.Response.DrawCardResponse;
import org.game.pharaohcardgame.Model.DTO.ResponseMapper;
import org.game.pharaohcardgame.Model.GameSession;
import org.game.pharaohcardgame.Model.Player;
import org.game.pharaohcardgame.Model.RedisModel.Card;
import org.game.pharaohcardgame.Model.RedisModel.GameState;
import org.game.pharaohcardgame.Model.Results.NextTurnResult;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicReference;

@RequiredArgsConstructor
@Slf4j
@Component
public class BotLogic implements IBotLogic{

	private final ResponseMapper responseMapper;
	private final GameSessionUtils gameSessionUtils;
	private final SimpMessagingTemplate simpMessagingTemplate;
	private final GameEngine gameEngine;

	@Override
	public NextTurnResult botDrawTest( GameSession gameSession, Player botPlayer) {

		AtomicReference<NextTurnResult> nextTurnRef = new AtomicReference<>();
		GameState gameState=gameSessionUtils.updateGameState(gameSession.getGameSessionId(),current->{
			Card drawnCard=gameEngine.drawCard(current,botPlayer);

			NextTurnResult nextTurnResult=gameEngine.nextTurn(botPlayer,gameSession,current);
			nextTurnRef.set(nextTurnResult);
			return current;
		});


		for (Player player : gameSession.getPlayers()) {
			if (!player.getIsBot()) {

				DrawCardResponse personalizedResponse = responseMapper.toDrawCardResponse(gameState,null,player.getPlayerId());

				simpMessagingTemplate.convertAndSendToUser(
						player.getUser().getId().toString(),
						"/queue/game/draw",
						personalizedResponse
				);
			}
		}
		return nextTurnRef.get();
	}
}
