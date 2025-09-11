package org.game.pharaohcardgame.Repository;


import org.game.pharaohcardgame.Model.Tokens;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TokensRepository extends JpaRepository<Tokens,Long> {
    @Query("""
    SELECT t FROM Tokens t
    WHERE t.user.id = :userId AND (
        t.expired = false OR 
        t.revoked = false
    )
    """)
    List<Tokens> findValidTokensByUserId(@Param("userId") Long userId);

    Optional<Tokens> findByToken(String token);
}
