package org.game.pharaohcardgame.Model.DTO.Response;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DrawCardResponse {
	private Long gameSessionId;
	private Long playerId;
	private List<CardInHandResponse> newCard;
	private Map<Long, Integer> otherPlayersCardCount;
	private Integer deckSize;
	private Integer playedCardsSize;
	private Map<String, Object> gameData;
	private int drawCardsLength;
	private Boolean reshuffled; // ✨ ÚJ MEZŐ
}
