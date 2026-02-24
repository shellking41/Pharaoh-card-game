package org.game.pharaohcardgame.Repository;

import org.game.pharaohcardgame.Model.GameStatistics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GameStatisticsRepository extends JpaRepository<GameStatistics, Long> {


	List<GameStatistics> findByGameSession_GameSessionId(Long gameSessionId);

	@Query("SELECT gs FROM GameStatistics gs WHERE gs.gameSession.gameSessionId = :gameSessionId AND gs.countedInStats = false")
	List<GameStatistics> findUncountedByGameSessionId(@Param("gameSessionId") Long gameSessionId);

	List<GameStatistics> findByUser_IdOrderByPlayedAtDesc(Long userId);

	List<GameStatistics> findByRoom_RoomIdOrderByPlayedAtDesc(Long roomId);
}