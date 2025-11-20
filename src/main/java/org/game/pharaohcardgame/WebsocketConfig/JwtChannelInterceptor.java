package org.game.pharaohcardgame.WebsocketConfig;

import org.game.pharaohcardgame.Authentication.JwtService;
import org.game.pharaohcardgame.Model.User;
import org.game.pharaohcardgame.Repository.RoomRepository;
import org.game.pharaohcardgame.Repository.TokensRepository;
import org.game.pharaohcardgame.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final TokensRepository tokensRepository;
    private final UserRepository userRepository;
    private final RoomRepository roomRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null) {
            StompCommand command = accessor.getCommand();

            // Csak SEND és SUBSCRIBE-nál kell újra auth-ot ellenőrizni
            if (StompCommand.SEND.equals(command) || StompCommand.SUBSCRIBE.equals(command)) {
                String authorizationHeader = accessor.getFirstNativeHeader("Authorization");

                // Ellenőrizzük, hogy van-e Authorization header
                if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
                    log.error("Missing or invalid Authorization header");
                    throw new AuthenticationServiceException("Missing or invalid Authorization header");
                }

                String token = authorizationHeader.substring(7);

                try {
                    // Token validálása
                    Long userId = jwtService.getUserIdFromToken(token);

                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new AuthenticationServiceException("User not found with ID: " + userId));

                    // JWT token validálása
                    boolean jwtValid = jwtService.isTokenValid(token, user);

                    // DB-ben tárolt token validálása
                    boolean dbTokenValid = tokensRepository.findByToken(token)
                            .map(t -> !t.isExpired() && !t.isRevoked())
                            .orElse(false);

                    log.debug("Token validity check - JWT valid: {}, DB valid: {}", jwtValid, dbTokenValid);

                    // Ha bármelyik validáció sikertelen, dobjunk hibát
                    if (!jwtValid || !dbTokenValid) {
                        log.error("Invalid JWT token for user: {} token: {}", user.getName(), token);
                        throw new AuthenticationServiceException("Invalid JWT token for user: " + user.getName());
                    }

                    log.debug("WebSocket message authenticated successfully for user: {}", user.getName());

                } catch (AuthenticationServiceException e) {
                    log.error("WebSocket JWT validation failed: {}", e.getMessage());
                    throw e;
                } catch (Exception e) {
                    log.error("WebSocket JWT validation failed with unexpected error", e);
                    throw new AuthenticationServiceException("Invalid JWT token", e);
                }
            }
        }

        return message;
    }
}