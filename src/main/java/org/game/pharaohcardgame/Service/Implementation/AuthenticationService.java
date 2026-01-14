package org.game.pharaohcardgame.Service.Implementation;

import org.game.pharaohcardgame.Authentication.JwtService;
import org.game.pharaohcardgame.Authentication.UserAuthenticationProvider;
import org.game.pharaohcardgame.Authentication.UserAuthenticationToken;
import org.game.pharaohcardgame.Authentication.UserPrincipal;
import org.game.pharaohcardgame.Enum.Role;
import org.game.pharaohcardgame.Enum.tokenType;
import org.game.pharaohcardgame.Model.DTO.Request.LoginRequest;
import org.game.pharaohcardgame.Model.DTO.Request.RegisterRequest;
import org.game.pharaohcardgame.Model.DTO.Request.SetRefreshTokenCookieRequest;
import org.game.pharaohcardgame.Model.DTO.Response.LoginResponse;
import org.game.pharaohcardgame.Model.DTO.Response.RefreshResponse;
import org.game.pharaohcardgame.Model.DTO.Response.RegisterResponse;
import org.game.pharaohcardgame.Model.DTO.ResponseMapper;
import org.game.pharaohcardgame.Model.Tokens;
import org.game.pharaohcardgame.Model.User;
import org.game.pharaohcardgame.Repository.TokensRepository;
import org.game.pharaohcardgame.Repository.UserRepository;
import org.game.pharaohcardgame.Service.IAuthenticationService;
import org.game.pharaohcardgame.Service.ICacheService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.CacheManager;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthenticationService implements IAuthenticationService {


    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final TokensRepository tokensRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserAuthenticationProvider authenticationProvider;
    private final ResponseMapper responseMapper;
    private final CacheManager cacheManager;
    private final ICacheService cacheService;

    @Override
    @Transactional

    public RefreshResponse refreshToken(HttpServletRequest request, HttpServletResponse response) {
        try {
            String refreshToken = jwtService.extractTokenFromCookies(request, "refresh-token");

            if (refreshToken == null) {
                return responseMapper.toRefreshResponse(null);
            }
            if (!jwtService.isTokenValid(refreshToken, null)) {
                return responseMapper.toRefreshResponse(null);
            }
            var isTokenValid = tokensRepository.findByToken(refreshToken)
                    .map(t -> !t.isExpired() && !t.isRevoked())
                    .orElse(false);
            if (!isTokenValid) {
                return responseMapper.toRefreshResponse(null);
            }

            final Long userIdFromToken = jwtService.getUserIdFromToken(refreshToken);
            if (userIdFromToken == null) {
                throw new IllegalArgumentException("Subject Not Found in refreshToken");
            }

            User user = userRepository.findById(userIdFromToken)
                    .orElseThrow(() -> new AuthenticationServiceException("user not found"));
            if (!jwtService.isTokenValid(refreshToken, user)) {
                throw new IllegalArgumentException("Token is not valid");
            }

            var accessToken = jwtService.generateToken(user.getId(), user.getName());
            //todo:Ezzel kell kezdeni valamit mert ezt ki kell kommentelni ha azt akarom hogy a masiktaba a usernek ne megyen elvéve a tokenja
            revokeAllUserTokensExcept(user, refreshToken);

            Tokens tokens = Tokens.builder()
                    .user(user)
                    .token(accessToken)
                    .type(tokenType.ACCESS)
                    .expired(false)
                    .revoked(false)
                    .build();

            tokensRepository.save(tokens);

            return responseMapper.toRefreshResponse(accessToken);
        } catch (Exception e) {
            return responseMapper.toRefreshResponse(null);
        }
    }

    @Override
    public ResponseEntity<String> setRefreshTokenCookie(HttpServletResponse response, SetRefreshTokenCookieRequest setRefreshTokenCookieRequest) {
        String refreshToken = setRefreshTokenCookieRequest.getRefreshToken();


        if (refreshToken == null) {
            return ResponseEntity.badRequest().body("Missing refresh token");
        }

        User user = userRepository.findById(jwtService.getUserIdFromToken(refreshToken)).orElseThrow(() -> new AuthenticationServiceException("user not found"));

        var isTokenValid = tokensRepository.findByToken(refreshToken)
                .map(t -> !t.isExpired() && !t.isRevoked())
                .orElse(false);
        if (!(jwtService.isTokenValid(refreshToken, user) && isTokenValid)) {
            throw new IllegalArgumentException("Token is not valid");
        }

        jwtService.addTokenRefreshCookie(response, "refresh-token", refreshToken);
        return ResponseEntity.ok("Refresh token cookie set successfully");
    }

    @Override
    public ResponseEntity<RegisterResponse> register(RegisterRequest request) {
        try {
            if (userRepository.findByName(request.getUsername()).isPresent()) {
                return ResponseEntity.badRequest()
                        .body(responseMapper.toRegisterResponse(null, false, "User with this name already exists"));
            }

            User user = User.builder()
                    .name(request.getUsername())
                    .userPassword(passwordEncoder.encode(request.getPassword()))
                    .role(Role.USER)
                    .build();

            User savedUser = userRepository.save(user);

            return ResponseEntity.ok(responseMapper.toRegisterResponse(savedUser, true, "User registered successfully"));

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(responseMapper.toRegisterResponse(null, false, "Registration failed: " + e.getMessage()));
        }
    }

    //todo: olyat kéne csinalni hogy leellenorizni hogy az adott user kapcsolodott e a websockethez, ha igen akkor a login failed
    @Override
    public ResponseEntity<LoginResponse> login(LoginRequest request, HttpServletResponse response) {
        try {
            User user = userRepository.findByName(request.getUsername())
                    .orElseThrow(() -> new EntityNotFoundException("User not Found"));

            UserPrincipal principal = new UserPrincipal(user.getName(), user.getId());
            UserAuthenticationToken authToken = UserAuthenticationToken.unauthenticated(
                    principal, request.getPassword()
            );

            Authentication authentication = authenticationProvider.authenticate(authToken);

            if (authentication.isAuthenticated()) {
                String accessToken = jwtService.generateToken(user.getId(), user.getName());
                String refreshToken = jwtService.generateRefreshToken(user.getId());

                // Ez biztosítja, hogy csak egy aktív refresh token legyen
                revokeAllUserTokensExcept(user, null);

                List<Tokens> tokens = List.of(
                        Tokens.builder().user(user).token(accessToken).expired(false).revoked(false).type(tokenType.ACCESS).build(),
                        Tokens.builder().user(user).token(refreshToken).expired(false).revoked(false).type(tokenType.REFRESH).build()
                );
                tokensRepository.saveAll(tokens);

                // ookie beállítás - ez minden tabban látható lesz
                jwtService.addTokenRefreshCookie(response, "refresh-token", refreshToken);

                LoginResponse loginResponse = responseMapper.toLoginResponse(user, accessToken, true, "Login successful");

                return ResponseEntity.ok(loginResponse);
            }

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(responseMapper.toLoginResponse(null, null, false, "Login failed: " + e.getMessage()));
        }

        return ResponseEntity.badRequest()
                .body(responseMapper.toLoginResponse(null, null, false, "Invalid credentials"));
    }


    public ResponseEntity<String> logout(HttpServletRequest request, HttpServletResponse response) {
        try {
            final String authHeader = request.getHeader("Authorization");
            final String jwt;

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.badRequest().body("No token provided");
            }

            jwt = authHeader.substring(7);

            // Token érvénytelenítése az adatbázisban
            Optional<Tokens> storedToken = tokensRepository.findByToken(jwt);
            if (storedToken.isPresent()) {
                Tokens token = storedToken.get();
                token.setExpired(true);
                token.setRevoked(true);
                tokensRepository.save(token);
            }

            // SecurityContext törlése
            SecurityContextHolder.clearContext();

            // Refresh token cookie törlése
            jwtService.addTokenRefreshCookie(response, "refresh-token", "");

            return ResponseEntity.ok("Logout successful");

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Logout failed: " + e.getMessage());
        }
    }

    private void revokeAllUserTokensExcept(User user, String excludeToken) {
        List<Tokens> validUserTokens = tokensRepository.findValidTokensByUserId(user.getId());
        validUserTokens.stream()
                .filter(token -> !token.getToken().equals(excludeToken))
                .forEach(token -> {
                    token.setRevoked(true);
                    token.setExpired(true);
                });
        tokensRepository.saveAll(validUserTokens);
    }

    @Override
    public User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || authentication instanceof AnonymousAuthenticationToken || !authentication.isAuthenticated()) {
            throw new EntityNotFoundException("User not found");
        }

        Long id = ((UserPrincipal) authentication.getPrincipal()).getUserId();
        return userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));


    }


}
