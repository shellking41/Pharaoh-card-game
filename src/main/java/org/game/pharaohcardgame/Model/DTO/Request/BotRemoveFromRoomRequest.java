package org.game.pharaohcardgame.Model.DTO.Request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class BotRemoveFromRoomRequest {
	private Long botId;
	private Long roomId;
}
