package org.game.pharaohcardgame.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.game.pharaohcardgame.Enum.BotDifficulty;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table
@Builder
public class Bot {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private String name; // pl. "AggressiveBot"

	@Enumerated(EnumType.STRING)
	private BotDifficulty difficulty;

	@ManyToOne
	@JoinColumn(name = "room_id")
	private Room room;

	@OneToOne
	@JoinColumn(name="bot_player_id", unique = true)
	private Player botPlayer;
}
