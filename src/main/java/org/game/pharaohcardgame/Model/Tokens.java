package org.game.pharaohcardgame.Model;

import org.game.pharaohcardgame.Enum.tokenType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class Tokens {

    @Id
    @GeneratedValue
    public Integer id;

    @Column(unique = true, length = 1000)
    public String token;

    @Enumerated(EnumType.STRING)
    public tokenType type;

    public boolean revoked;

    public boolean expired;

    @ManyToOne
    @JoinColumn(name = "user_id")
    public User user;
}

