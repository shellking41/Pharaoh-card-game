package org.game.pharaohcardgame.Repository;

import org.game.pharaohcardgame.Model.UserStatistics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserStatisticsRepository extends JpaRepository<UserStatistics, Long> {

	Optional<UserStatistics> findByUser_Id(Long userId);

	@Query("SELECT us FROM UserStatistics us ORDER BY us.winRate DESC")
	List<UserStatistics> findTopPlayersByWinRate();
}