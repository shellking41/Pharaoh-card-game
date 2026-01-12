package org.game.pharaohcardgame.Service;

import org.game.pharaohcardgame.Model.DTO.Request.LoginRequest;
import org.game.pharaohcardgame.Model.DTO.Request.RegisterRequest;
import org.game.pharaohcardgame.Model.DTO.Request.SetRefreshTokenCookieRequest;
import org.game.pharaohcardgame.Model.DTO.Response.LoginResponse;
import org.game.pharaohcardgame.Model.DTO.Response.RefreshResponse;
import org.game.pharaohcardgame.Model.DTO.Response.RegisterResponse;
import org.game.pharaohcardgame.Model.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;

public interface IAuthenticationService {

    RefreshResponse refreshToken(
            HttpServletRequest request,
            HttpServletResponse response
    );

    ResponseEntity<String> setRefreshTokenCookie(HttpServletResponse response, SetRefreshTokenCookieRequest setRefreshTokenCookieRequest);

    ResponseEntity<RegisterResponse> register(RegisterRequest request);

    ResponseEntity<LoginResponse> login(LoginRequest request, HttpServletResponse response);

    ResponseEntity<String> logout(HttpServletRequest request, HttpServletResponse response);

    User getAuthenticatedUser();
}
