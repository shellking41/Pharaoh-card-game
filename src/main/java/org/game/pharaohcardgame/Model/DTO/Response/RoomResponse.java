package org.game.pharaohcardgame.Model.DTO.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class RoomResponse {
	private String roomName;
	private Long roomId;

	@Builder.Default
	private List<BotInfoResponse> bots=new ArrayList<>();
	@Builder.Default
	private List<UserInfoResponse> participants=new ArrayList<>();
}
