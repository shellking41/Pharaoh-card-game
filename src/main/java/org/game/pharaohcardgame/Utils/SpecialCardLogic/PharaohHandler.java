package org.game.pharaohcardgame.Utils.SpecialCardLogic;

import lombok.RequiredArgsConstructor;
import org.game.pharaohcardgame.Enum.CardRank;
import org.game.pharaohcardgame.Enum.CardSuit;
import org.game.pharaohcardgame.Model.GameSession;
import org.game.pharaohcardgame.Model.Player;
import org.game.pharaohcardgame.Model.RedisModel.Card;
import org.game.pharaohcardgame.Model.RedisModel.GameState;
import org.game.pharaohcardgame.Utils.GameSessionUtils;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class PharaohHandler implements SpecialCardHandler{
    private final GameSessionUtils gameSessionUtils;

    @Override
    public boolean applies(List<Card> playedCards) {

        if(!(playedCards.getFirst().getRank()==CardRank.JACK && playedCards.getFirst().getSuit()== CardSuit.LEAVES)){
                return false;
        }

        return true;

    }

    @Override
    public void onPlay(List<Card> playedCards, Player currentPlayer, GameSession gameSession, GameState gameState) {
        Map<Long,Integer> drawStack = gameSessionUtils.getSpecificGameDataTypeMap("drawStack", gameState);
	    drawStack.remove(currentPlayer.getPlayerId());

    }
}
