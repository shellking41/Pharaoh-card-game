package org.game.pharaohcardgame.WebsocketConfig;

import org.game.pharaohcardgame.Authentication.UserAuthenticationToken;
import org.game.pharaohcardgame.Authentication.UserPrincipal;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.Map;

@Component
public class JwtHandshakeHandler extends DefaultHandshakeHandler {

	@Override
	protected Principal determineUser(ServerHttpRequest request,
	                                  WebSocketHandler wsHandler,
	                                  Map<String, Object> attributes) {
		// Az interceptor már betette ide:
		UserAuthenticationToken authToken =(UserAuthenticationToken) attributes.get("principal");
		UserPrincipal principal= authToken.getPrincipal();
		if (principal != null) {
			return  principal;
		}
		return super.determineUser(request, wsHandler, attributes);
	}
}