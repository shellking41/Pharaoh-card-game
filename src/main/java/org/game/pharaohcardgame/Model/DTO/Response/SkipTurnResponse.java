package org.game.pharaohcardgame.Model.DTO.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SkipTurnResponse {
	private Long skippedPlayerId;
	private Integer skippedPlayerSeat;
	private boolean skipTurn;
	private Integer deckSize;
}