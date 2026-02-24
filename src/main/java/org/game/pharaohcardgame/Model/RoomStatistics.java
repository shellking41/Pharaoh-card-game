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
@Table(name = "room_statistics",
		uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "room_id"}))
@Builder
public class RoomStatistics {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@ManyToOne
	@JoinColumn(name = "room_id", nullable = false)
	private Room room;

	@Column(nullable = false)
	@Builder.Default
	private Integer gamesPlayedInRoom = 0;

	@Column(nullable = false)
	@Builder.Default
	private Integer winsInRoom = 0;

	@Column(nullable = false)
	@Builder.Default
	private Integer lossesInRoom = 0;

	@Column(nullable = false)
	@Builder.Default
	private Double winRateInRoom = 0.0;

	public void calculateWinRate() {
		if (gamesPlayedInRoom > 0) {
			this.winRateInRoom = (double) winsInRoom / gamesPlayedInRoom * 100;
		} else {
			this.winRateInRoom = 0.0;
		}
	}

	public void incrementWins() {
		this.winsInRoom++;
		this.gamesPlayedInRoom++;
		calculateWinRate();
	}

	public void incrementLosses() {
		this.lossesInRoom++;
		this.gamesPlayedInRoom++;
		calculateWinRate();
	}
}