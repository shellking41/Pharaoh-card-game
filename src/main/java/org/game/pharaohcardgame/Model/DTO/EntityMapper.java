package org.game.pharaohcardgame.Model.DTO;

import org.game.pharaohcardgame.Model.DTO.Request.CardRequest;
import org.game.pharaohcardgame.Model.DTO.Response.UserInfoResponse;
import org.game.pharaohcardgame.Model.RedisModel.Card;
import org.game.pharaohcardgame.Model.User;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class EntityMapper {

	public Card toCardFromCardRequest(CardRequest cardRequest) {
		return Card.builder()
				.suit(cardRequest.getSuit())
				.rank(cardRequest.getRank())
				.cardId(cardRequest.getCardId())
				.position(cardRequest.getPosition())
				.ownerId(cardRequest.getOwnerId())
				.build();
	}

	public List<Card> toCardFromCardRequestList(List<CardRequest> cardRequests) {
		return cardRequests.stream()
				.map(this::toCardFromCardRequest)
				.toList();
	}
}
