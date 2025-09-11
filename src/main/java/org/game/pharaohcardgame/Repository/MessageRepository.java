package org.game.pharaohcardgame.Repository;


import org.game.pharaohcardgame.Model.Message;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<Message, Long> {

}
