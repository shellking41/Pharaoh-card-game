package org.game.pharaohcardgame.Model.DTO.Request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
	@NotBlank
	private String cardId;
	@NotNull
	private CardSuit suit;
	@NotNull
	private CardRank rank;
	@NotNull
	private Long ownerId;
	@NotNull
	private int position;
}
