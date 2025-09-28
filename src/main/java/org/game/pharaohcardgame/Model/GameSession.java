package org.game.pharaohcardgame.Model;


import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.game.pharaohcardgame.Enum.GameStatus;

import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table
@Builder
public class GameSession {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long gameSessionId;

	@OneToMany(mappedBy = "gameSession", cascade = CascadeType.ALL, orphanRemoval = true)
	@Builder.Default
	@OrderBy("seat ASC")
	private List<Player> players=new ArrayList<>();

	@ManyToOne
	@JoinColumn(name = "room_id")
	private Room room;

	@NotNull
	@Enumerated(EnumType.STRING)
	private GameStatus gameStatus;
}
