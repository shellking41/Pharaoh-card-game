package org.game.pharaohcardgame.Controller;


import lombok.RequiredArgsConstructor;
import org.game.pharaohcardgame.Model.DTO.Request.AddBotToRoomRequest;
import org.game.pharaohcardgame.Model.DTO.Request.BotEditRequest;
import org.game.pharaohcardgame.Model.DTO.Request.BotRemoveFromRoomRequest;
import org.game.pharaohcardgame.Model.DTO.Response.RoomResponse;
import org.game.pharaohcardgame.Model.DTO.Response.SuccessMessageResponse;
import org.game.pharaohcardgame.Service.IBotService;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.CompletableFuture;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bot")
public class BotController {

	private final IBotService botService;

	@PostMapping("/add")
	public SuccessMessageResponse addBot(@RequestBody AddBotToRoomRequest addBotToRoomRequest){
		return botService.addBot(addBotToRoomRequest);
	}


	@PostMapping("/remove")
	public SuccessMessageResponse removeBot(@RequestBody BotRemoveFromRoomRequest botRemoveFromRoomRequest){
		return botService.removeBot(botRemoveFromRoomRequest);
	}
	@PostMapping("/edit")
	public SuccessMessageResponse editBot(@RequestBody BotEditRequest botEditRequest){
		return botService.editBot(botEditRequest);
	}
}
