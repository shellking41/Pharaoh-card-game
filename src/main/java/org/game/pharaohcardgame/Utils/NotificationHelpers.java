package org.game.pharaohcardgame.Utils;

import lombok.RequiredArgsConstructor;
import org.game.pharaohcardgame.Model.DTO.Request.CardRequest;
import org.game.pharaohcardgame.Model.DTO.Response.*;
import org.game.pharaohcardgame.Model.DTO.ResponseMapper;
import org.game.pharaohcardgame.Model.GameSession;
import org.game.pharaohcardgame.Model.Player;
import org.game.pharaohcardgame.Model.RedisModel.Card;
import org.game.pharaohcardgame.Model.RedisModel.GameState;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class NotificationHelpers {
    private final ResponseMapper responseMapper;
    private final SimpMessagingTemplate simpMessagingTemplate;
    private final GameSessionUtils gameSessionUtils;


    public void sendPlayerLeftNotification(Player leavingPlayer, List<Player> players) {

        for (Player player : players) {
            if (!player.getIsBot() && !player.getPlayerId().equals(leavingPlayer.getPlayerId())) {
                simpMessagingTemplate.convertAndSendToUser(
                        player.getUser().getId().toString(),
                        "/queue/game/player-left",
                        PlayerLeftResponse.builder().newName(leavingPlayer.getBot().getName()).playerId(leavingPlayer.getPlayerId()).build()
                );
            }
        }

    }

    public void sendGameEnded(GameSession gameSession, String reason) {
        for (Player player : gameSession.getPlayers()) {
            if (!player.getIsBot()) {
                // Update user's current room status - they stay in room but game ends

                simpMessagingTemplate.convertAndSendToUser(
                        player.getUser().getId().toString(),
                        "/queue/game/end",
                        GameEndResponse.builder()
                                .reason(reason)
                                .build()
                );
            }
        }
    }

    public void sendPlayedCardsNotification(Long gameSessionId, GameState gameState, List<PlayedCardResponse> playedCardResponses,List<CardRequest> newPlayedCardsResponse,Long playerId) {
        int playedCardsSize = gameState.getPlayedCards().size();


        Map<String, Object> payload = new HashMap<>();
        payload.put("playedCards", playedCardResponses);
        payload.put("newPlayedCards",newPlayedCardsResponse);
        payload.put("playedCardsSize", playedCardsSize);
        payload.put("playerId",playerId);

        simpMessagingTemplate.convertAndSend(
                "/topic/game/" + gameSessionId + "/played-cards",
                payload
        );
    }

    public void sendSkippedPlayersNotification(Set<Long> skippedPlayers, List<Player> players) {
        for (Player player : players) {
            if (!player.getIsBot()) {
                simpMessagingTemplate.convertAndSendToUser(
                        player.getUser().getId().toString(),
                        "/queue/game/skip",
                        SkipPlayersResponse.builder()
                                .SkippedPlayersId(skippedPlayers)
                                .build()
                );
            }
        }
        skippedPlayers.clear();
    }


    //todo: itt van olyan baj hogy ha streakelunk akkor  a nextseatindex jó de a iscurrentplayer az falset ad
    public void sendNextTurnNotification(Player nextPlayer, List<Player> players, int nextSeatIndex, List<List<Card>> validPlays) {
        for (Player player : players) {
            if (!player.getIsBot()) {
                boolean isCurrentPlayer = player.getPlayerId().equals(nextPlayer.getPlayerId());
                simpMessagingTemplate.convertAndSendToUser(
                        player.getUser().getId().toString(),
                        "/queue/game/turn",
                        NextTurnResponse.builder().isYourTurn(isCurrentPlayer).currentSeat(nextSeatIndex).validPlays(validPlays).build()
                );
            }
        }
    }

    public void sendPlayCardsNotification(GameSession gameSession, GameState gameState) {
        for (Player player : gameSession.getPlayers()) {
            if (!player.getIsBot()) {
                PlayerHandResponse playerHand = gameSessionUtils.getPlayerHand(
                        gameSession.getGameSessionId(), player.getPlayerId());

                simpMessagingTemplate.convertAndSendToUser(
                        player.getUser().getId().toString(),
                        "/queue/game/play-cards",
                        PlayCardResponse.builder().playerHand(playerHand).gameData(gameState.getGameData()).build()
                );
            }
        }
    }

    public void sendPlayerHasToDrawStack(Player player, Map<Long, Integer> drawStack) {
        if (!player.getIsBot()) {
            simpMessagingTemplate.convertAndSendToUser(player.getUser().getId().toString(), "/queue/game/draw-stack", DrawStackResponse.builder().drawStack(drawStack).build());

        }
    }


    public void sendDrawCardNotification(List<Player> players, Player currentPlayer, List<Card> drawnCards, Integer deckSize, Integer playedCardsSize, GameState newGameState,int drawCardsLength) {
        for (Player player : players) {
            if (!player.getIsBot()) {
                DrawCardResponse personalizedResponse;
                if (player.getPlayerId().equals(currentPlayer.getPlayerId())) {
                    personalizedResponse = responseMapper.toDrawCardResponse(newGameState, drawnCards, currentPlayer.getPlayerId(), deckSize, playedCardsSize,drawCardsLength,player.getPlayerId());
                } else {
                    personalizedResponse = responseMapper.toDrawCardResponse(newGameState, null, currentPlayer.getPlayerId(), deckSize, playedCardsSize,drawCardsLength,player.getPlayerId());
                }
                simpMessagingTemplate.convertAndSendToUser(
                        player.getUser().getId().toString(),
                        "/queue/game/draw",
                        personalizedResponse
                );
            }
        }
    }

    public void sendTurnSkipped(GameSession gameSession, Player currentPlayer, GameState gameState) {
        for (Player player : gameSession.getPlayers()) {
            if (!player.getIsBot()) {
                simpMessagingTemplate.convertAndSendToUser(
                        player.getUser().getId().toString(),
                        "/queue/game/skip",
                        SkipTurnResponse.builder()
                                .skippedPlayerId(currentPlayer.getPlayerId())
                                .skippedPlayerSeat(currentPlayer.getSeat())
                                .deckSize(gameState.getDeck().size())
                                .build()
                );
            }
        }
    }
}
