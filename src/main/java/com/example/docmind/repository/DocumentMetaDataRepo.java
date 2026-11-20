package com.example.docmind.repository;

import com.example.docmind.entity.DocumentMetaData;
import com.example.docmind.entity.DocumentStatus;
import com.example.docmind.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentMetaDataRepo extends JpaRepository<DocumentMetaData, UUID> {
    List<DocumentMetaData> findByStatus(DocumentStatus status);

    List<DocumentMetaData> findAllByOrderByCreatedAtDesc();

    List<DocumentMetaData> findByUserOrderByCreatedAtDesc(User user);

    Optional<DocumentMetaData> findByIdAndUser(UUID id, User user);
}
