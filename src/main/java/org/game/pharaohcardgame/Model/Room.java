package org.game.pharaohcardgame.Model;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)

public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include

    private Long roomId;

    private String name;

    private String password;

    private boolean isPublic;

    @ManyToOne
    @JoinColumn(name = "gamemaster_id")
    private User gamemaster;

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<GameSession> gameSessions = new ArrayList<>();


    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @OneToMany(mappedBy = "currentRoom")
    @Builder.Default  // Ez fontos a Lombok Builder-hez!
    private List<User> participants = new ArrayList<>();

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Bot> bots = new ArrayList<>();

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default  // Ez fontos a Lombok Builder-hez!
    private List<Message> messages = new ArrayList<>();
}
