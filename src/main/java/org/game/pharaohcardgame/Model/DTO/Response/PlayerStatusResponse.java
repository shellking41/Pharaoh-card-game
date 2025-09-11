package org.game.pharaohcardgame.Model.DTO.Response;

import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.game.pharaohcardgame.Enum.BotDifficulty;


@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PlayerStatusResponse {

	private Long playerId;
	private Integer seat;
	private Long userId;
	private String playerName;
	private Integer lossCount;
	private boolean isBot;
	@Enumerated(EnumType.STRING)
	private BotDifficulty botDifficulty;

}
