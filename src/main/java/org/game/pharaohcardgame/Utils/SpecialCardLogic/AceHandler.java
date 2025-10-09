package org.game.pharaohcardgame.Utils.SpecialCardLogic;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.game.pharaohcardgame.Enum.CardRank;
import org.game.pharaohcardgame.Model.GameSession;
import org.game.pharaohcardgame.Model.Player;
import org.game.pharaohcardgame.Model.RedisModel.Card;
import org.game.pharaohcardgame.Model.RedisModel.GameState;
import org.game.pharaohcardgame.Utils.GameSessionUtils;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class AceHandler implements SpecialCardHandler{
    private final GameSessionUtils gameSessionUtils;

    @Override
    public boolean applies(List<Card> playedCards) {
        for (Card playedCard: playedCards){
            if(playedCard.getRank() != CardRank.ACE){
                return false;
            }
        }
        return true;
    }

    @Override
    public void onPlay(List<Card> playedAceCards, Player currentPlayer, GameSession gameSession, GameState gameState) {

        //itt nem kell nekünk az hogy vissza kapjuk hogy ki következik, mert ez nekünk csak az kell itt hogy setelje a skipped playerst
        gameSessionUtils.calculateNextTurn(currentPlayer,gameSession,gameState,playedAceCards.size());



        log.info("In gameSession : {} skipped player count is : {}",gameSession.getGameSessionId(),playedAceCards.size());
    }
}
