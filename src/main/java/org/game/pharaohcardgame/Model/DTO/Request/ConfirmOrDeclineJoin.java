package org.game.pharaohcardgame.Model.DTO.Request;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ConfirmOrDeclineJoin {
	Long connectingUserId;
	Boolean confirm;
	Long roomId;
}
