package org.game.pharaohcardgame.Repository;

import io.lettuce.core.dynamic.annotation.Param;
import org.game.pharaohcardgame.Enum.GameStatus;
import org.game.pharaohcardgame.Model.GameSession;
import org.game.pharaohcardgame.Model.Message;
import org.game.pharaohcardgame.Model.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface GameSessionRepository  extends JpaRepository<GameSession, Long> {
	boolean existsByRoomAndGameStatus(Room room, GameStatus gameStatus);

	@Query("SELECT g FROM GameSession g LEFT JOIN FETCH g.players WHERE g.room.roomId = :roomId AND g.gameStatus = :gameStatus")
	Optional<GameSession> findByRoomIdAndGameStatusWithPlayers(@Param("roomId") Long roomId, @Param("gameStatus") GameStatus gameStatus);


	@Query("SELECT g FROM GameSession g " +
			"LEFT JOIN FETCH g.players p " +
			"WHERE g.gameSessionId = :id")
	Optional<GameSession> findByIdWithPlayers(@Param("id") Long id);
}
