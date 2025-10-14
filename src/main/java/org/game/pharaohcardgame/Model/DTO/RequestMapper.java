package org.game.pharaohcardgame.Model.DTO;

import org.game.pharaohcardgame.Model.DTO.Request.CardRequest;
import org.game.pharaohcardgame.Model.DTO.Response.PlayedCardResponse;
import org.game.pharaohcardgame.Model.RedisModel.Card;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class RequestMapper {

    public CardRequest toCardRequest(Card card){
        return CardRequest.builder()
                .cardId(card.getCardId())
                .suit(card.getSuit())
                .rank(card.getRank())
                .ownerId(card.getOwnerId())
                .position(card.getPosition())
                .build();
    }

    public List<CardRequest> toCardRequestList(List<Card> cards) {

        return cards.stream()
                .map(this::toCardRequest)
                .toList();

    }
}
