package org.game.pharaohcardgame.Model.DTO.Request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class JoinRoomRequest {
    private Long roomId;
    private String roomPassword;
    private String username;
    private String message;
    private Long userId;

}
