package org.game.pharaohcardgame.Model.DTO.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class UserCurrentStatus {
	UserInfoResponse userInfo;
	Long currentRoomId;
	Long managedRoomId;
	Boolean authenticated;
}
