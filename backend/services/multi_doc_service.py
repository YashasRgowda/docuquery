# services/multi_doc_service.py
from typing import Dict, List, Tuple, Optional
from datetime import datetime
import logging
import time
import numpy as np
import faiss

logger = logging.getLogger(__name__)

class MultiDocumentService:
    """Service for handling multi-document operations and cross-analysis"""
    
    def __init__(self, embedding_service, llm_service):
        """
        Initialize multi-document service
        
        Args:
            embedding_service: Instance of EmbeddingService
            llm_service: Instance of LLMService
        """
        self.embedding_service = embedding_service
        self.llm_service = llm_service
        
        # Storage for multiple document indices
        self.document_indices = {}  # file_id -> {"index": faiss_index, "chunks": [], "metadata": {}}
        self.master_index = None  # Combined index for all documents
        self.master_chunks = []  # All chunks with document attribution
        self.chunk_to_doc_mapping = []  # Maps chunk index to (file_id, local_chunk_id)
        
        logger.info("MultiDocumentService initialized")
    
    def add_document(self, file_id: str, chunks: List[str], metadata: Dict) -> bool:
        """
        Add a document to the multi-document collection
        
        Args:
            file_id: Unique identifier for the document
            chunks: List of text chunks from the document
            metadata: Document metadata (filename, etc.)
            
        Returns:
            True if successfully added, False otherwise
        """
        try:
            logger.info(f"Adding document {file_id} with {len(chunks)} chunks to collection")
            
            # Generate embeddings for this document
            embeddings = self.embedding_service.create_embeddings(chunks)
            
            # Create individual FAISS index for this document
            individual_index = faiss.IndexFlatIP(self.embedding_service.dimension)
            faiss.normalize_L2(embeddings)
            individual_index.add(embeddings)
            
            # Store document information
            self.document_indices[file_id] = {
                "index": individual_index,
                "chunks": chunks,
                "embeddings": embeddings,
                "metadata": metadata,
                "added_at": datetime.now()
            }
            
            # Rebuild master index
            self._rebuild_master_index()
            
            logger.info(f"Document {file_id} added successfully. Collection now has {len(self.document_indices)} documents")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add document {file_id}: {str(e)}")
            return False
    
    def remove_document(self, file_id: str) -> bool:
        """
        Remove a document from the collection
        
        Args:
            file_id: Document ID to remove
            
        Returns:
            True if successfully removed, False otherwise
        """
        try:
            if file_id not in self.document_indices:
                logger.warning(f"Document {file_id} not found in collection")
                return False
            
            # Remove from collection
            del self.document_indices[file_id]
            
            # Rebuild master index
            self._rebuild_master_index()
            
            logger.info(f"Document {file_id} removed. Collection now has {len(self.document_indices)} documents")
            return True
            
        except Exception as e:
            logger.error(f"Failed to remove document {file_id}: {str(e)}")
            return False
    
    def _rebuild_master_index(self):
        """Rebuild the master index combining all documents"""
        try:
            if not self.document_indices:
                self.master_index = None
                self.master_chunks = []
                self.chunk_to_doc_mapping = []
                return
            
            # Collect all embeddings and chunks
            all_embeddings = []
            self.master_chunks = []
            self.chunk_to_doc_mapping = []
            
            for file_id, doc_data in self.document_indices.items():
                embeddings = doc_data["embeddings"]
                chunks = doc_data["chunks"]
                
                # Add embeddings to master collection
                all_embeddings.append(embeddings)
                
                # Add chunks with document attribution
                for i, chunk in enumerate(chunks):
                    self.master_chunks.append({
                        "text": chunk,
                        "file_id": file_id,
                        "document_name": doc_data["metadata"]["original_filename"],
                        "local_chunk_id": i
                    })
                    self.chunk_to_doc_mapping.append((file_id, i))
            
            # Combine all embeddings
            if all_embeddings:
                combined_embeddings = np.vstack(all_embeddings)
                
                # Create master index
                self.master_index = faiss.IndexFlatIP(self.embedding_service.dimension)
                self.master_index.add(combined_embeddings)
                
                logger.info(f"Master index rebuilt with {len(self.master_chunks)} total chunks from {len(self.document_indices)} documents")
            
        except Exception as e:
            logger.error(f"Failed to rebuild master index: {str(e)}")
            self.master_index = None
    
    def search_across_documents(self, query: str, k_total: int = 8, file_ids: Optional[List[str]] = None) -> List[Dict]:
        """
        Search across multiple documents
        
        Args:
            query: Search query
            k_total: Total number of chunks to return across all documents
            file_ids: Optional list of specific document IDs to search (None = search all)
            
        Returns:
            List of search results with document attribution
        """
        try:
            if not self.master_index or not self.master_chunks:
                logger.warning("No documents in collection for search")
                return []
            
            # Generate query embedding
            query_embedding = self.embedding_service.create_embeddings([query])
            faiss.normalize_L2(query_embedding)
            
            # Search in master index
            scores, indices = self.master_index.search(query_embedding, min(k_total * 2, len(self.master_chunks)))
            
            # Process results
            results = []
            seen_documents = set()
            
            for score, idx in zip(scores[0], indices[0]):
                if len(results) >= k_total:
                    break
                
                if 0 <= idx < len(self.master_chunks):
                    chunk_data = self.master_chunks[idx]
                    file_id = chunk_data["file_id"]
                    
                    # Filter by specific file_ids if provided
                    if file_ids and file_id not in file_ids:
                        continue
                    
                    # Add document tracking
                    seen_documents.add(file_id)
                    
                    results.append({
                        "text": chunk_data["text"],
                        "score": float(score),
                        "file_id": file_id,
                        "document_name": chunk_data["document_name"],
                        "chunk_id": chunk_data["local_chunk_id"],
                        "preview": chunk_data["text"][:200] + "..." if len(chunk_data["text"]) > 200 else chunk_data["text"]
                    })
            
            logger.info(f"Cross-document search returned {len(results)} chunks from {len(seen_documents)} documents")
            return results
            
        except Exception as e:
            logger.error(f"Cross-document search failed: {str(e)}")
            return []
    
    def generate_cross_document_answer(self, query: str, file_ids: Optional[List[str]] = None, k_total: int = 8) -> Dict:
        """
        Generate an answer based on multiple documents
        
        Args:
            query: User's question
            file_ids: Optional list of specific documents to query
            k_total: Total chunks to use from all documents
            
        Returns:
            Dictionary with answer and metadata
        """
        start_time = time.time()
        
        try:
            # Search across documents
            search_results = self.search_across_documents(query, k_total, file_ids)
            
            if not search_results:
                return {
                    "query": query,
                    "answer": "I couldn't find relevant information across the available documents to answer your question.",
                    "sources": [],
                    "documents_searched": 0,
                    "document_names": [],
                    "processing_time": time.time() - start_time,
                    "llm_used": False
                }
            
            # Group results by document for context
            docs_involved = {}
            for result in search_results:
                file_id = result["file_id"]
                if file_id not in docs_involved:
                    docs_involved[file_id] = {
                        "name": result["document_name"],
                        "chunks": []
                    }
                docs_involved[file_id]["chunks"].append(result)
            
            # Build cross-document context
            context = self._build_cross_document_context(search_results, docs_involved)
            
            # Generate answer using LLM
            document_names = [doc["name"] for doc in docs_involved.values()]
            llm_result = self.llm_service.generate_answer(
                query, 
                [(result["text"], result["score"]) for result in search_results],
                f"Multiple documents: {', '.join(document_names)}"
            )
            
            # Format sources with document attribution
            sources = []
            for result in search_results:
                sources.append({
                    "text": result["text"],
                    "relevance_score": result["score"],
                    "document_name": result["document_name"],
                    "file_id": result["file_id"],
                    "chunk_id": result["chunk_id"],
                    "preview": result["preview"]
                })
            
            return {
                "query": query,
                "answer": llm_result["answer"],
                "sources": sources,
                "documents_searched": len(docs_involved),
                "document_names": document_names,
                "processing_time": time.time() - start_time,
                "llm_used": True,
                "llm_provider": llm_result.get("provider"),
                "llm_model": llm_result.get("model")
            }
            
        except Exception as e:
            logger.error(f"Cross-document answer generation failed: {str(e)}")
            return {
                "query": query,
                "answer": f"I encountered an error while processing your multi-document query: {str(e)}",
                "sources": [],
                "documents_searched": 0,
                "document_names": [],
                "processing_time": time.time() - start_time,
                "llm_used": False
            }
    
    def _build_cross_document_context(self, search_results: List[Dict], docs_involved: Dict) -> str:
        """Build formatted context for cross-document analysis"""
        context_parts = []
        
        for file_id, doc_info in docs_involved.items():
            context_parts.append(f"\n--- From: {doc_info['name']} ---")
            
            for chunk in doc_info["chunks"][:3]:  # Max 3 chunks per document
                context_parts.append(f"[Relevance: {chunk['score']:.2f}] {chunk['text']}")
        
        return "\n\n".join(context_parts)
    
    def get_collection_summary(self) -> Dict:
        """
        Get summary of the multi-document collection
        
        Returns:
            Dictionary with collection statistics
        """
        total_chunks = sum(len(doc_data["chunks"]) for doc_data in self.document_indices.values())
        
        documents = []
        for file_id, doc_data in self.document_indices.items():
            documents.append({
                "file_id": file_id,
                "name": doc_data["metadata"]["original_filename"],
                "chunks_count": len(doc_data["chunks"]),
                "added_at": doc_data["added_at"].isoformat(),
                "file_size": doc_data["metadata"].get("file_size", 0)
            })
        
        return {
            "total_documents": len(self.document_indices),
            "total_chunks": total_chunks,
            "documents": documents
        }
    
    def get_document_similarities(self, file_id: str, k: int = 5) -> List[Dict]:
        """
        Find documents most similar to the given document
        
        Args:
            file_id: ID of the document to compare
            k: Number of similar documents to return
            
        Returns:
            List of similar documents with similarity scores
        """
        try:
            if file_id not in self.document_indices:
                return []
            
            target_doc = self.document_indices[file_id]
            target_embedding = np.mean(target_doc["embeddings"], axis=0, keepdims=True)
            
            similarities = []
            for other_id, other_doc in self.document_indices.items():
                if other_id == file_id:
                    continue
                
                other_embedding = np.mean(other_doc["embeddings"], axis=0, keepdims=True)
                
                # Calculate cosine similarity
                similarity = np.dot(target_embedding, other_embedding.T) / (
                    np.linalg.norm(target_embedding) * np.linalg.norm(other_embedding)
                )
                
                similarities.append({
                    "file_id": other_id,
                    "document_name": other_doc["metadata"]["original_filename"],
                    "similarity_score": float(similarity[0][0]),
                    "chunks_count": len(other_doc["chunks"])
                })
            
            # Sort by similarity and return top k
            similarities.sort(key=lambda x: x["similarity_score"], reverse=True)
            return similarities[:k]
            
        except Exception as e:
            logger.error(f"Failed to calculate document similarities: {str(e)}")
            return []
    
    def clear_collection(self):
        """Clear all documents from the collection"""
        self.document_indices = {}
        self.master_index = None
        self.master_chunks = []
        self.chunk_to_doc_mapping = []
        logger.info("Multi-document collection cleared")