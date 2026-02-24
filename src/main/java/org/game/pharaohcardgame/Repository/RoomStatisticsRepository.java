package org.game.pharaohcardgame.Repository;

import org.game.pharaohcardgame.Model.RoomStatistics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomStatisticsRepository extends JpaRepository<RoomStatistics, Long> {

	// Javított metódusok - underscore használatával
	Optional<RoomStatistics> findByUser_IdAndRoom_RoomId(Long userId, Long roomId);

	List<RoomStatistics> findByRoom_RoomIdOrderByWinRateInRoomDesc(Long roomId);

	List<RoomStatistics> findByUser_Id(Long userId);
}