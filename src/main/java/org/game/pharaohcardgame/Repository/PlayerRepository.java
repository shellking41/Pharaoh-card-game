package org.game.pharaohcardgame.Repository;

import io.lettuce.core.dynamic.annotation.Param;
import org.game.pharaohcardgame.Model.Bot;
import org.game.pharaohcardgame.Model.Player;
import org.game.pharaohcardgame.Model.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface PlayerRepository  extends JpaRepository<Player, Long> {

	@Query("SELECT g FROM Player p " +
			"JOIN p.gameSession g " +
			"LEFT JOIN FETCH g.players " +
			"WHERE p.playerId = :id")
	Optional<Player> findByIdWithGameSession(@Param("id") Long id);
}
