package org.game.pharaohcardgame.Model.DTO.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserStatisticsResponse {
	private Long userId;
	private String username;
	private Integer totalGamesPlayed;
	private Integer totalWins;
	private Integer totalLosses;
	private Double winRate;
}
