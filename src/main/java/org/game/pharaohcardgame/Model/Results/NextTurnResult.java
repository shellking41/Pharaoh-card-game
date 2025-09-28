package org.game.pharaohcardgame.Model.Results;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.game.pharaohcardgame.Model.Player;


public record NextTurnResult(Player nextPlayer, int nextSeatIndex) {
}