package org.game.pharaohcardgame.Model.DTO.Response;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DrawCardResponse {


	private Long gameSessionId;
	private Long playerId;
	private CardInHandResponse newCard; // saját kártya
	private Map<Long, Integer> otherPlayersCardCount; // más játékosok kártyaszámai
	private Integer deckSize;

}
