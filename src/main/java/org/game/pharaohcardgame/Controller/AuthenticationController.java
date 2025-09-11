package org.game.pharaohcardgame.Controller;

import org.game.pharaohcardgame.Authentication.JwtService;
import org.game.pharaohcardgame.Model.DTO.Request.LoginRequest;
import org.game.pharaohcardgame.Model.DTO.Request.RegisterRequest;
import org.game.pharaohcardgame.Model.DTO.Request.SetRefreshTokenCookieRequest;
import org.game.pharaohcardgame.Model.DTO.Response.LoginResponse;
import org.game.pharaohcardgame.Model.DTO.Response.RefreshResponse;
import org.game.pharaohcardgame.Model.DTO.Response.RegisterResponse;
import org.game.pharaohcardgame.Service.IAuthenticationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RequiredArgsConstructor
@RestController
@RequestMapping("/auth")
public class AuthenticationController {

    private final IAuthenticationService authenticationService;
    private final JwtService jwtService;


    @PostMapping("/refreshToken")
    public ResponseEntity<RefreshResponse> refreshToken(HttpServletRequest request, HttpServletResponse response)   {
     return authenticationService.refreshToken(request,response);
    }


    @PostMapping("/set-refresh-cookie")
    public ResponseEntity<String> setRefreshTokenCookie(HttpServletResponse response, @RequestBody SetRefreshTokenCookieRequest request){
        return authenticationService.setRefreshTokenCookie(response,request);
    }


    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@RequestBody RegisterRequest request) {

        return authenticationService.register(request);
    }
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request,
                                               HttpServletResponse response) {
        return authenticationService.login(request,response);
    }
    @PostMapping("/logout")
    public ResponseEntity<String> logout(HttpServletRequest request, HttpServletResponse response) {
        return authenticationService.logout(request,response);
    }

}
