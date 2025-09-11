package org.game.pharaohcardgame.Service;

import org.game.pharaohcardgame.Model.DTO.Request.UserInfoRequest;
import org.game.pharaohcardgame.Model.DTO.Response.UserCurrentStatus;

import java.util.concurrent.CompletableFuture;

public interface IUserService {
		CompletableFuture<UserCurrentStatus> userStatus(UserInfoRequest token);
}
