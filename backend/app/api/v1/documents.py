from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List
from app.models.schemas import DocumentResponse, DocumentUploadResponse
from app.core.rag.pipeline import rag_pipeline
import os
import aiofiles

router = APIRouter()

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    temp_path = f"/tmp/{file.filename}"
    async with aiofiles.open(temp_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
        
    try:
        metadata = {"filename": file.filename, "user_id": user_id}
        doc_id = await rag_pipeline.ingest_document(temp_path, user_id, metadata)
        return DocumentUploadResponse(
            id=doc_id,
            filename=file.filename,
            file_type=file.filename.split('.')[-1],
            chunk_count=0, # Simplified for now
            created_at="now"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.get("", response_model=List[DocumentResponse])
async def list_documents():
    return []

@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    success = await rag_pipeline.delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "deleted"}

@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str):
    raise HTTPException(status_code=501, detail="Not implemented")
