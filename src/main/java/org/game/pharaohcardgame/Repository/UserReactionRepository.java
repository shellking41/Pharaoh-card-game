package org.game.pharaohcardgame.Repository;

import org.game.pharaohcardgame.Model.User;
import org.game.pharaohcardgame.Model.UserReaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserReactionRepository extends JpaRepository<UserReaction, Long> {

    Optional<UserReaction> findByReactorAndTarget(User reactor, User target);


    boolean existsByReactorAndTarget(User reactor, User target);

    void deleteByReactorAndTarget(User reactor, User target);
}
