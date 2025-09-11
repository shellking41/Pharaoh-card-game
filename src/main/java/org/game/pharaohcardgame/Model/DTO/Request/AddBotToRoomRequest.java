package org.game.pharaohcardgame.Model.DTO.Request;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.game.pharaohcardgame.Enum.BotDifficulty;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AddBotToRoomRequest {

	private String name;
	@Enumerated(EnumType.STRING)
	private BotDifficulty difficulty;

	private Long roomId;
}
