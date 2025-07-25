# services/embedding_service.py

from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from typing import List, Tuple, Optional
import pickle
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmbeddingService:
    """
    Handles text embeddings and vector search for the MVP
    
    This is STEP 2 of our pipeline:
    Text Chunks -> Generate Embeddings -> Build Vector Index -> Search Similar
    """
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize embedding service
        
        Args:
            model_name: Sentence transformer model to use
                       "all-MiniLM-L6-v2" is fast, lightweight, and good quality
        """
        self.model_name = model_name
        self.dimension = 384  # Dimension for all-MiniLM-L6-v2
        self.model = None  # Lazy loading
        self.index = None
        self.chunks = []
        self.index_loaded = False
        
        logger.info(f"EmbeddingService initialized with model: {model_name}")
    
    def _load_model(self):
        """Lazy load the sentence transformer model"""
        if self.model is None:
            logger.info(f"Loading sentence transformer model: {self.model_name}")
            try:
                self.model = SentenceTransformer(self.model_name)
                logger.info("Model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load model: {str(e)}")
                raise Exception(f"Could not load embedding model: {str(e)}")
    
    def create_embeddings(self, texts: List[str]) -> np.ndarray:
        """
        Generate embeddings for a list of texts
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            Numpy array of embeddings
        """
        self._load_model()
        
        logger.info(f"Creating embeddings for {len(texts)} texts...")
        
        try:
            # Generate embeddings
            embeddings = self.model.encode(
                texts, 
                convert_to_numpy=True,
                show_progress_bar=True,
                batch_size=32  # Process in batches for memory efficiency
            )
            
            logger.info(f"Successfully created embeddings with shape: {embeddings.shape}")
            return embeddings
            
        except Exception as e:
            logger.error(f"Error creating embeddings: {str(e)}")
            raise Exception(f"Failed to create embeddings: {str(e)}")
    
    def build_vector_index(self, chunks: List[str]) -> None:
        """
        Build FAISS vector index from text chunks
        
        Args:
            chunks: List of text chunks to index
        """
        logger.info(f"Building vector index for {len(chunks)} chunks...")
        
        if not chunks:
            raise Exception("Cannot build index from empty chunks list")
        
        try:
            # Store chunks
            self.chunks = chunks
            
            # Generate embeddings
            embeddings = self.create_embeddings(chunks)
            
            # Create FAISS index (Inner Product for cosine similarity)
            self.index = faiss.IndexFlatIP(self.dimension)
            
            # Normalize embeddings for cosine similarity
            faiss.normalize_L2(embeddings)
            
            # Add embeddings to index
            self.index.add(embeddings)
            
            self.index_loaded = True
            logger.info(f"Vector index built successfully with {self.index.ntotal} vectors")
            
        except Exception as e:
            logger.error(f"Error building vector index: {str(e)}")
            raise Exception(f"Failed to build vector index: {str(e)}")
    
    def search_similar(self, query: str, k: int = 5) -> List[Tuple[str, float]]:
        """
        Search for similar chunks using vector similarity
        
        Args:
            query: Query string to search for
            k: Number of similar chunks to return
            
        Returns:
            List of tuples (chunk_text, similarity_score)
        """
        if self.index is None or not self.index_loaded:
            raise Exception("Vector index not built. Call build_vector_index() first.")
        
        if k > len(self.chunks):
            k = len(self.chunks)
        
        logger.info(f"Searching for top {k} similar chunks for query: '{query[:50]}...'")
        
        try:
            # Generate query embedding
            query_embedding = self.create_embeddings([query])
            
            # Normalize query embedding
            faiss.normalize_L2(query_embedding)
            
            # Search for similar vectors
            scores, indices = self.index.search(query_embedding, k)
            
            # Format results
            results = []
            for score, idx in zip(scores[0], indices[0]):
                if 0 <= idx < len(self.chunks):
                    results.append((self.chunks[idx], float(score)))
            
            logger.info(f"Found {len(results)} similar chunks")
            return results
            
        except Exception as e:
            logger.error(f"Error searching similar chunks: {str(e)}")
            raise Exception(f"Failed to search similar chunks: {str(e)}")
    
    def save_index(self, filename: str) -> None:
        """
        Save vector index and chunks to disk
        
        Args:
            filename: Base filename (without extension)
        """
        if self.index is None:
            raise Exception("No index to save. Build index first.")
        
        try:
            logger.info(f"Saving index to: {filename}")
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(filename) if os.path.dirname(filename) else ".", exist_ok=True)
            
            # Save FAISS index
            index_file = f"{filename}.index"
            faiss.write_index(self.index, index_file)
            
            # Save chunks separately
            chunks_file = f"{filename}.chunks"
            with open(chunks_file, "wb") as f:
                pickle.dump(self.chunks, f)
            
            # Save metadata
            metadata_file = f"{filename}.meta"
            metadata = {
                "model_name": self.model_name,
                "dimension": self.dimension,
                "chunk_count": len(self.chunks),
                "index_size": self.index.ntotal
            }
            with open(metadata_file, "wb") as f:
                pickle.dump(metadata, f)
            
            logger.info(f"Index saved successfully to {filename}.*")
            
        except Exception as e:
            logger.error(f"Error saving index: {str(e)}")
            raise Exception(f"Failed to save index: {str(e)}")
    
    def load_index(self, filename: str) -> bool:
        """
        Load vector index and chunks from disk
        
        Args:
            filename: Base filename (without extension)
            
        Returns:
            True if loaded successfully, False otherwise
        """
        try:
            logger.info(f"Loading index from: {filename}")
            
            index_file = f"{filename}.index"
            chunks_file = f"{filename}.chunks"
            metadata_file = f"{filename}.meta"
            
            # Check if all files exist
            if not all(os.path.exists(f) for f in [index_file, chunks_file]):
                logger.warning(f"Index files not found: {filename}")
                return False
            
            # Load FAISS index
            self.index = faiss.read_index(index_file)
            
            # Load chunks
            with open(chunks_file, "rb") as f:
                self.chunks = pickle.load(f)
            
            # Load metadata if available
            if os.path.exists(metadata_file):
                with open(metadata_file, "rb") as f:
                    metadata = pickle.load(f)
                    logger.info(f"Loaded index metadata: {metadata}")
            
            self.index_loaded = True
            logger.info(f"Index loaded successfully: {len(self.chunks)} chunks, {self.index.ntotal} vectors")
            return True
            
        except Exception as e:
            logger.error(f"Error loading index: {str(e)}")
            self.index = None
            self.chunks = []
            self.index_loaded = False
            return False
    
    def get_index_stats(self) -> dict:
        """
        Get statistics about the current index
        
        Returns:
            Dictionary with index statistics
        """
        if not self.index_loaded:
            return {"status": "not_loaded"}
        
        return {
            "status": "loaded",
            "model_name": self.model_name,
            "dimension": self.dimension,
            "total_chunks": len(self.chunks),
            "total_vectors": self.index.ntotal if self.index else 0,
            "index_type": type(self.index).__name__ if self.index else None
        }
    
    def clear_index(self) -> None:
        """Clear the current index from memory"""
        logger.info("Clearing index from memory")
        self.index = None
        self.chunks = []
        self.index_loaded = False

# ============================================================================
# TESTING FUNCTIONALITY (OPTIONAL - FOR DEVELOPMENT)
# ============================================================================

if __name__ == "__main__":
    # Test the embedding service
    
    # Sample text chunks for testing
    test_chunks = [
        "The quick brown fox jumps over the lazy dog. This is a classic pangram used in typography.",
        "Machine learning is a subset of artificial intelligence that focuses on algorithms that can learn from data.",
        "Python is a high-level programming language known for its simplicity and readability.",
        "Natural language processing involves teaching computers to understand and generate human language.",
        "Vector databases are specialized databases designed to store and query high-dimensional vectors efficiently."
    ]
    
    print("Testing Embedding Service...")
    
    try:
        # Initialize service
        embedding_service = EmbeddingService()
        
        # Test building index
        print("Building vector index...")
        embedding_service.build_vector_index(test_chunks)
        
        # Test search
        test_query = "What is machine learning?"
        print(f"Searching for: '{test_query}'")
        
        results = embedding_service.search_similar(test_query, k=3)
        
        print("Results:")
        for i, (text, score) in enumerate(results):
            print(f"{i+1}. Score: {score:.3f}")
            print(f"   Text: {text[:100]}...")
            print()
        
        # Test save/load
        test_filename = "test_index"
        print("Testing save/load...")
        
        embedding_service.save_index(test_filename)
        print("Index saved successfully")
        
        # Clear and reload
        embedding_service.clear_index()
        loaded = embedding_service.load_index(test_filename)
        
        if loaded:
            print("Index loaded successfully")
            
            # Test search again
            results2 = embedding_service.search_similar(test_query, k=2)
            print(f"Search after reload returned {len(results2)} results")
        else:
            print("Failed to load index")
        
        # Clean up test files
        import os
        for ext in ['.index', '.chunks', '.meta']:
            file_path = f"{test_filename}{ext}"
            if os.path.exists(file_path):
                os.remove(file_path)
        
        print("Test completed successfully!")
        
    except Exception as e:
        print(f"Test failed: {e}")