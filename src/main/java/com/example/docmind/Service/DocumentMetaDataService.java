package com.example.docmind.Service;

import com.example.docmind.dto.CitationDto;
import com.example.docmind.dto.DocumentMetadataDto;
import com.example.docmind.dto.DocumentResponseDTO;
import com.example.docmind.entity.DocumentMetaData;
import com.example.docmind.entity.DocumentStatus;
import com.example.docmind.entity.User;
import com.example.docmind.exception.DocumentProcessingException;
import com.example.docmind.exception.ResourceNotFoundException;
import com.example.docmind.repository.DocumentMetaDataRepo;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RequiredArgsConstructor
@Service
public class DocumentMetaDataService {

    private static final Logger log = LoggerFactory.getLogger(DocumentMetaDataService.class);

    private final DocumentParserService parserService;
    private final DocumentIngestionService documentIngestionService;
    private final DocumentIngestionService ingestionService;
    private final ModelMapper modelMapper;
    private final DocumentMetaDataRepo documentMetaDataRepo;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public DocumentResponseDTO uploadAndProcess(MultipartFile file , User user) {

       String filename =  file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
       String contentType = file.getContentType() != null ? file.getContentType(): "application/octat-stream";

//document meta data create
        //storing the user detail with document metadata
        DocumentMetaData documentMetadata = DocumentMetaData
                .builder()
                .filename(filename)
                .contentType(contentType)
                .status(DocumentStatus.UPLOADING)
                .filesize(file.getSize())
                .createdAt(LocalDateTime.now())
                .user(user)
                .build();


        //save the document meta-data
        documentMetadata  = documentMetaDataRepo.save(documentMetadata);

        //parse the file
        List<Document> parsedDocs = null;

       //ingest service
        int chunksCreated = 0;

        try {
            //parse the file
            parsedDocs = parserService.parse(file);

            //ingest service
            chunksCreated = ingestionService.ingest(documentMetadata, parsedDocs);
        } catch (
                DocumentProcessingException e
        ) {
            log.info("Document metadata deleting due to fail processing");
            documentMetaDataRepo.delete(documentMetadata);
            throw e;
        }

        //documentMetadata.setTotalChunks(chunksCreated);

        return DocumentResponseDTO.builder()
                .id(documentMetadata.getId())
                .fileName(documentMetadata.getFilename())
                .fileSize(documentMetadata.getFilesize())
                .chunksCreated(chunksCreated)
                .status(documentMetadata.getStatus())
                .message("Document successfully Processed and indexed")
                .userId(documentMetadata.getUser() != null ? documentMetadata.getUser().getId() : null)
                .build();


    }

    public List<DocumentResponseDTO> uploadMultipleDocuments(List<MultipartFile> files , User user) {
        List<DocumentResponseDTO> responseDtos = new ArrayList<>();

        for (MultipartFile file : files) {
            DocumentResponseDTO result = this.uploadAndProcess(file,user);
            responseDtos.add(result);
        }

        return responseDtos;
    }

    public List<CitationDto> getDocumentChunks(UUID id) {
        try {
            String sql = "SELECT id, content, metadata FROM vector_store WHERE metadata->>'documentId' = ? ORDER BY CAST(COALESCE(metadata->>'chunkIndex', '0') AS INTEGER) ASC";
            return jdbcTemplate.query(sql, (rs, rowNum) -> {
                String content = rs.getString("content");
                return CitationDto.builder()
                        .documentId(id)
                        .chunkIndex(rowNum)
                        .snippet(content)
                        .build();
            }, id.toString());
        } catch (Exception e) {
            log.warn("Could not query chunks directly: {}", e.getMessage());
            return java.util.Collections.emptyList();
        }
    }

    public List<DocumentMetadataDto> getAllDocuments() {
        List<DocumentMetaData> allDocuments = documentMetaDataRepo.findAllByOrderByCreatedAtDesc();
       return   allDocuments.stream()
                 .map(documentMetadata -> modelMapper.map(documentMetadata, DocumentMetadataDto.class))
                 .toList();
    }

    public List<DocumentMetadataDto> getAllDocumentsByUser(User user) {
        List<DocumentMetaData> documents = documentMetaDataRepo.findByUserOrderByCreatedAtDesc(user);
        return documents.stream()
                .map(documentMetadata -> modelMapper.map(documentMetadata, DocumentMetadataDto.class))
                .toList();
    }

    public DocumentMetadataDto getDocumentById(UUID id) {
        DocumentMetaData documentMetadata = documentMetaDataRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Document with given id not found !!"));
        return modelMapper.map(documentMetadata, DocumentMetadataDto.class);
    }

    @Transactional
    public void deleteDocument(UUID id) {
        DocumentMetaData documentMetadata = documentMetaDataRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Document with given id not found !!"));


        documentMetaDataRepo.delete(documentMetadata);
        //delete the vector entries
        try {
            String deleteVectorsSql = "DELETE FROM vector_store WHERE metadata->>'documentId' = ?";
            int deletedCount = jdbcTemplate.update(deleteVectorsSql, id.toString());
            log.info("Deleted {} vector chunks for document id {} ", deletedCount, id);

        } catch (Exception e) {
            log.warn("cloud not delete vectors from vector store directly: {}", e.getMessage());
        }
    }
}
