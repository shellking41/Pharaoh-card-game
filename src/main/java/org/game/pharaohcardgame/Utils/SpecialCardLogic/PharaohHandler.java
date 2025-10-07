package org.game.pharaohcardgame.Utils.SpecialCardLogic;

import lombok.RequiredArgsConstructor;
import org.game.pharaohcardgame.Enum.CardRank;
import org.game.pharaohcardgame.Enum.CardSuit;
import org.game.pharaohcardgame.Model.GameSession;
import org.game.pharaohcardgame.Model.Player;
import org.game.pharaohcardgame.Model.RedisModel.Card;
import org.game.pharaohcardgame.Model.RedisModel.GameState;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class PharaohHandler implements SpecialCardHandler{
    @Override
    public boolean applies(List<Card> playedCards) {
        for (Card playedCard: playedCards){
            if(playedCard.getRank()==CardRank.JACK && playedCard.getSuit()== CardSuit.LEAVES){
                return false;
            }
        }
        return true;

    }

    @Override
    public void onPlay(List<Card> playedCards, Player currentPlayer, GameSession gameSession, GameState gameState) {

    }
}
