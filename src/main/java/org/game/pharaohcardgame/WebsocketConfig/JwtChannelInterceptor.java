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
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final   TokensRepository tokensRepository;
    private final UserRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private final RoomRepository roomRepository;


    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null) {
            StompCommand command = accessor.getCommand();

            // Csak SEND és SUBSCRIBE-nél kell újra auth-ot ellenőrizni
            if (StompCommand.SEND.equals(command) || StompCommand.SUBSCRIBE.equals(command)) {
                String authorizationHeader = accessor.getFirstNativeHeader("Authorization");

                if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
                    String token = authorizationHeader.substring(7);

                    try {
                        // Decode and validate the token
                        if (jwtService.isTokenValid(token, null)) {
                            Long userId = jwtService.getUserIdFromToken(token);

                            User user = userRepository.findById(userId).orElseThrow(() -> new AuthenticationServiceException("User not found with ID: " + userId));

                            var isTokenValid = tokensRepository.findByToken(token).map(t -> !t.isExpired() && !t.isRevoked()).orElse(false);

                            log.debug("Token validity check - JWT valid: {}, DB valid: {}", jwtService.isTokenValid(token, user), isTokenValid);

                            if (!(jwtService.isTokenValid(token, user) && isTokenValid)) {
                                log.error("Invalid JWT token for user: {} token: {}", user.getName(),token);
                                throw new RuntimeException("Invalid JWT token for user");
                            }


                        }
                    } catch (RuntimeException e) {
                        log.error("WebSocket JWT validation failed", e);
                        throw new RuntimeException("Invalid JWT token");
                    }
                } else {
                    throw new RuntimeException("Missing or invalid Authorization header");
                }
            }
        }
        return message;
    }
}
