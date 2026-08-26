import re
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

@dataclass
class Chunk:
    content: str
    chunk_index: int
    document_id: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    parent_id: Optional[str] = None

class HierarchicalChunker:
    def __init__(self, parent_size: int = 1000, child_size: int = 300, overlap: int = 50):
        self.parent_size = parent_size
        self.child_size = child_size
        self.overlap = overlap
        # Regex for Spanish sentence splitting
        self.sentence_pattern = re.compile(r'(?<=[.!?])\s+|(?<=\n)\s*')

    def split_sentences(self, text: str) -> List[str]:
        return [s.strip() for s in self.sentence_pattern.split(text) if s.strip()]

    def group_sentences(self, sentences: List[str], target_size: int) -> List[str]:
        chunks = []
        current_chunk = []
        current_length = 0

        for sentence in sentences:
            sentence_len = len(sentence)
            if current_length + sentence_len > target_size and current_chunk:
                chunks.append(" ".join(current_chunk))
                # Add overlap from last sentences
                overlap_length = 0
                overlap_chunk = []
                for s in reversed(current_chunk):
                    if overlap_length + len(s) <= self.overlap:
                        overlap_chunk.insert(0, s)
                        overlap_length += len(s)
                    else:
                        break
                current_chunk = list(overlap_chunk)
                current_length = overlap_length

            current_chunk.append(sentence)
            current_length += sentence_len + 1 # +1 for space

        if current_chunk:
            chunks.append(" ".join(current_chunk))
            
        return chunks

    def chunk_document(self, text: str, document_id: str, source_filename: str) -> List[Chunk]:
        sentences = self.split_sentences(text)
        parent_texts = self.group_sentences(sentences, self.parent_size)
        
        all_chunks = []
        chunk_index = 0
        
        for parent_idx, p_text in enumerate(parent_texts):
            parent_id = f"{document_id}_p{parent_idx}"
            
            # Parent chunk
            all_chunks.append(Chunk(
                content=p_text,
                chunk_index=chunk_index,
                document_id=document_id,
                metadata={"source_filename": source_filename, "is_parent": True},
                parent_id=None
            ))
            chunk_index += 1
            
            # Child chunks
            child_sentences = self.split_sentences(p_text)
            child_texts = self.group_sentences(child_sentences, self.child_size)
            
            for c_text in child_texts:
                all_chunks.append(Chunk(
                    content=c_text,
                    chunk_index=chunk_index,
                    document_id=document_id,
                    metadata={"source_filename": source_filename, "is_parent": False},
                    parent_id=parent_id
                ))
                chunk_index += 1
                
        return all_chunks