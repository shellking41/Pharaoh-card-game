package org.game.pharaohcardgame.Service;

import org.game.pharaohcardgame.Model.DTO.Request.*;
import org.game.pharaohcardgame.Model.DTO.Response.CurrentAndManagedRoomResponse;
import org.game.pharaohcardgame.Model.DTO.Response.MinimalRoomResponse;
import org.game.pharaohcardgame.Model.DTO.Response.UserCurrentStatus;
import org.game.pharaohcardgame.Model.User;
import org.springframework.data.domain.Page;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

public interface IRoomService {


    Map<String, Object> confirmOrDeclineJoin(ConfirmOrDeclineJoin confirmOrDeclineJoin,StompHeaderAccessor accessor);


	CompletableFuture<Page<MinimalRoomResponse>> getAllRoom(int pageNum,
	                                                        int pageSize);

	void joinRoomRequest(JoinRoomRequest joinRoomRequest, StompHeaderAccessor accessor);

	MinimalRoomResponse createRoom(RoomCreationRequest createRoomRequest, StompHeaderAccessor accessor);

	UserCurrentStatus leaveRoom(LeaveRequest leaveRequest, User user);

	CompletableFuture<CurrentAndManagedRoomResponse> currentRoomAndManagedRoomStatus(CurrentAndManagedRoomRequest currentAndManagedRoomRequest);

}
