package org.game.pharaohcardgame.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "game_statistics")
@Builder
public class GameStatistics {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@ManyToOne
	@JoinColumn(name = "room_id", nullable = false)
	private Room room;

	@ManyToOne
	@JoinColumn(name = "game_session_id", nullable = false)
	private GameSession gameSession;

	@Column(nullable = false)
	private Boolean isWinner;

	@Column(nullable = false)
	private Integer finalPosition; // 1 = nyert, 2-4 = veszített (hányadikként esett ki)

	@Column(nullable = false)
	private LocalDateTime playedAt;

	@Column(nullable = false)
	@Builder.Default
	private Boolean countedInStats = false; // Flag to track if this game was counted
}