package org.game.pharaohcardgame.Controller;

import org.game.pharaohcardgame.Model.DTO.Request.*;
import org.game.pharaohcardgame.Model.DTO.Response.CurrentAndManagedRoomResponse;
import org.game.pharaohcardgame.Model.DTO.Response.MinimalRoomResponse;
import org.game.pharaohcardgame.Model.DTO.Response.RoomResponse;
import org.game.pharaohcardgame.Model.DTO.Response.UserCurrentStatus;
import org.game.pharaohcardgame.Service.IRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequiredArgsConstructor
@Controller
@RequestMapping("/room")
public class RoomController {

    private final IRoomService roomService;
    private final SimpMessagingTemplate simpMessagingTemplate;

    @GetMapping("/all")
    public CompletableFuture<Page<MinimalRoomResponse>> getAllRoom(@RequestParam(defaultValue = "0") Integer pageNum,
                                                                   @RequestParam(defaultValue = "10") Integer pageSize){
        return roomService.getAllRoom(pageNum, pageSize);
    }

    @MessageMapping("/join-room-request")
    public void joinRoomRequest(JoinRoomRequest joinRequest, StompHeaderAccessor accessor) {
        // Végrehajtjuk a join műveletet
        roomService.joinRoomRequest( joinRequest,accessor);
    }
    @MessageMapping("/response-to-join-request")
    public Map<String, Object> confirmOrDeclineJoin(ConfirmOrDeclineJoin confirmOrDeclineJoin,StompHeaderAccessor accessor){
        return roomService.confirmOrDeclineJoin(confirmOrDeclineJoin,accessor);
    }
    @PostMapping("/leave")
    public UserCurrentStatus leaveRoom(@RequestBody LeaveRequest leaveRequest){
        return roomService.leaveRoom(leaveRequest);
    }

    @MessageMapping("/create")
    public void createRoom(RoomCreationRequest createRoomRequest, StompHeaderAccessor accessor) {
        MinimalRoomResponse minimalRoomResponse = roomService.createRoom(createRoomRequest, accessor);

        // Csak akkor küldjük el a /topic/rooms-ra, ha sikeres volt a létrehozás
        if (minimalRoomResponse != null) {
            simpMessagingTemplate.convertAndSend("/topic/rooms", minimalRoomResponse);
        }
    }

    @PostMapping("/current-and-managed-room")
    public CompletableFuture<CurrentAndManagedRoomResponse> currentRoomAndManagedRoomStatus(@RequestBody CurrentAndManagedRoomRequest currentAndManagedRoomRequest){
        return  roomService.currentRoomAndManagedRoomStatus(currentAndManagedRoomRequest);
    }
    @MessageExceptionHandler
    @SendToUser("/queue/errors")
    public String handleException(Exception ex) {
        return ex.getMessage();
    }
}
