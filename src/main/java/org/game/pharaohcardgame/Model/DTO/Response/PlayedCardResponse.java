package org.game.pharaohcardgame.Model.DTO.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.game.pharaohcardgame.Enum.CardRank;
import org.game.pharaohcardgame.Enum.CardSuit;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlayedCardResponse {
	private String cardId;
	private CardSuit suit;
	private CardRank rank;
}
