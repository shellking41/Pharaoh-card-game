package org.game.pharaohcardgame.Model.DTO.Request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.game.pharaohcardgame.Enum.CardRank;
import org.game.pharaohcardgame.Enum.CardSuit;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CardRequest {
	private String cardId;
	private CardSuit suit;
	private CardRank rank;

}
