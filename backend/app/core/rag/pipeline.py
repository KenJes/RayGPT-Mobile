from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from app.core.rag.chunking import HierarchicalChunker
from app.core.rag.retriever import QdrantRetriever
from app.core.rag.embeddings import embedding_service
from app.core.rag.ingestion import DocumentIngester
from loguru import logger
import uuid

@dataclass
class RAGResult:
    content: str
    score: float
    metadata: Dict[str, Any]
    document_id: str

class RAGPipeline:
    def __init__(self):
        self.chunker = HierarchicalChunker()
        self.retriever = QdrantRetriever()
        self.ingester = DocumentIngester()

    async def ingest_document(self, file_path: str, user_id: str, filename: str) -> tuple[str, int]:
        document_id = str(uuid.uuid4())
        
        # Parse
        text, metadata = self.ingester.parse(file_path)
        
        # Chunk
        chunks = self.chunker.chunk_document(text, document_id, filename)
        for chunk in chunks:
            chunk.metadata.update(metadata)
            
        # Embed
        texts = [c.content for c in chunks]
        vectors = embedding_service.encode(texts)
        
        # Store
        await self.retriever.upsert(chunks, vectors, user_id)
        
        return document_id, len(chunks)

    async def delete_document(self, document_id: str, user_id: str):
        await self.retriever.delete_by_document(document_id, user_id)

    async def query(self, query: str, user_id: str, limit: int = 5) -> List[RAGResult]:
        # Embed query
        query_vector = embedding_service.encode_query(query)
        
        # Search
        results = await self.retriever.search(query_vector, user_id, limit)
        
        final_results = []
        parent_ids = []
        
        for res in results:
            payload = res["payload"]
            if payload.get("parent_id") and payload["parent_id"] not in parent_ids:
                parent_ids.append(payload["parent_id"])
        
        if parent_ids:
            parents = await self.retriever.get_parent_chunks(parent_ids, user_id)
            # Expand context
            for parent in parents:
                final_results.append(RAGResult(
                    content=parent["payload"]["text"],
                    score=1.0, # contextual score
                    metadata=parent["payload"],
                    document_id=parent["payload"]["document_id"]
                ))
                
        # Add original results if not covered by parents
        for res in results:
            payload = res["payload"]
            if payload.get("parent_id") not in parent_ids:
                final_results.append(RAGResult(
                    content=payload["text"],
                    score=res["score"],
                    metadata=payload,
                    document_id=payload["document_id"]
                ))
                
        return final_results
rag_pipeline = RAGPipeline()
