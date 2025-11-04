package org.game.pharaohcardgame.Controller;

import org.game.pharaohcardgame.Authentication.JwtService;
import org.game.pharaohcardgame.Authentication.UserPrincipal;
import org.game.pharaohcardgame.Model.DTO.Request.SendMessageRequest;
import org.game.pharaohcardgame.Service.IWebsocketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.game.pharaohcardgame.Service.Implementation.RoomService;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
@Slf4j
public class WebsocketController {

    private final IWebsocketService websocketService;
    private final SimpMessagingTemplate messagingTemplate;
    private final JwtService jwtService;
    private final RoomService roomService;
    private final SimpUserRegistry simpUserRegistry;


    @MessageMapping("/test")
    public void Greeting(StompHeaderAccessor accessor) {
        simpUserRegistry.getUsers().forEach(user -> {
            log.info("Username: " + user.getName());
            log.info("Sessions: " + user.getSessions().size());
        });
        Object principalObj= accessor.getUser();
        if (!(principalObj instanceof UserPrincipal principal)) {
            throw new IllegalStateException("Unexpected principal object: " + principalObj);
        }

        String userId = principal.getUserId().toString();
        log.info("Sending message to user: {}", userId);

        messagingTemplate.convertAndSendToUser(
                "1",
                "/queue/test",
                "test"
        );
    }




    @MessageMapping("room/send")
    public void SendMessage(SendMessageRequest sendMessageRequest){
        messagingTemplate.convertAndSend("/topic/room/"+sendMessageRequest.getRoomId(),websocketService.sendMessage(sendMessageRequest));
    }


    @MessageExceptionHandler
    @SendToUser("/queue/errors")
    public String handleException(Exception ex) {
        log.error(ex.getMessage());
        return ex.getMessage();
    }
}
