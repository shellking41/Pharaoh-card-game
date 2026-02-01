package org.game.pharaohcardgame.Model.DTO.Request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.game.pharaohcardgame.Enum.Reaction;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ReactToUserRequest {
    Long userId;
    Reaction reaction;
}
