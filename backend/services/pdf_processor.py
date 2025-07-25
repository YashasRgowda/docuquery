# services/pdf_processor.py

import fitz  # PyMuPDF
from typing import List
import re
import logging
import os

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PDFProcessor:
    """
    Handles PDF text extraction and text chunking for the MVP
    
    This is STEP 1 of our pipeline:
    PDF File -> Extract Text -> Clean Text -> Split into Chunks
    """
    
    def __init__(self, chunk_size: int = 500, overlap: int = 50):
        """
        Initialize PDF processor
        
        Args:
            chunk_size: Number of words per chunk
            overlap: Number of words to overlap between chunks
        """
        self.chunk_size = chunk_size
        self.overlap = overlap
        logger.info(f"PDFProcessor initialized with chunk_size={chunk_size}, overlap={overlap}")
    
    def extract_text(self, pdf_path: str) -> str:
        """
        Extract raw text from PDF file
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Extracted text as string
        """
        try:
            logger.info(f"Extracting text from: {pdf_path}")
            
            # Check if file exists
            if not os.path.exists(pdf_path):
                raise Exception(f"PDF file not found: {pdf_path}")
            
            # Open PDF document
            doc = fitz.open(pdf_path)
            text = ""
            page_count = len(doc)
            
            logger.info(f"PDF has {page_count} pages")
            
            # Extract text from each page
            for page_num in range(page_count):
                try:
                    page = doc[page_num]
                    page_text = page.get_text()
                    
                    # Add page separator for context
                    text += f"\n--- Page {page_num + 1} ---\n"
                    text += page_text
                    text += "\n"
                    
                except Exception as page_error:
                    logger.warning(f"Error extracting from page {page_num + 1}: {str(page_error)}")
                    continue
            
            doc.close()
            
            logger.info(f"Successfully extracted {len(text)} characters from {page_count} pages")
            
            if len(text.strip()) < 10:
                raise Exception("PDF appears to be empty or contains only images. No extractable text found.")
            
            return text
            
        except Exception as e:
            logger.error(f"Error extracting text from {pdf_path}: {str(e)}")
            raise Exception(f"Failed to extract text from PDF: {str(e)}")
    
    def clean_text(self, text: str) -> str:
        """
        Clean and normalize extracted text
        
        Args:
            text: Raw extracted text
            
        Returns:
            Cleaned text
        """
        logger.info("Cleaning extracted text...")
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove page separators for cleaner chunks
        text = re.sub(r'\n--- Page \d+ ---\n', '\n\n', text)
        
        # Fix common PDF extraction issues
        text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)  # Add space between camelCase
        text = re.sub(r'([.!?])([A-Z])', r'\1 \2', text)  # Add space after punctuation
        
        # Remove excessive newlines
        text = re.sub(r'\n\n+', '\n\n', text)
        
        # Strip and return
        cleaned = text.strip()
        
        logger.info(f"Text cleaned. Length: {len(cleaned)} characters")
        return cleaned
    
    def chunk_text(self, text: str) -> List[str]:
        """
        Split text into overlapping chunks
        
        Args:
            text: Clean text to chunk
            
        Returns:
            List of text chunks
        """
        logger.info(f"Chunking text with chunk_size={self.chunk_size}, overlap={self.overlap}")
        
        # Split into words
        words = text.split()
        
        if len(words) <= self.chunk_size:
            logger.info("Text is smaller than chunk size, returning as single chunk")
            return [text] if text.strip() else []
        
        chunks = []
        
        # Create overlapping chunks
        for i in range(0, len(words), self.chunk_size - self.overlap):
            chunk_words = words[i:i + self.chunk_size]
            chunk_text = ' '.join(chunk_words)
            
            # Only add chunks with substantial content
            if len(chunk_text.strip()) > 50:  # Minimum 50 characters
                chunks.append(chunk_text.strip())
            
            # Break if we've reached the end
            if i + self.chunk_size >= len(words):
                break
        
        logger.info(f"Created {len(chunks)} chunks from text")
        return chunks
    
    def process_pdf(self, pdf_path: str) -> List[str]:
        """
        Full pipeline: Extract -> Clean -> Chunk
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            List of processed text chunks ready for embedding
        """
        logger.info(f"Starting full PDF processing pipeline for: {pdf_path}")
        
        try:
            # Step 1: Extract text
            raw_text = self.extract_text(pdf_path)
            
            if not raw_text.strip():
                raise Exception("No text could be extracted from the PDF")
            
            # Step 2: Clean text
            clean_text = self.clean_text(raw_text)
            
            # Step 3: Create chunks
            chunks = self.chunk_text(clean_text)
            
            if not chunks:
                raise Exception("No valid chunks could be created from the text")
            
            logger.info(f"PDF processing completed successfully. Generated {len(chunks)} chunks")
            return chunks
            
        except Exception as e:
            logger.error(f"PDF processing failed: {str(e)}")
            raise e
    
    def get_processing_stats(self, pdf_path: str) -> dict:
        """
        Get statistics about a PDF without full processing
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            Dictionary with PDF statistics
        """
        try:
            doc = fitz.open(pdf_path)
            
            stats = {
                "page_count": len(doc),
                "file_size_mb": round(os.path.getsize(pdf_path) / (1024 * 1024), 2),
                "has_text": False,
                "estimated_chunks": 0
            }
            
            # Check if PDF has extractable text
            sample_text = ""
            for page_num in range(min(3, len(doc))):  # Check first 3 pages
                page_text = doc[page_num].get_text()
                sample_text += page_text
            
            if sample_text.strip():
                stats["has_text"] = True
                word_count = len(sample_text.split())
                stats["estimated_chunks"] = max(1, word_count // self.chunk_size)
            
            doc.close()
            return stats
            
        except Exception as e:
            logger.error(f"Error getting PDF stats: {str(e)}")
            return {"error": str(e)}

# ============================================================================
# TESTING FUNCTIONALITY (OPTIONAL - FOR DEVELOPMENT)
# ============================================================================

if __name__ == "__main__":
    # Test the PDF processor
    import os
    
    processor = PDFProcessor()
    
    # Test with a sample PDF (you'll need to provide your own)
    test_pdf = "test_document.pdf"
    
    if os.path.exists(test_pdf):
        try:
            print("Testing PDF Processor...")
            chunks = processor.process_pdf(test_pdf)
            print(f"Successfully processed PDF into {len(chunks)} chunks")
            
            # Show first chunk as example
            if chunks:
                print(f"\nFirst chunk preview:")
                print(chunks[0][:200] + "...")
                
        except Exception as e:
            print(f"Test failed: {e}")
    else:
        print(f"Test PDF not found: {test_pdf}")
        print("PDF Processor class is ready for use!")