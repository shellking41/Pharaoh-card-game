package org.game.pharaohcardgame.WebsocketConfig;

import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Egyszerű registry: sessionId -> username, valamint username -> set(sessionId).
 * Ha egy usernek nincs több sessionje, akkor ténylegesen "offline"-nak tekintjük.
 */
@Component
public class SessionRegistry {
	// sessionId -> username
	private final Map<String, Long> sessionToUser = new ConcurrentHashMap<>();
	// username -> set(sessionId)
	private final Map<Long, Set<String>> userToSessions = new ConcurrentHashMap<>();

	public void registerSession(Long userId, String sessionId) {
		sessionToUser.put(sessionId, userId);
		userToSessions.compute(userId, (k, set) -> {
			if (set == null) set = ConcurrentHashMap.newKeySet();
			set.add(sessionId);
			return set;
		});
	}

	public int unregisterSession(String sessionId) {
		Long userId = sessionToUser.remove(sessionId);
		if (userId == null) return 0;
		userToSessions.computeIfPresent(userId, (k, set) -> {
			set.remove(sessionId);
			return set.isEmpty() ? null : set;
		});
		Set<String> remaining = userToSessions.getOrDefault(userId, Collections.emptySet());
		return remaining.size();
	}

	public int getSessionCount(Long userId) {
		return userToSessions.getOrDefault(userId, Collections.emptySet()).size();
	}
}
