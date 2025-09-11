package org.game.pharaohcardgame.Authentication;

import lombok.Getter;

import java.security.Principal;


@Getter
public class UserPrincipal implements Principal {
	private final String username;
	private final Long userId;


	public UserPrincipal(String username, Long userId) {
		this.username = username;
		this.userId = userId;
	}


	@Override
	public String getName() {
		return userId.toString();
	}
	@Override
	public String toString() {
		return "UserPrincipal{" +
				"userId=" + userId +
				", username='" + username + '\''+
				'}';
	}
}
