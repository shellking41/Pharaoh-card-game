package org.game.pharaohcardgame.WebsocketConfig;

import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Egyszerű registry: sessionId -> userId, valamint userId -> set(sessionId).
 * Ha egy usernek nincs több sessionje, akkor ténylegesen "offline"-nak tekintjük.
 */
@Slf4j
@Component
public class SessionRegistry {
	// sessionId -> userId
	private final Map<String, Long> sessionToUser = new ConcurrentHashMap<>();

	// userId -> set(sessionId)
	private final Map<Long, Set<String>> userToSessions = new ConcurrentHashMap<>();

	// ✅ ÚJ: sessionId -> token (token tracking)
	private final Map<String, String> sessionToToken = new ConcurrentHashMap<>();

	public void registerSession(Long userId, String sessionId) {
		sessionToUser.put(sessionId, userId);
		userToSessions.compute(userId, (k, set) -> {
			if (set == null) set = ConcurrentHashMap.newKeySet();
			set.add(sessionId);
			return set;
		});
		log.debug("Registered session {} for user {}", sessionId, userId);
	}

	// ✅ ÚJ: Token regisztrálása
	public void registerToken(String sessionId, String token) {
		sessionToToken.put(sessionId, token);
		log.debug("Registered token for session {}", sessionId);
	}

	public int unregisterSession(String sessionId) {
		Long userId = sessionToUser.remove(sessionId);

		// ✅ Token törlése
		sessionToToken.remove(sessionId);

		if (userId == null) return 0;

		userToSessions.computeIfPresent(userId, (k, set) -> {
			set.remove(sessionId);
			return set.isEmpty() ? null : set;
		});

		Set<String> remaining = userToSessions.getOrDefault(userId, Collections.emptySet());
		log.debug("Unregistered session {}. Remaining sessions for user {}: {}",
				sessionId, userId, remaining.size());
		return remaining.size();
	}

	public int getSessionCount(Long userId) {
		return userToSessions.getOrDefault(userId, Collections.emptySet()).size();
	}

	// ✅ ÚJ: User session ID-k lekérése
	public Set<String> getSessionIds(Long userId) {
		return new HashSet<>(userToSessions.getOrDefault(userId, Collections.emptySet()));
	}

	// ✅ ÚJ: Token lekérése session alapján
	public String getToken(String sessionId) {
		return sessionToToken.get(sessionId);
	}

	// ✅ ÚJ: User ID lekérése session alapján
	public Long getUserId(String sessionId) {
		return sessionToUser.get(sessionId);
	}

	// ✅ ÚJ: Összes session token Map
	public Map<String, String> getAllSessionTokens() {
		return new HashMap<>(sessionToToken);
	}

	// ✅ ÚJ: Session-ök keresése token alapján
	public List<String> findSessionsByToken(String token) {
		List<String> sessions = new ArrayList<>();
		sessionToToken.forEach((sessionId, t) -> {
			if (token.equals(t)) {
				sessions.add(sessionId);
			}
		});
		return sessions;
	}
}