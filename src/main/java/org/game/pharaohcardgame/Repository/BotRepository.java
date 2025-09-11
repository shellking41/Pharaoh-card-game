package org.game.pharaohcardgame.Repository;

import io.lettuce.core.dynamic.annotation.Param;
import org.game.pharaohcardgame.Model.Bot;
import org.game.pharaohcardgame.Model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface BotRepository extends JpaRepository<Bot, Long> {

	@Query("SELECT b FROM Room r JOIN r.bots b WHERE r.roomId = :id")
	List<Bot> loadBots(@Param("id") Long id);
}
