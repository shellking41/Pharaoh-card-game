package org.game.pharaohcardgame.Utils.SpecialCardLogic;

import org.game.pharaohcardgame.Model.GameSession;
import org.game.pharaohcardgame.Model.Player;
import org.game.pharaohcardgame.Model.RedisModel.Card;
import org.game.pharaohcardgame.Model.RedisModel.GameState;

import java.util.List;

public interface SpecialCardHandler {
    /**
     * Visszaadja, hogy ez a handler alkalmas-e a megadott kártyára (pl. rank == SEVEN).
     */
    boolean applies(List<Card> playedCards);

    /**
     * Alkalmazza a hatást amikor a kártyát lejátszották.
     * Must run inside updateGameState lambda.
     * Visszatérési érték: opcionális info (pl. új NextTurnResult adatok) vagy void.
     */
    void onPlay(List<Card> playedCards, Player currentPlayer, GameSession gameSession, GameState gameState);
}