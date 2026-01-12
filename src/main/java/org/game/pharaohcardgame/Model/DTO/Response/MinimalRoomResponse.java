package org.game.pharaohcardgame.Model.DTO.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.game.pharaohcardgame.Enum.GameStatus;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MinimalRoomResponse {
    private String roomName;
    private Long roomId;
    private Long playerCount;
    private GameStatus gameStatus; // null ha nincs játék, egyébként WAITING/IN_PROGRESS/FINISHED
    private Boolean hasActiveGame; // true ha van futó vagy várakozó játék
}