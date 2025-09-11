package org.game.pharaohcardgame.Model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.game.pharaohcardgame.Enum.Role;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name="user_entity")
@Builder
public class User implements UserDetails {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false,unique = true)
    private String name;

    @Column(nullable = false)
    private String userPassword;

    @Enumerated(EnumType.STRING)
    private Role role;

    @ManyToOne
    @JoinColumn(name="room_id")
    private Room currentRoom;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Player> userPlayers=new ArrayList<>();

    // Egy user több szobának is lehet a gamemastere
    @OneToMany(mappedBy = "gamemaster")
    @Builder.Default
    private List<Room> managedRooms = new ArrayList<>();

    @OneToMany(mappedBy = "sender", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default  // Ez fontos a Lombok Builder-hez!
    private List<Message> messages = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL,orphanRemoval = true)
    private List<Tokens> tokens;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return switch (role) {
            case USER -> List.of(new SimpleGrantedAuthority("ROLE_USER"));
            case GAMEMASTER -> List.of(
                    new SimpleGrantedAuthority("ROLE_USER"),
                    new SimpleGrantedAuthority("ROLE_GAMEMASTER")
            );
            default -> List.of();
        };
    }

    @Override
    public String getPassword() {
        return userPassword;
    }


    @Override
    public String getUsername() {
        return name;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
