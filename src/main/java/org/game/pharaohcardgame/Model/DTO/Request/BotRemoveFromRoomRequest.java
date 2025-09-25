package org.game.pharaohcardgame.Model.DTO.Request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class BotRemoveFromRoomRequest {
	@NotNull
	private Long botId;
	@NotNull
	private Long roomId;
}
