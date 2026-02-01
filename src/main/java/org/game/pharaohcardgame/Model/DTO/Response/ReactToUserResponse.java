package org.game.pharaohcardgame.Model.DTO.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.game.pharaohcardgame.Enum.Reaction;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReactToUserResponse {
    Long userId;
    long dislikeCount;
    long likeCount;
    private Reaction currentReaction;
    private String action;
}
