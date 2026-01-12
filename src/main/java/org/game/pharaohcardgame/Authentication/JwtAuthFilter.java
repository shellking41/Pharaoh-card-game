package org.game.pharaohcardgame.Authentication;

import io.jsonwebtoken.ExpiredJwtException;
import org.game.pharaohcardgame.Exception.JwtExpired;
import org.game.pharaohcardgame.Model.User;
import org.game.pharaohcardgame.Repository.TokensRepository;
import org.game.pharaohcardgame.Repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final TokensRepository tokensRepository;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {


        AntPathMatcher pathMatcher = new AntPathMatcher();

        List<String> allowedPaths = List.of(
                "/auth/**",
                "/room/join-room-request",
                "/gs-guide-websocket/**",
                "/auth/register",
                "/auth/login",
                "/user/current-status"
        );

        if (allowedPaths.stream().anyMatch(pattern -> pathMatcher.match(pattern, request.getServletPath()))) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getServletPath();
        final String authHeader = request.getHeader("Authorization");
        final String jwt;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);
        try {
            Long userId = jwtService.getUserIdFromToken(jwt);

            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new AuthenticationServiceException("User not found"));

            boolean tokenValidInDb = tokensRepository.findByToken(jwt)
                    .map(t -> !t.isExpired() && !t.isRevoked())
                    .orElse(false);

            if (!jwtService.isTokenValid(jwt, user) || !tokenValidInDb) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }

            UserPrincipal principal = new UserPrincipal(
                    user.getUsername(),
                    user.getId()
            );

            UserAuthenticationToken authToken =
                    UserAuthenticationToken.authenticated(
                            principal,
                            user.getAuthorities()
                    );

            authToken.setDetails(
                    new WebAuthenticationDetailsSource().buildDetails(request)
            );

            SecurityContextHolder.getContext().setAuthentication(authToken);

            filterChain.doFilter(request, response);

        } catch (ExpiredJwtException e) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return request.getServletPath().startsWith("/gs-guide-websocket");
    }
}

