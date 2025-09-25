package org.game.pharaohcardgame.Model.DTO.Request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RoomCreationRequest {

    private String username;
    @NotBlank
    private String roomName;
    private String roomPassword;
}
