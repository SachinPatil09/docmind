package com.example.docmind.Service;

import com.example.docmind.config.AppProperties;
import com.example.docmind.entity.DocumentMetaData;
import com.example.docmind.entity.DocumentStatus;
import com.example.docmind.exception.DocumentProcessingException;
import com.example.docmind.repository.DocumentMetaDataRepo;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DocumentIngestionService {


    private static final Logger log= LoggerFactory .getLogger(DocumentIngestionService.class);

    private  final VectorStore vectorStore;
    private final DocumentMetaDataRepo documentMetadataRepo;
    private final AppProperties appProperties;
    public int ingest(DocumentMetaData metaData, List<Document> pardedDocs) {
        log.info("Ingesting document [id={}, name={}, pages={}]", metaData.getId(),metaData.getFilename(), metaData.getFilesize());


        try{

            metaData.setStatus(DocumentStatus.PROCESSING);
            metaData.setTotalPages(pardedDocs.size());

            //1. Text chunking using TokenTextSplitter

            TokenTextSplitter tokenTextSplitter= TokenTextSplitter.builder()
                    .withChunkSize(appProperties.getRag().getChunkSize())
                    .withMinChunkSizeChars(appProperties.getRag().getMinChunkSizeChars())
                    .withMinChunkLengthToEmbed(appProperties.getRag().getMinChunkLengthToEmbed())
                    .withMaxNumChunks(appProperties.getRag().getMaxNumChunks())
                    .withKeepSeparator(true)
                    .build();


            List<Document> chunks = tokenTextSplitter.apply(pardedDocs);
            if(chunks.isEmpty()){
                metaData.setStatus(DocumentStatus.FAILED);
                metaData.setErrorMessage("Document appears to be empty or unscannable");
                documentMetadataRepo.save(metaData);
                return 0;
            }


//            2. Meta data enrichment on each chunk
            List<Document> enrichedChunks = new ArrayList<>();
            for (int i = 0; i < chunks.size(); i++){
                Document chunk = chunks.get(i);
                Map<String, Object> enrichedMetadata = new HashMap<>(chunk.getMetadata());
                enrichedMetadata.put("documentId", metaData.getId().toString());
                enrichedMetadata.put("fileName", metaData.getFilename());
                enrichedMetadata.put("contentType", metaData.getContentType());
                enrichedMetadata.put("chunkIndex", i);
//                this step is very important for user based document
                enrichedMetadata.put("userId", metaData.getUser().getId().toString());
                // Preserve or calculate page number if available
                Object pageNumber = chunk.getMetadata().get("page_number");
                if (pageNumber == null) {
                    pageNumber = chunk.getMetadata().get("pageNumber");

                }

                if (pageNumber != null) {
                    enrichedMetadata.put("pageNumber", pageNumber);
                }
                Document enrichedDoc = new Document(chunk.getText(), enrichedMetadata);
                enrichedChunks.add(enrichedDoc);
            }


//            3. write chunks and embedding to pg vector
            log.info("Writing {} vector chunks to PgVectorStore for document: {}", enrichedChunks.size(), metaData.getFilename());
            vectorStore.add(enrichedChunks);

//            4. Update document status to index
            metaData.setStatus(DocumentStatus.INDEXED);
            metaData.setTotalChunks(enrichedChunks.size());
            metaData.setErrorMessage(null);
            documentMetadataRepo.save(metaData);
            log.info("Successfully indexed document [id={}, name={}, chunks={}]", metaData.getId(), metaData.getFilename(), enrichedChunks.size());

            return enrichedChunks.size();
        }catch (Exception ex){
            log.error("Failed to ingest document into vector store: {}", metaData.getFilename(), ex);
            metaData.setStatus(DocumentStatus.FAILED);
            metaData.setErrorMessage(ex.getMessage());
            documentMetadataRepo.save(metaData);
            throw new DocumentProcessingException("Failed to index document: " + ex.getMessage(), ex);
        }


    }
}
