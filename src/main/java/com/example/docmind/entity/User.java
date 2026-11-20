package com.example.docmind.entity;


import jakarta.persistence.*;
import lombok.*;

import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "users")
@Getter
@Setter
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private  Long id;

    @Column(unique = true,nullable = false)
    private  String username;

    @Column(unique = false)
    private  String password;

    @Enumerated(EnumType.STRING)
    private  Role role;

    @Column(unique = true,nullable = false)
    private  String email;

    @OneToMany(mappedBy = "user",cascade = CascadeType.ALL,orphanRemoval = true)
    private Set<DocumentMetaData> documentMetadataSet=new LinkedHashSet<>();
}
