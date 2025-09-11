package org.game.pharaohcardgame.Service;


import org.game.pharaohcardgame.Model.DTO.Request.SendMessageRequest;

public interface IWebsocketService {
    String Greeting(String hello);




    Object sendMessage(SendMessageRequest sendMessageRequest);
}
