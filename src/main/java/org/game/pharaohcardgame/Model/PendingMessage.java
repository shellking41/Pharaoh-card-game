package org.game.pharaohcardgame.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table
@Builder
public class PendingMessage {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(unique = true, nullable = false)
	private String messageId; // UUID alapú egyedi azonosító

	@Column(nullable = false)
	private Long userId; // Címzett user ID

	@Column(nullable = false)
	private String destination; // WebSocket destination (/queue/test, /queue/join-response, stb.)

	@Column(columnDefinition = "TEXT", nullable = false)
	private String messageContent; // JSON formátumban tárolt üzenet tartalom

	@Column(nullable = false)
	private LocalDateTime sentAt; // Küldés időpontja



}
