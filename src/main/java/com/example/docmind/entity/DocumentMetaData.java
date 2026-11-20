package com.example.docmind.entity;


import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "document_metadata")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DocumentMetaData {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = false)
    private String filename;

    @Column(nullable = false)
    private String contentType;
    private Long filesize;
    private Integer totalPages;
    private Integer totalChunks;


    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentStatus status ;

    @Column(length = 1000)
    private String errorMessage;

    @Column(nullable = false , updatable = false)
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
}
