# main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
import shutil
from datetime import datetime
import uuid

# Import our services
from services.pdf_processor import PDFProcessor
from services.embedding_service import EmbeddingService
from services.llm_service import LLMService

# ============================================================================
# PYDANTIC MODELS FOR REQUEST/RESPONSE
# ============================================================================

class UploadResponse(BaseModel):
    filename: str
    file_id: str
    status: str
    message: str

class ProcessResponse(BaseModel):
    file_id: str
    status: str
    chunks_count: int
    processing_time: float
    message: str

class ProcessRequest(BaseModel):
    file_id: str

class QueryRequest(BaseModel):
    query: str
    file_id: str
    k: int = 5  # Number of chunks to retrieve

class EnhancedQueryResponse(BaseModel):
    query: str
    answer: str
    sources: List[Dict]
    processing_time: float
    file_id: str
    query_type: Optional[str] = None
    chunks_retrieved: int
    llm_used: bool
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str
    llm_status: Optional[Dict] = None

# ============================================================================
# FASTAPI APP INITIALIZATION
# ============================================================================

app = FastAPI(
    title="DocuQuery Enhanced API",
    description="AI-Powered Document Q&A System with Gemini Integration",
    version="2.0.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# GLOBAL SERVICES INITIALIZATION
# ============================================================================

# Initialize services
pdf_processor = PDFProcessor()
embedding_service = EmbeddingService()

# Initialize LLM service with Gemini 1.5 Flash
llm_service = LLMService()

# In-memory storage for MVP (in production, use database)
processed_documents = {}  # file_id -> document metadata

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/", response_model=HealthResponse)
async def health_check():
    """Enhanced health check with LLM status"""
    llm_status = llm_service.get_provider_status()
    
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="2.0.0",
        llm_status=llm_status
    )

@app.get("/llm-status")
async def get_llm_status():
    """Get detailed LLM provider status"""
    return llm_service.get_provider_status()

@app.post("/upload-pdf", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """
    STEP 1: Upload PDF file
    - Validates file type
    - Saves file to uploads directory
    - Returns file_id for tracking
    """
    
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=400, 
            detail="Only PDF files are allowed"
        )
    
    # Generate unique file ID
    file_id = str(uuid.uuid4())
    
    # Create safe filename
    safe_filename = f"{file_id}_{file.filename}"
    file_path = f"uploads/{safe_filename}"
    
    try:
        # Ensure uploads directory exists
        os.makedirs("uploads", exist_ok=True)
        
        # Save uploaded file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Store file metadata
        processed_documents[file_id] = {
            "original_filename": file.filename,
            "safe_filename": safe_filename,
            "file_path": file_path,
            "upload_time": datetime.now(),
            "status": "uploaded",
            "file_size": len(content)
        }
        
        return UploadResponse(
            filename=file.filename,
            file_id=file_id,
            status="uploaded",
            message=f"File '{file.filename}' uploaded successfully"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"File upload failed: {str(e)}"
        )

@app.post("/process-pdf", response_model=ProcessResponse)
async def process_pdf(request: ProcessRequest):
    """
    STEP 2: Process uploaded PDF
    - Extract text from PDF
    - Chunk text into segments
    - Generate embeddings
    - Build search index
    """
    
    file_id = request.file_id
    
    # Check if file exists
    if file_id not in processed_documents:
        raise HTTPException(
            status_code=404,
            detail="File not found. Please upload the file first."
        )
    
    doc_info = processed_documents[file_id]
    
    # Check if already processed
    if doc_info.get("status") == "processed":
        return ProcessResponse(
            file_id=file_id,
            status="already_processed",
            chunks_count=doc_info["chunks_count"],
            processing_time=0.0,
            message="Document already processed"
        )
    
    try:
        start_time = datetime.now()
        
        # Update status to processing
        processed_documents[file_id]["status"] = "processing"
        
        # Step 1: Extract and chunk text from PDF
        file_path = doc_info["file_path"]
        
        # Verify file exists on disk
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=404,
                detail=f"PDF file not found on disk: {file_path}"
            )
        
        # Process PDF
        chunks = pdf_processor.process_pdf(file_path)
        
        if not chunks:
            raise HTTPException(
                status_code=422,
                detail="Could not extract text from PDF. The file might be corrupted or image-only."
            )
        
        # Step 2: Build vector index
        embedding_service.build_vector_index(chunks)
        
        # Step 3: Save index to disk
        index_path = f"model/{file_id}"
        embedding_service.save_index(index_path)
        
        # Update document metadata
        processing_time = (datetime.now() - start_time).total_seconds()
        processed_documents[file_id].update({
            "status": "processed",
            "chunks_count": len(chunks),
            "processing_time": processing_time,
            "index_path": index_path,
            "processed_at": datetime.now()
        })
        
        return ProcessResponse(
            file_id=file_id,
            status="processed",
            chunks_count=len(chunks),
            processing_time=processing_time,
            message=f"Document processed successfully. Created {len(chunks)} text chunks."
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Update status to error
        processed_documents[file_id]["status"] = "error"
        processed_documents[file_id]["error_message"] = str(e)
        
        raise HTTPException(
            status_code=500,
            detail=f"Document processing failed: {str(e)}"
        )

@app.post("/query", response_model=EnhancedQueryResponse)
async def query_document(request: QueryRequest):
    """
    STEP 3: Enhanced query endpoint with Gemini integration
    - Load document index
    - Search for relevant chunks
    - Generate intelligent answer using Gemini
    - Return results with sources
    """
    
    # Validate file_id
    if request.file_id not in processed_documents:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )
    
    doc_info = processed_documents[request.file_id]
    
    # Check if document is processed
    if doc_info["status"] != "processed":
        raise HTTPException(
            status_code=400,
            detail=f"Document is not ready for querying. Status: {doc_info['status']}"
        )
    
    try:
        start_time = datetime.now()
        
        # Load index if not in memory
        index_path = doc_info["index_path"]
        if not embedding_service.index_loaded:
            success = embedding_service.load_index(index_path)
            if not success:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to load document index"
                )
        
        # Search for relevant chunks
        results = embedding_service.search_similar(request.query, request.k)
        
        # Classify query type
        query_type = llm_service.classify_query_type(request.query)
        
        # Generate intelligent answer using Gemini
        llm_result = llm_service.generate_answer(
            request.query, 
            results, 
            doc_info["original_filename"]
        )
        
        # Format sources
        sources = []
        for i, (text, score) in enumerate(results):
            sources.append({
                "chunk_id": i + 1,
                "text": text,
                "relevance_score": round(float(score), 3),
                "preview": text[:200] + "..." if len(text) > 200 else text
            })
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return EnhancedQueryResponse(
            query=request.query,
            answer=llm_result["answer"],
            sources=sources,
            processing_time=processing_time,
            file_id=request.file_id,
            query_type=query_type,
            chunks_retrieved=len(results),
            llm_used=True,
            llm_provider=llm_result.get("provider"),
            llm_model=llm_result.get("model")
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Query processing failed: {str(e)}"
        )

@app.get("/document/{file_id}")
async def get_document_info(file_id: str):
    """Get document information and status"""
    
    if file_id not in processed_documents:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )
    
    doc_info = processed_documents[file_id].copy()
    
    # Convert datetime objects to strings for JSON serialization
    if "upload_time" in doc_info:
        doc_info["upload_time"] = doc_info["upload_time"].isoformat()
    if "processed_at" in doc_info:
        doc_info["processed_at"] = doc_info["processed_at"].isoformat()
    
    return {
        "file_id": file_id,
        **doc_info
    }

@app.get("/documents")
async def list_documents():
    """List all uploaded documents"""
    
    documents = []
    for file_id, doc_info in processed_documents.items():
        doc_copy = doc_info.copy()
        
        # Convert datetime objects to strings
        if "upload_time" in doc_copy:
            doc_copy["upload_time"] = doc_copy["upload_time"].isoformat()
        if "processed_at" in doc_copy:
            doc_copy["processed_at"] = doc_copy["processed_at"].isoformat()
        
        documents.append({
            "file_id": file_id,
            **doc_copy
        })
    
    return {
        "total_documents": len(documents),
        "documents": documents
    }

@app.delete("/document/{file_id}")
async def delete_document(file_id: str):
    """Delete document and associated files"""
    
    if file_id not in processed_documents:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )
    
    doc_info = processed_documents[file_id]
    
    try:
        # Delete uploaded file
        if os.path.exists(doc_info["file_path"]):
            os.remove(doc_info["file_path"])
        
        # Delete index files
        if "index_path" in doc_info:
            index_files = [
                f"{doc_info['index_path']}.index",
                f"{doc_info['index_path']}.chunks",
                f"{doc_info['index_path']}.meta"
            ]
            for index_file in index_files:
                if os.path.exists(index_file):
                    os.remove(index_file)
        
        # Remove from memory
        del processed_documents[file_id]
        
        return {
            "message": f"Document {file_id} deleted successfully",
            "file_id": file_id
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete document: {str(e)}"
        )

# ============================================================================
# STARTUP EVENT
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize required directories and check LLM status"""
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("model", exist_ok=True)
    
    # Check LLM status
    llm_status = llm_service.get_provider_status()
    
    print("=" * 60)
    print("🚀 DocuQuery Enhanced API started successfully!")
    print(f"📚 API Documentation: http://localhost:8000/docs")
    print(f"🤖 LLM Provider: {llm_service.provider}")
    print(f"🤖 LLM Model: {llm_service.model}")
    print(f"🟢 LLM Status: {llm_status['status']}")
    if llm_status['status'] == 'unavailable':
        print(f"⚠️  LLM Error: {llm_status.get('error', 'Unknown error')}")
        print("📝 Note: API will work with basic retrieval mode")
    else:
        print(f"✅ {llm_status.get('message', 'LLM ready!')}")
    print("=" * 60)

# ============================================================================
# RUN THE APPLICATION
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)