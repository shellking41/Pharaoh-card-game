package org.game.pharaohcardgame.Model.RedisModel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.game.pharaohcardgame.Enum.CardRank;
import org.game.pharaohcardgame.Enum.CardSuit;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class Card {
	private String cardId; // UUID
	@Enumerated(EnumType.STRING)
	private CardSuit suit;
	@Enumerated(EnumType.STRING)
	private CardRank rank;
	private Long ownerId; // Player ID aki birtokolja
	private int position; // kézbeli pozíció
}
