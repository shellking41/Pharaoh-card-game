package org.game.pharaohcardgame.Model.DTO.Request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.game.pharaohcardgame.Enum.CardSuit;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PlayCardsRequest {
	List<CardRequest> playCards;
	CardSuit changeSuitTo;
	Long playerId;
}
