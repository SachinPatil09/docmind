package com.example.docmind.Controller;

import com.example.docmind.Service.DocumentMetaDataService;
import com.example.docmind.dto.ApiResponse;
import com.example.docmind.dto.CitationDto;
import com.example.docmind.dto.DocumentMetadataDto;
import com.example.docmind.dto.DocumentResponseDTO;
import com.example.docmind.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@RequiredArgsConstructor
@RestController
@Tag(
        name = "Document Management",
        description = "Endpoints for uploading, listing and managing documents and their vectors embeddings."
)
@RequestMapping("/api/v1/documents")
public class DocumentController {

    private final DocumentMetaDataService documentService;
    @PostMapping(value = "/upload",consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "upload and index a document (PDF , DOC , TEXT)",
            description = "this api is used to uplaod and index document file"
    )
    public ResponseEntity<ApiResponse<DocumentResponseDTO>> uploadDocument(
            @RequestParam("file")MultipartFile file ,
            Authentication authentication
            ){


        log.info("document uploading started");
        User user = (User) authentication.getPrincipal();

        //process the file

        DocumentResponseDTO documentResponseDTO= this.documentService.uploadAndProcess(file,user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<DocumentResponseDTO>builder()
                        .success(true)
                        .data(documentResponseDTO)
                        .timestamp(LocalDateTime.now())
                        .message("Documents uploaded and indexed successfully")
                        .build());
    }


    //    api to upload multiple documents
    @PostMapping(value = "/upload-multiple", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Upload and index multiple documents simultaneously",
            description = "This api is used to upload and index multiple documents."
    )
    public ResponseEntity<ApiResponse<List<DocumentResponseDTO>>> uploadMultiple(
            @RequestParam("files")
            List<MultipartFile> files ,
            Authentication authentication
    ) {
        User user=(User)authentication.getPrincipal();
        List<DocumentResponseDTO> responseDtos = documentService.uploadMultipleDocuments(files,user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(
                        ApiResponse.<List<DocumentResponseDTO>>
                                        builder()
                                .message("Document uploaded successfully")
                                .success(true)
                                .timestamp(LocalDateTime.now())
                                .data(responseDtos)
                                .build()
                );
    }


    //    list all uploaded documents
//    Method for admin
    @PreAuthorize(("hasRole('ADMIN')"))
    @GetMapping
    @Operation(summary = "List all uploaded documents and their indexing status")
    public ResponseEntity<ApiResponse<List<DocumentMetadataDto>>> getAllDocuments(){
        java.util.List<DocumentMetadataDto> documents =documentService.getAllDocuments();
        return ResponseEntity.ok(
                ApiResponse.<List<DocumentMetadataDto>>
                                builder()
                        .message("All documents is here")
                        .success(true)
                        .timestamp(LocalDateTime.now())
                        .data(documents)
                        .build()
        );
    }

    //    list all uploaded documents of logged in user
    @GetMapping("/user")
    @Operation(summary = "List all uploaded documents and their indexing status of the logged user")
    public ResponseEntity<ApiResponse<List<DocumentMetadataDto>>> getAllDocumentOfLoggedInUser(
            Authentication authentication
    ){
        User user=(User)authentication.getPrincipal();
        java.util.List<DocumentMetadataDto> documents =documentService.getAllDocumentsByUser(user);
        return ResponseEntity.ok(
                ApiResponse.<List<DocumentMetadataDto>>
                                builder()
                        .message("All documents is here")
                        .success(true)
                        .timestamp(LocalDateTime.now())
                        .data(documents)
                        .build()
        );
    }
    @GetMapping("/{id}")
    @Operation(summary = "Get metadata of a specific document by ID")
    public ResponseEntity<ApiResponse<DocumentMetadataDto>> getDocumentById(@PathVariable UUID id) {
        DocumentMetadataDto document = documentService.getDocumentById(id);
        return ResponseEntity.ok(
                ApiResponse.<DocumentMetadataDto>
                                builder()
                        .message("Single document is here")
                        .success(true)
                        .timestamp(LocalDateTime.now())
                        .data(document)
                        .build()
        );
    }

    @GetMapping("/{id}/chunks")
    @Operation(summary = "Get all indexed chunks of a specific document")
    public ResponseEntity<ApiResponse<List<CitationDto>>> getDocumentChunks(@PathVariable UUID id) {
        List<CitationDto> chunks = documentService.getDocumentChunks(id);
        return ResponseEntity.ok(
                ApiResponse.<List<CitationDto>>builder()
                        .message("Document chunks fetched successfully")
                        .success(true)
                        .timestamp(LocalDateTime.now())
                        .data(chunks)
                        .build()
        );
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a document and purge its vector embeddings from vector store")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(@PathVariable UUID id) {
        documentService.deleteDocument(id);
        return ResponseEntity.ok(
                ApiResponse.<Void>
                                builder()
                        .message("Document deleted successfully")
                        .success(true)
                        .timestamp(LocalDateTime.now())
                        .data(null)
                        .build()
        );
    }

}
