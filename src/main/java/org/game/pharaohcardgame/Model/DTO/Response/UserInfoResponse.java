package org.game.pharaohcardgame.Model.DTO.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.game.pharaohcardgame.Enum.Role;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class UserInfoResponse {
	private Long userId;          // ha user
	private String username;      // ha user
	private Role role;
}
