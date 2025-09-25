package org.game.pharaohcardgame.Model.DTO.Request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.game.pharaohcardgame.Enum.CardSuit;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PlayCardsRequest {
	@NotNull
	@NotEmpty
	@Valid
	List<@NotNull CardRequest> playCards;
	CardSuit changeSuitTo;
	@NotNull
	Long playerId;
}
