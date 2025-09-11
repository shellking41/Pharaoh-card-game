package org.game.pharaohcardgame.Model.DTO.Response;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.game.pharaohcardgame.Enum.GameStatus;
import org.game.pharaohcardgame.Model.Player;

import java.util.ArrayList;
import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class GameStartResponse {

	private PlayerHandResponse playerHand;
	private Long gameSessionId;
	private List<PlayerStatusResponse> players=new ArrayList<>();
	@Enumerated(EnumType.STRING)
	private GameStatus gameStatus;
}
