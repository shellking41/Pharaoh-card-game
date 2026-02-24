package org.game.pharaohcardgame.Model.DTO.Response;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameStatisticsResponse {
	private Long gameId;
	private Long userId;
	private String username;
	private Long roomId;
	private String roomName;
	private Boolean isWinner;
	private Integer finalPosition;
	private LocalDateTime playedAt;
}
