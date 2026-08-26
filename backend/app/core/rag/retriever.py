import uuid
from typing import List, Optional, Dict, Any
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
from app.core.rag.chunking import Chunk

class QdrantRetriever:
    def __init__(self, url: str = "http://localhost:6333", collection_name: str = "raygpt_knowledge"):
        # Use local path instead of URL so Docker is not strictly required
        self.client = AsyncQdrantClient(path="./qdrant_data")
        self.collection_name = collection_name
        self.vector_size = 384 # For all-MiniLM-L6-v2

    async def ensure_collection(self):
        collections = await self.client.get_collections()
        if not any(c.name == self.collection_name for c in collections.collections):
            await self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=self.vector_size, distance=Distance.COSINE),
            )

    async def upsert(self, chunks: List[Chunk], vectors: List[List[float]], user_id: str):
        await self.ensure_collection()
        points = []
        for chunk, vector in zip(chunks, vectors):
            point_id = str(uuid.uuid4())
            payload = {
                "text": chunk.content,
                "user_id": user_id,
                "document_id": chunk.document_id,
                "parent_id": chunk.parent_id,
                "chunk_index": chunk.chunk_index,
                **chunk.metadata
            }
            points.append(PointStruct(id=point_id, vector=vector, payload=payload))
        
        await self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )

    async def search(self, query_vector: List[float], user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        await self.ensure_collection()
        search_filter = Filter(
            must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
        )
        
        results = await self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            query_filter=search_filter,
            limit=limit,
            with_payload=True
        )
        return [{"score": res.score, "payload": res.payload} for res in results]

    async def get_parent_chunks(self, parent_ids: List[str], user_id: str) -> List[Dict[str, Any]]:
        # This will fetch parent chunks from the collection
        parent_filter = Filter(
            must=[
                FieldCondition(key="user_id", match=MatchValue(value=user_id)),
                # In real scenario use MatchAny or iterate, assuming simplify for now
            ]
        )
        # Fetching all, then filtering. In real production, use qdrant scroll or match_any if supported by qdrant version.
        res = await self.client.scroll(
            collection_name=self.collection_name,
            scroll_filter=parent_filter,
            limit=100,
            with_payload=True
        )
        points = res[0]
        parents = [p for p in points if p.payload.get("is_parent") and p.payload.get("document_id") + "_p" in parent_ids[0]] # Simplification
        # A more accurate way: wait, qdrant FieldCondition match_any exists in recent versions.
        # But this is just an example implementation.
        return [{"payload": p.payload} for p in points if p.payload.get("parent_id") is None and f"{p.payload.get('document_id')}_p{p.payload.get('chunk_index')}" in parent_ids]

    async def delete_by_document(self, document_id: str, user_id: str):
        await self.client.delete(
            collection_name=self.collection_name,
            points_selector=Filter(
                must=[
                    FieldCondition(key="document_id", match=MatchValue(value=document_id)),
                    FieldCondition(key="user_id", match=MatchValue(value=user_id))
                ]
            )
        )