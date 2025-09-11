	package org.game.pharaohcardgame.Authentication;

	import org.game.pharaohcardgame.Model.User;
	import org.game.pharaohcardgame.Repository.UserRepository;
	import lombok.RequiredArgsConstructor;
	import lombok.extern.slf4j.Slf4j;
	import org.springframework.security.authentication.AuthenticationProvider;
	import org.springframework.security.authentication.BadCredentialsException;
	import org.springframework.security.core.Authentication;
	import org.springframework.security.core.AuthenticationException;
	import org.springframework.security.core.GrantedAuthority;
	import org.springframework.security.crypto.password.PasswordEncoder;
	import org.springframework.stereotype.Component;

	import java.util.List;

	@Component
	@RequiredArgsConstructor
	@Slf4j
	public class UserAuthenticationProvider implements AuthenticationProvider {


		private final UserRepository userRepo;
		private final PasswordEncoder passwordEncoder;
		//ez authentikalja  atokent és ezt a authmenagger fogja meghivni
		@Override
		public Authentication authenticate( Authentication auth) throws AuthenticationException {
			//Cast és mezők kinyerése
			UserAuthenticationToken token = (UserAuthenticationToken) auth;
			UserPrincipal principal = token.getPrincipal();
			String rawPassword = (String) token.getCredentials();
			Long userId = principal.getUserId();



			User user = userRepo.findById(userId)
					.orElseThrow(() -> new BadCredentialsException("User not found"));

			if (!passwordEncoder.matches(rawPassword, user.getUserPassword())) {
				throw new BadCredentialsException("Wrong user password");
			}


			List<GrantedAuthority> authorities = user.getAuthorities().stream()
					.map(authority -> (GrantedAuthority) authority)
					.toList();



			return UserAuthenticationToken.authenticated(principal, authorities);
		}

		@Override
		public boolean supports(Class<?> authentication) {
			return UserAuthenticationToken.class.isAssignableFrom(authentication);
		}
	}
