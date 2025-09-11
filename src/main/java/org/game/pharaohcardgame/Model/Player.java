package org.game.pharaohcardgame.Model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.game.pharaohcardgame.Enum.BotDifficulty;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table
@Builder
public class Player {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long playerId;

	@ManyToOne
	@JoinColumn(name="user_id")
	private User user;


	@OneToOne(mappedBy = "botPlayer", cascade = CascadeType.ALL, orphanRemoval = true)
	private Bot bot;

	@ManyToOne
	@JoinColumn(name="game_session_id")
	private GameSession gameSession;

	private Boolean isBot;

	@NotNull
	private Integer seat;
	@Builder.Default
	private Integer lossCount=0;

	@Enumerated(EnumType.STRING)
	private BotDifficulty botDifficulty;
}
