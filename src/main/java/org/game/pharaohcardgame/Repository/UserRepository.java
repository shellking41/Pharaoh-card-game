package org.game.pharaohcardgame.Repository;

import org.game.pharaohcardgame.Model.User;
import io.lettuce.core.dynamic.annotation.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User,Long> {
	Optional<User> findByName(String name);

	@Query("SELECT u FROM User u LEFT JOIN FETCH u.currentRoom LEFT JOIN FETCH u.managedRooms WHERE u.id = :id")
	Optional<User> findByIdWithRooms(@Param("id") Long id);

}
