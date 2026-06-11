package com.entities;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
@Entity
@Table(name = "APP_USERS")
@Data
@NoArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true, nullable = false)
    private String email;
    @Column(nullable = false)
    private String passwordHash;
    @Column(nullable = false)
    private String name;
    @Column(nullable = false)
    private String workspace;
    private String role = "USER";

    public User(String email, String passwordHash, String name, String workspace) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.name = name;
        this.workspace = workspace;
    }
}
