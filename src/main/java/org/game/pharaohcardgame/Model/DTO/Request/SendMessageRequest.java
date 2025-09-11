package org.game.pharaohcardgame.Model.DTO.Request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class SendMessageRequest {
    private Long roomId;
    private String message;
    private Long userId;
}
