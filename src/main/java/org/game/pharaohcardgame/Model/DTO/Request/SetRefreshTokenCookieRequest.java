package org.game.pharaohcardgame.Model.DTO.Request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class SetRefreshTokenCookieRequest {
	@NotBlank
	String refreshToken;
}
