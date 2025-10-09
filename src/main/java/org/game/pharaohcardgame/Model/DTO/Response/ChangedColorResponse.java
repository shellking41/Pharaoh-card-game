package org.game.pharaohcardgame.Model.DTO.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.game.pharaohcardgame.Enum.CardSuit;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class ChangedColorResponse {
	CardSuit changedColor;
}
