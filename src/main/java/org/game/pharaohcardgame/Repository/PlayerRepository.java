package org.game.pharaohcardgame.Repository;

import io.lettuce.core.dynamic.annotation.Param;
import org.game.pharaohcardgame.Model.Bot;
import org.game.pharaohcardgame.Model.Player;
import org.game.pharaohcardgame.Model.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface PlayerRepository  extends JpaRepository<Player, Long> {


	@Query("SELECT p FROM Player p " +
			"WHERE p.user.id = :userId " +
			"AND p.gameSession.room.roomId = p.user.currentRoom.roomId " +
			"AND p.gameSession.room.active = true")
	Player findPlayerByUserInActiveCurrentRoom(@Param("userId") Long userId);
}
