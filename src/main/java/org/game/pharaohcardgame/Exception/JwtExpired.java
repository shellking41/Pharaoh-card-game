package org.game.pharaohcardgame.Exception;

public class JwtExpired extends RuntimeException {
    public JwtExpired(String message) {
        super(message);
    }
}
