package org.game.pharaohcardgame.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "user_statistics")
@Builder
public class UserStatistics {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@OneToOne
	@JoinColumn(name = "user_id", nullable = false, unique = true)
	private User user;

	@Column(nullable = false)
	@Builder.Default
	private Integer totalGamesPlayed = 0;

	@Column(nullable = false)
	@Builder.Default
	private Integer totalWins = 0;

	@Column(nullable = false)
	@Builder.Default
	private Integer totalLosses = 0;

	@Column(nullable = false)
	@Builder.Default
	private Double winRate = 0.0;

	// Metódus a winRate számításához
	public void calculateWinRate() {
		if (totalGamesPlayed > 0) {
			this.winRate = (double) totalWins / totalGamesPlayed * 100;
		} else {
			this.winRate = 0.0;
		}
	}

	public void incrementWins() {
		this.totalWins++;
		this.totalGamesPlayed++;
		calculateWinRate();
	}

	public void incrementLosses() {
		this.totalLosses++;
		this.totalGamesPlayed++;
		calculateWinRate();
	}
}