package org.game.pharaohcardgame.Model.DTO.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RoomCreationResponse {
    private String username;
    RoomResponse currentRoom;
    RoomResponse managedRoom;
    SuccessMessageResponse status;
}
