package org.game.pharaohcardgame.Utils.SpecialCardLogic;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.game.pharaohcardgame.Enum.CardRank;
import org.game.pharaohcardgame.Model.GameSession;
import org.game.pharaohcardgame.Model.Player;
import org.game.pharaohcardgame.Model.RedisModel.Card;
import org.game.pharaohcardgame.Model.RedisModel.GameState;
import org.game.pharaohcardgame.Model.Results.NextTurnResult;
import org.game.pharaohcardgame.Utils.GameSessionUtils;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
@Slf4j
@RequiredArgsConstructor
public class SevenHandler implements SpecialCardHandler{
    private final GameSessionUtils gameSessionUtils;
    private static final int DRAW_PER_SEVEN = 3;
    @Override
    public boolean applies(List<Card> playedCards) {
        for (Card playedCard: playedCards){
            if(playedCard.getRank() != CardRank.VII){
                return false;
            }
        }
        return true;
    }

    @Override
    //todo: elkell kuldeni a usernek hogvy már nem kell huznia tobb kartyat, ez azert is kell mert ha a usert atadja a kovetkezo playernek a stacket akkor annak mar ne jelenjen meg fontednen az hogy huzzon fel stacket
    public void onPlay(List<Card> playedVIICards, Player currentPlayer, GameSession gameSession, GameState gameState) {
        if (playedVIICards == null || playedVIICards.isEmpty()) return;

        Map<Long,Integer> drawStack = gameSessionUtils.getSpecificGameDataTypeMap("drawStack", gameState);

        //csak kiszamoljuk hogy kinek kell felhuznia a kartyakat
        NextTurnResult nextTurnResult = gameSessionUtils.calculateNextTurn(currentPlayer, gameSession, gameState,0);
        Player nextPlayer = nextTurnResult.nextPlayer();
        if (nextPlayer == null) {
            log.warn("Next player is null when applying seven effect for player {}", currentPlayer.getPlayerId());
            return;
        }
        Long currentPlayerId = currentPlayer.getPlayerId();
        Long nextPlayerId = nextPlayer.getPlayerId();

        int existingForCurrent = drawStack.getOrDefault(currentPlayerId, 0);
        int existingForNext = drawStack.getOrDefault(nextPlayerId, 0);

        int increment = DRAW_PER_SEVEN * playedVIICards.size();

        // Az új érték: ami már a következőhöz volt, plusz amit a current-nek kellett, plusz az új hetesek hatása
        int updated = existingForNext + existingForCurrent + increment;

        // Töröljük a currentPlayer bejegyzését (átadtuk/elfogyott)
        drawStack.remove(currentPlayerId);

        // Frissítjük a nextPlayer-hez tartozó stacket
        drawStack.put(nextPlayerId, updated);


        log.info("Player {} must now draw {} cards (was: current={}, nextBefore={})",
                nextPlayerId, updated, existingForCurrent, existingForNext);



    }
}
