package org.game.pharaohcardgame.Model.DTO.Response;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.game.pharaohcardgame.Enum.GameStatus;
import org.game.pharaohcardgame.Model.Player;
import org.game.pharaohcardgame.Model.Room;

import java.util.ArrayList;
import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class GameSessionResponse {

	private PlayerHandResponse playerHand;
	private Long gameSessionId;
	private List<PlayedCardResponse> playedCards=new ArrayList<>();
	private List<PlayerStatusResponse> players=new ArrayList<>();
	@Enumerated(EnumType.STRING)
	private GameStatus gameStatus;
	private Integer deckSize;
}
