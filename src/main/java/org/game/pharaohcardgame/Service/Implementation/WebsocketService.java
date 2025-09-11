package org.game.pharaohcardgame.Service.Implementation;

import org.game.pharaohcardgame.Authentication.JwtService;
import org.game.pharaohcardgame.Exception.RoomNotFoundException;
import org.game.pharaohcardgame.Model.DTO.Request.SendMessageRequest;
import org.game.pharaohcardgame.Model.DTO.Response.MessageResponse;
import org.game.pharaohcardgame.Model.Message;
import org.game.pharaohcardgame.Model.Room;
import org.game.pharaohcardgame.Model.User;
import org.game.pharaohcardgame.Repository.MessageRepository;
import org.game.pharaohcardgame.Repository.RoomRepository;
import org.game.pharaohcardgame.Repository.TokensRepository;
import org.game.pharaohcardgame.Repository.UserRepository;
import org.game.pharaohcardgame.Service.IWebsocketService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class
WebsocketService implements IWebsocketService {

    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    private final TokensRepository tokensRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final SimpMessagingTemplate messagingTemplate;
    private final AuthenticationManager authenticationManager;


    @Override

    public String Greeting(String hello) {
        return "Hi "+hello+"!";
    }

    /*egyátalán nem jo ez at kell irni*/
    /*ha beakarunk kapcsolodni ugyan abba a roomba ami mar letre van hozva akkor is csinal egy ujat*/







    //ezt még nem teszteltem le
    @Override
    @Transactional
    public MessageResponse sendMessage(SendMessageRequest sendMessageRequest) {
      Room room=roomRepository.findById(sendMessageRequest.getRoomId())
              .orElseThrow(()-> new RoomNotFoundException("RoomPage is not found"));
      User sender=userRepository.findById(sendMessageRequest.getUserId())
                      .orElseThrow(()->new RuntimeException("User not found"));
      Message newMessage=Message.builder()
              .message(sendMessageRequest.getMessage())
              .room(room)
              .sender(sender)
              .build();

      room.getMessages().add(newMessage);
      messageRepository.save(newMessage);
      roomRepository.save(room);

      return MessageResponse.builder()
              .messageId(newMessage.getMessageId())
              .message(newMessage.getMessage())
              .username(sender.getName())
              .build();
    }

}
