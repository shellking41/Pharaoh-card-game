package org.game.pharaohcardgame.Model.DTO.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomStatisticsResponse {
	private Long userId;
	private String username;
	private Long roomId;
	private String roomName;
	private Integer gamesPlayedInRoom;
	private Integer winsInRoom;
	private Integer lossesInRoom;
	private Double winRateInRoom;
}
