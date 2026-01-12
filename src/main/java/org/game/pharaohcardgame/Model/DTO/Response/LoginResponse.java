package org.game.pharaohcardgame.Model.DTO.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LoginResponse {
    SuccessMessageResponse status;
    boolean success;
    String message;
    UserCurrentStatus userCurrentStatus;
    private String accessToken;


}
