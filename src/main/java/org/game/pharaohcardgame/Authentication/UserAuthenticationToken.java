package org.game.pharaohcardgame.Authentication;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;

import java.util.Collection;


public class UserAuthenticationToken extends AbstractAuthenticationToken {
	private final UserPrincipal principal;
	private Object credentials;

	// autentikáció előtt

	public UserAuthenticationToken(UserPrincipal principal, String password) {
		super(null);
		this.principal = principal;
		this.credentials = password;
		setAuthenticated(false);
	}

	// autentikáció után
	public UserAuthenticationToken(UserPrincipal principal,
	                               Collection<? extends GrantedAuthority> authorities) {
		super(authorities);
		this.principal = principal;
		this.credentials = null;
		setAuthenticated(true);
	}

	//azért kell mert ezzel megszerezzuk a  RoomAuthenticationToken objectet amit majd a providerbe beleteszunk
	public static UserAuthenticationToken unauthenticated(UserPrincipal principal, String password) {
		// Konstruktor: (RoomPrincipal, String)
		return new UserAuthenticationToken(principal, password);
	}

	//ezt a provider fogja meghivni is ott fogja authentikalni
	public static UserAuthenticationToken authenticated(UserPrincipal principal,
	                                                    Collection<? extends GrantedAuthority> authorities) {
		// Konstruktor: (RoomPrincipal, Collection<GrantedAuthority>)
		return new UserAuthenticationToken(principal, authorities);
	}


	// kötelező override-ok
	// kötelező override-ok – covariáns visszatérési típussal!
	@Override
	public Object getCredentials() {
		return credentials;
	}

	@Override
	public UserPrincipal getPrincipal() {
		return principal;
	}

}



