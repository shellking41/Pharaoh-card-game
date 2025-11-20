package org.game.pharaohcardgame.Model.DTO.Response;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.game.pharaohcardgame.Model.RedisModel.Card;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NextTurnResponse {
    boolean isYourTurn;
    Integer currentSeat;
    List<List<Card>> validPlays;
}
