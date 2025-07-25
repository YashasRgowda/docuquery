# services/query_processor.py
from typing import Dict, List, Tuple
import time
import logging

logger = logging.getLogger(__name__)

class QueryProcessor:
    """Enhanced query processing with LLM integration"""
    
    def __init__(self, embedding_service, llm_service):
        self.embedding_service = embedding_service
        self.llm_service = llm_service
    
    def process_query(self, query: str, file_id: str, k: int = 5, 
                     document_name: str = "") -> Dict:
        """
        Process user query with enhanced LLM-powered responses
        
        Args:
            query: User's question
            file_id: Document identifier
            k: Number of chunks to retrieve
            document_name: Original filename for context
            
        Returns:
            Enhanced response with LLM-generated answer
        """
        start_time = time.time()
        
        try:
            # Step 1: Classify query type
            query_type = self.llm_service.classify_query_type(query)
            logger.info(f"Query classified as: {query_type}")
            
            # Step 2: Adjust retrieval parameters based on query type
            adjusted_k = self._adjust_k_for_query_type(query_type, k)
            
            # Step 3: Retrieve relevant chunks
            chunks = self.embedding_service.search_similar(query, adjusted_k)
            
            if not chunks:
                return {
                    "query": query,
                    "answer": "I couldn't find any relevant information in the document to answer your question. Please try rephrasing your question or asking about different topics covered in the document.",
                    "sources": [],
                    "processing_time": time.time() - start_time,
                    "query_type": query_type,
                    "chunks_retrieved": 0,
                    "llm_used": False
                }
            
            # Step 4: Generate intelligent answer using LLM
            llm_result = self.llm_service.generate_answer(
                query, chunks, document_name
            )
            
            # Step 5: Format sources
            sources = self._format_sources(chunks)
            
            processing_time = time.time() - start_time
            
            return {
                "query": query,
                "answer": llm_result["answer"],
                "sources": sources,
                "processing_time": processing_time,
                "query_type": query_type,
                "chunks_retrieved": len(chunks),
                "llm_used": True,
                "llm_provider": llm_result.get("provider"),
                "llm_model": llm_result.get("model")
            }
            
        except Exception as e:
            logger.error(f"Query processing failed: {str(e)}")
            
            # Fallback to basic retrieval
            try:
                chunks = self.embedding_service.search_similar(query, k)
                fallback_result = self.llm_service._fallback_answer(query, chunks)
                
                return {
                    "query": query,
                    "answer": fallback_result["answer"],
                    "sources": self._format_sources(chunks),
                    "processing_time": time.time() - start_time,
                    "query_type": "unknown",
                    "chunks_retrieved": len(chunks),
                    "llm_used": False,
                    "error": str(e)
                }
            except Exception as fallback_error:
                return {
                    "query": query,
                    "answer": f"I encountered an error processing your question: {str(e)}",
                    "sources": [],
                    "processing_time": time.time() - start_time,
                    "query_type": "unknown",
                    "chunks_retrieved": 0,
                    "llm_used": False,
                    "error": str(fallback_error)
                }
    
    def _adjust_k_for_query_type(self, query_type: str, default_k: int) -> int:
        """Adjust number of chunks based on query type"""
        adjustments = {
            "summary": default_k + 2,  # More context for summaries
            "explanation": default_k + 1,  # More context for explanations
            "process": default_k + 1,  # More context for processes
            "reasoning": default_k + 1,  # More context for reasoning
            "temporal": default_k,  # Standard for temporal queries
            "entity": default_k,  # Standard for entity queries
            "general": default_k  # Standard for general queries
        }
        
        return min(adjustments.get(query_type, default_k), 8)  # Max 8 chunks
    
    def _format_sources(self, chunks: List[Tuple[str, float]]) -> List[Dict]:
        """Format chunks as sources for frontend"""
        sources = []
        for i, (text, score) in enumerate(chunks):
            sources.append({
                "chunk_id": i + 1,
                "text": text,
                "relevance_score": round(float(score), 3),
                "preview": text[:200] + "..." if len(text) > 200 else text
            })
        
        return sources