package org.game.pharaohcardgame.Model.RedisModel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.game.pharaohcardgame.Enum.GameStatus;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class GameState {
	private Long gameSessionId;
	private List<Card> deck; // pakli
	private Map<Long, List<Card>> playerHands; // playerId -> kártyák
	private List<Card> playedCards; // lerakott kártyák
	private Long currentPlayerId; // aktuális játékos
	private GameStatus status;
	private Map<String, Object> gameData; // további game-specifikus adatok
	private Long version;
}