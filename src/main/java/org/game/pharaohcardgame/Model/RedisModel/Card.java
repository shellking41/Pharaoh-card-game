package org.game.pharaohcardgame.Model.RedisModel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.*;
import org.game.pharaohcardgame.Enum.CardRank;
import org.game.pharaohcardgame.Enum.CardSuit;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Card {
	@EqualsAndHashCode.Include
	private String cardId; // UUID - ez az egyedi azonosító

	@Enumerated(EnumType.STRING)
	private CardSuit suit;

	@Enumerated(EnumType.STRING)
	private CardRank rank;

	private Long ownerId;
	private int position;
}
