package org.game.pharaohcardgame.Model.DTO.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.game.pharaohcardgame.Model.RedisModel.Card;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReorderCardsResponse {
	private Long playerId;
	private List<Card> reorderedCards;
	private String message;
}