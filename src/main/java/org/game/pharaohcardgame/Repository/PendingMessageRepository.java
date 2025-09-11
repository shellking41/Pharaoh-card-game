package org.game.pharaohcardgame.Repository;

import org.game.pharaohcardgame.Model.PendingMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PendingMessageRepository  extends JpaRepository<PendingMessage, Long> {
	Optional<PendingMessage> findByMessageId(String messageId);
}
