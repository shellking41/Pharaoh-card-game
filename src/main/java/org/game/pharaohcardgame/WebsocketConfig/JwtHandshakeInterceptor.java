package org.game.pharaohcardgame.WebsocketConfig;

import org.game.pharaohcardgame.Authentication.JwtService;
import org.game.pharaohcardgame.Authentication.UserAuthenticationToken;
import org.game.pharaohcardgame.Authentication.UserPrincipal;
import org.game.pharaohcardgame.Model.User;
import org.game.pharaohcardgame.Repository.TokensRepository;
import org.game.pharaohcardgame.Repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

	private final UserRepository userRepository;
	private final JwtService jwtService;
	private final TokensRepository tokensRepository;

	@Override
	public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
	                               WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {

		log.debug("WebSocket handshake started for: {}", request.getURI());

		String token = null;

		try {
			HttpServletRequest servletRequest = ((ServletServerHttpRequest) request).getServletRequest();

			// Token kinyerése a paraméterből
			token = servletRequest.getParameter("token");
			log.debug("Token from parameter: {}", token != null ? "Present" : "Missing");



			if (token == null || token.isEmpty()) {
				log.error("Missing or invalid Authorization token");
				return false; // Ne dobjunk Exception-t, csak térjünk vissza false-szal
			}

			// User lekérése
			Long userId = jwtService.getUserIdFromToken(token);
			log.debug("User ID from token: {}", userId);

			User user = userRepository.findById(userId)
					.orElseThrow(() -> new AuthenticationServiceException("User not found with ID: " + userId));

			log.debug("User found: {}", user.getName());

			// Token validálása
			var isTokenValid = tokensRepository.findByToken(token)
					.map(t -> !t.isExpired() && !t.isRevoked())
					.orElse(false);

			log.debug("Token validity check - JWT valid: {}, DB valid: {}",
					jwtService.isTokenValid(token, user), isTokenValid);

			if (!(jwtService.isTokenValid(token, user) && isTokenValid)) {
				log.error("Invalid JWT token for user: {}", user.getName());
				return false;
			}

			// Principal létrehozása
			String usernameFromToken = jwtService.getUsernameFromToken(token);
			UserPrincipal principal = new UserPrincipal(usernameFromToken, userId);

			// Authentication token létrehozása
			UserAuthenticationToken authToken = UserAuthenticationToken.authenticated(
					principal,
					user.getAuthorities()
			);



			// SecurityContext beállítása
			SecurityContextHolder.getContext().setAuthentication(authToken);

			log.info("WebSocket handshake successful for user: {} (ID: {}) with roles: {}",
					usernameFromToken, userId, user.getAuthorities());

			// Principal elmentése az attributes-be
			attributes.put("principal", authToken);
			attributes.put("userId", userId);
			attributes.put("username", usernameFromToken);

			return true;

		} catch (Exception e) {
			log.error("WebSocket handshake failed: {}", e.getMessage(), e);
			return false;
		}
	}

	@Override
	public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
	                           WebSocketHandler wsHandler, Exception exception) {
		if (exception != null) {
			log.error("WebSocket handshake completed with error: {}", exception.getMessage());
		} else {
			log.debug("WebSocket handshake completed successfully");
		}
	}
}