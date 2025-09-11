package org.game.pharaohcardgame.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table
@Builder
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long messageId;

    private String message;

    @ManyToOne
    @JoinColumn(name="user_id")
    private User sender;

    @ManyToOne
    @JoinColumn(name="room_id")
    private Room room;

}
