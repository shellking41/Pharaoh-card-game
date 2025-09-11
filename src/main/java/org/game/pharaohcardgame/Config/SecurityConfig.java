package org.game.pharaohcardgame.Config;

import org.game.pharaohcardgame.Authentication.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.context.DelegatingSecurityContextRepository;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;

import static org.springframework.security.config.http.SessionCreationPolicy.STATELESS;

@Configuration
@RequiredArgsConstructor

public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .securityContext((securityContext) -> securityContext
                        .securityContextRepository(new DelegatingSecurityContextRepository(
                                new RequestAttributeSecurityContextRepository()

                        ))
                )
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Nyilvános endpointok
                        .requestMatchers("/auth/generate/temp-user-token", "/room/join-room-request","/auth/register", "/auth/login","/user/current-status","/auth/**")
                        .permitAll()
                        // A teljes SockJS/WebSocket transport útvonal
                        .requestMatchers("/gs-guide-websocket/**")
                        .permitAll()
                        // GAMEMASTER jogosultságok
                        .requestMatchers("/room/*/start-game", "/room/*/end-game", "/room/*/kick-user", "/room/*/settings")
                        .hasRole("GAMEMASTER")
                        // Minden más  hívás igényel authentication-t
                        .requestMatchers("/room/**","/user/**")
                        .authenticated()
                        // …
                        .anyRequest().permitAll()
                )
                .sessionManagement(session -> session.sessionCreationPolicy(STATELESS))
                // JWT filter hozzáadása
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }


}