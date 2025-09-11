package org.game.pharaohcardgame.Service;

import org.game.pharaohcardgame.Model.DTO.Request.AddBotToRoomRequest;
import org.game.pharaohcardgame.Model.DTO.Request.BotEditRequest;
import org.game.pharaohcardgame.Model.DTO.Request.BotRemoveFromRoomRequest;
import org.game.pharaohcardgame.Model.DTO.Response.SuccessMessageResponse;

public interface IBotService {
	SuccessMessageResponse addBot(AddBotToRoomRequest addBotToRoomRequest);
	SuccessMessageResponse removeBot(BotRemoveFromRoomRequest botRemoveFromRoomRequest);
	SuccessMessageResponse editBot(BotEditRequest botEditRequest);
}
