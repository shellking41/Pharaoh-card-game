package org.game.pharaohcardgame.Service.Implementation;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.game.pharaohcardgame.Exception.BotNotFoundException;
import org.game.pharaohcardgame.Exception.RoomNotFoundException;
import org.game.pharaohcardgame.Model.Bot;
import org.game.pharaohcardgame.Model.DTO.Request.AddBotToRoomRequest;
import org.game.pharaohcardgame.Model.DTO.Request.BotEditRequest;
import org.game.pharaohcardgame.Model.DTO.Request.BotRemoveFromRoomRequest;
import org.game.pharaohcardgame.Model.DTO.Response.SuccessMessageResponse;
import org.game.pharaohcardgame.Model.DTO.ResponseMapper;
import org.game.pharaohcardgame.Model.Room;
import org.game.pharaohcardgame.Model.User;
import org.game.pharaohcardgame.Repository.BotRepository;
import org.game.pharaohcardgame.Repository.RoomRepository;
import org.game.pharaohcardgame.Service.IAuthenticationService;
import org.game.pharaohcardgame.Service.IBotService;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor

public class BotService implements IBotService {

	private final IAuthenticationService authenticationService;
	private final RoomRepository roomRepository;
	private final ResponseMapper responseMapper;
	private final BotRepository botRepository;
	private final RoomService roomService;
	private final SimpMessagingTemplate simpMessagingTemplate;

	@Override
	@Transactional

	public SuccessMessageResponse addBot(AddBotToRoomRequest addBotToRoomRequest) {
		User gamemaster=authenticationService.getAuthenticatedUser();

		try {
			Room room= roomRepository.findById(addBotToRoomRequest.getRoomId())
					.orElseThrow(()->new RoomNotFoundException("Room Not Found"));

			roomService.checkPermission(room,gamemaster);

			if (roomService.isRoomFull(room)) {
				throw new AccessDeniedException("Room is Full");
			}
			Bot newBot=Bot.builder()
					.name(addBotToRoomRequest.getName())
					.room(room)
					.difficulty(addBotToRoomRequest.getDifficulty())
					.build();
			room.getBots().add(newBot);

			roomRepository.save(room);
			//todo: it nem a siman a botot akarom elkuldeni hanem a frissult szobát azaz roomresponse-t
			//todo: faradt szabinak az jutott az eszébe hogy lehet baj az ha frontenden mindi egybe frissitema a currentroomot, mert mondjuk ha adunk egy botot a szobahoz majd csatlakozna a hozzáadás pillanatában egy user a szobához akkor ha a addbot gyorsabban lefutott volna mint a join room akkor a frontenden a két room status felulirna egymast igy hat csak azt kéne frissiteni amit muszály.



			simpMessagingTemplate.convertAndSend("/topic/room/"+room.getRoomId()+"/participant-update", responseMapper.toRoomResponse(room));
			return responseMapper.createSuccessResponse(true, addBotToRoomRequest.getName()+" has been successfully added");


		}catch (AccessDeniedException e){
			return responseMapper.createSuccessResponse(false, e.getMessage());
		}
	}

	@Override
	//todo: vlamiérrt ha player kilép majd atalakul botá majd a jatékvégetér akkor a szobából nem tudom kitenni azt a abotot
	public SuccessMessageResponse removeBot(BotRemoveFromRoomRequest botRemoveFromRoomRequest) {
		User gamemaster=authenticationService.getAuthenticatedUser();

		try {
			Room room = roomRepository.findById(botRemoveFromRoomRequest.getRoomId()).orElseThrow(() -> new RoomNotFoundException("Room Not Found"));


			roomService.checkPermission(room,gamemaster);


			Bot bot=botRepository.findById(botRemoveFromRoomRequest.getBotId())
					.orElseThrow(()->new BotNotFoundException("Bot not found"));
			String botName=bot.getName();

			botRepository.delete(bot);

			simpMessagingTemplate.convertAndSend("/topic/room/"+room.getRoomId()+"/participant-update", responseMapper.toRoomResponse(room));
			return responseMapper.createSuccessResponse(true, botName+" has been successfully deleted");
		}catch (AccessDeniedException e){
			return responseMapper.createSuccessResponse(false, e.getMessage());
		}
	}

	@Override
	public SuccessMessageResponse editBot(BotEditRequest botEditRequest) {
		User gamemaster=authenticationService.getAuthenticatedUser();

		try {
			Room room = roomRepository.findById(botEditRequest.getRoomId()).orElseThrow(() -> new RoomNotFoundException("Room Not Found"));

			roomService.checkPermission(room,gamemaster);



			Bot bot=botRepository.findById(botEditRequest.getBotId())
					.orElseThrow(()->new BotNotFoundException("Bot not found"));
			bot.setName(botEditRequest.getName());
			bot.setDifficulty(botEditRequest.getDifficulty());
			botRepository.save(bot);

			simpMessagingTemplate.convertAndSend("/topic/room/"+room.getRoomId()+"/participant-update", responseMapper.toRoomResponse(room));
			return responseMapper.createSuccessResponse(true, bot.getName()+" has been successfully edited");

		}catch (AccessDeniedException e){
			return responseMapper.createSuccessResponse(false, e.getMessage());
		}
	}

}
