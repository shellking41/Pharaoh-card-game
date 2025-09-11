package org.game.pharaohcardgame.Model.DTO.Request;


import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.game.pharaohcardgame.Enum.BotDifficulty;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class BotEditRequest {
	private String name;
	@Enumerated(EnumType.STRING)
	private BotDifficulty difficulty;
	private Long botId;
	private Long roomId;
}
