package org.game.pharaohcardgame.WebsocketConfig;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.game.pharaohcardgame.Authentication.UserPrincipal;
import org.game.pharaohcardgame.Model.DTO.Request.LeaveGameSessionRequest;
import org.game.pharaohcardgame.Model.DTO.Request.LeaveRequest;
import org.game.pharaohcardgame.Model.GameSession;
import org.game.pharaohcardgame.Model.Player;
import org.game.pharaohcardgame.Model.User;
import org.game.pharaohcardgame.Repository.PlayerRepository;
import org.game.pharaohcardgame.Repository.UserRepository;
import org.game.pharaohcardgame.Service.Implementation.GameSessionService;
import org.game.pharaohcardgame.Service.Implementation.RoomService;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebsocketSessionEventListener {

	private final SessionRegistry sessionRegistry;
	private final UserRepository userRepository;
	private final RoomService roomService; // vagy ahol handleUserDisconnected lesz
	private final GameSessionService gameSessionService;
	private final PlayerRepository playerRepository;
	private final DisconnectCoordinator disconnectCoordinator;
	private final TransactionTemplate transactionTemplate;

	@EventListener
	public void handleSessionConnected(SessionConnectEvent event) {
		StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
		UserPrincipal principal = (UserPrincipal)accessor.getUser();
		if (principal == null) return;
		String principalName = principal.getName();
		String sessionId = accessor.getSessionId();
		Long userId = Long.parseLong(principal.getName());
		log.info("WS connect: session={} principal={}", sessionId, principalName);
		sessionRegistry.registerSession(userId, sessionId);

		if (disconnectCoordinator.cancelDisconnect(userId)) {
			log.info("Canceled pending disconnect for user {}", userId);
		}
	}

	@EventListener
	public void handleSessionDisconnect(SessionDisconnectEvent event) {
		StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
		UserPrincipal principal = (UserPrincipal)accessor.getUser();
		String sessionId = accessor.getSessionId();

		if(principal==null){
			log.debug("Disconnect with no principal for session {}", sessionId);
			return;
		}

		Long userId = Long.parseLong(principal.getName());

		int remaining = sessionRegistry.unregisterSession(sessionId);
		log.info("User {} disconnected session {} – remaining sessions: {}",
				userId, sessionId, remaining);

		if (remaining > 0) {
			// több tab / másik active session van → semmi sem történik
			return;
		}

		disconnectCoordinator.scheduleDisconnect(userId, () -> {
			transactionTemplate.execute(status -> {
				try {
					log.info("Starting scheduled disconnect handling for user {}", userId);

					Optional<User> maybeUser = userRepository.findById(userId);
					if (maybeUser.isEmpty()) {
						log.warn("Scheduled disconnect: user {} not found", userId);
						return null;
					}
					User user = maybeUser.get();

					// ✅ KRITIKUS: ELŐSZÖR a game session-t kezeljük
					try {
						Player player = playerRepository.findPlayerByUserInActiveCurrentRoom(userId);
						if (player != null && player.getGameSession() != null) {
							GameSession gameSession = player.getGameSession();

							boolean isGamemaster = gameSession.getRoom().getGamemaster() != null &&
									gameSession.getRoom().getGamemaster().getId().equals(userId);

							LeaveGameSessionRequest lg = LeaveGameSessionRequest.builder()
									.gameSessionId(gameSession.getGameSessionId())
									.build();

							gameSessionService.leaveGameSession(lg, user);

							log.info("User {} left game session {} (isGamemaster: {})",
									userId, gameSession.getGameSessionId(), isGamemaster);

							if (isGamemaster) {
								log.info("Gamemaster {} disconnect handled, skipping room leave", userId);
								return null;
							}
						}
					} catch (Exception ex) {
						log.error("Error in scheduled gameSession leave for user {}: {}",
								userId, ex.getMessage(), ex);
					}

					log.info("Completed scheduled disconnect handling for user {}", userId);

					// ✅ ROOM leave csak akkor, ha NEM volt gamemaster
					if (user.getCurrentRoom() != null) {
						try {
							LeaveRequest lr = LeaveRequest.builder()
									.roomId(user.getCurrentRoom().getRoomId())
									.build();
							log.info("User {} left room {}", userId, user.getCurrentRoom().getRoomId());
							roomService.leaveRoom(lr, user);

						} catch (Exception ex) {
							log.error("Error in scheduled room leave for user {}: {}",
									userId, ex.getMessage(), ex);
						}
					}

				} catch (Throwable t) {
					log.error("Unhandled exception in scheduled disconnect for user {}: {}",
							userId, t.getMessage(), t);
					status.setRollbackOnly();
				} finally {
					disconnectCoordinator.cancelDisconnect(userId);
				}
				return null;
			});
		});
	}
}