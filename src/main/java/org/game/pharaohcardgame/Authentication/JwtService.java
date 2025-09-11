package org.game.pharaohcardgame.Authentication;

import org.game.pharaohcardgame.Model.Tokens;
import org.game.pharaohcardgame.Model.User;
import org.game.pharaohcardgame.Repository.TokensRepository;
import org.game.pharaohcardgame.Repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Arrays;
import java.util.Date;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JwtService {
    private final TokensRepository tokensRepository;

    @Value("${application.security.jwt.secret-key}")
    private String secretKey;

    @Value("${application.security.jwt.expiration}")
    private long jwtExpiration;

    @Value("${application.security.refresh.expiration}")
    private long refreshExpiration;

    private final UserRepository userRepository;

    private Key getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(Long userId,String username){
        Date expiryDate = new Date(System.currentTimeMillis() + jwtExpiration);
        String nonce = UUID.randomUUID().toString();
        return Jwts.builder().
                signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .setExpiration(expiryDate).setIssuedAt(new Date())
                .setSubject(userId.toString())
                .claim("nonce", nonce)
                .claim("username",username)
                .compact();
    }


    public String generateRefreshToken(Long userId){
        Date expiryDate = new Date(System.currentTimeMillis() + refreshExpiration);
        String nonce = UUID.randomUUID().toString();
        return Jwts.builder().
                signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .setExpiration(expiryDate).setIssuedAt(new Date())
                .setSubject(userId.toString())
                .claim("nonce", nonce)
                .compact();
    }

    public Claims getClaimsFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSignInKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public void addTokenRefreshCookie(HttpServletResponse response, String cookieName, String value){
        Cookie cookie=new Cookie(cookieName,value);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge((int) refreshExpiration/1000);
        response.addCookie(cookie);

    }
    public String extractTokenFromCookies(HttpServletRequest request,String cookieName) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }

        return Arrays.stream(cookies)
                .filter(cookie -> cookieName.equals(cookie.getName()))
                .findFirst()
                .map(Cookie::getValue)
                .orElse(null);
    }
    public Long getUserIdFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        return Long.valueOf(claims.getSubject());
    }

    public String getUsernameFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        return claims.get("username", String.class);
    }

    public boolean isTokenValid(String token,User user) {
        try {
            Claims claims = getClaimsFromToken(token);

            // userId kinyerése
            String userId = claims.getSubject();

            if(user!=null){
                if(!(Long.valueOf(userId).equals(user.getId()))){
                    return false;
                }
            }

            if(isTokenExpired(claims)){
                Tokens tokens=tokensRepository.findByToken(token).orElseThrow(()->new EntityNotFoundException("Token not Found"));
                tokens.setExpired(true);
                tokensRepository.save(tokens);
                return false;
            }

            return true;
        } catch (JwtException | IllegalArgumentException | EntityNotFoundException e) {
            return false;
        }
    }

    public boolean isTokenExpired(Claims claims) {
        return claims.getExpiration().before(new Date());
    }

}
