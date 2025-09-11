package org.game.pharaohcardgame.Controller;

import org.game.pharaohcardgame.Model.DTO.Request.UserInfoRequest;
import org.game.pharaohcardgame.Model.DTO.Response.UserCurrentStatus;
import org.game.pharaohcardgame.Service.IUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.CompletableFuture;

@RestController
@RequiredArgsConstructor
@RequestMapping("/user")
public class UserController {

	private final IUserService userService;

	@PostMapping("/current-status")
	public CompletableFuture<UserCurrentStatus> userStatus(@RequestBody UserInfoRequest token) {
		return userService.userStatus(token);
	}
}
