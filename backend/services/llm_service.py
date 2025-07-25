# services/llm_service.py
import google.generativeai as genai
import os
from typing import List, Tuple, Dict
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)

class LLMService:
    """Streamlined LLM service using Google Gemini 1.5 Flash"""
    
    def __init__(self):
        """Initialize LLM service with Gemini 1.5 Flash"""
        self.provider = "gemini"
        self.model = "gemini-1.5-flash"
        self.setup_gemini()
    
    def setup_gemini(self):
        """Setup Google Gemini API"""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables. Please add it to your .env file.")
        
        genai.configure(api_key=api_key)
        self.gemini_model = genai.GenerativeModel(self.model)
        
        logger.info(f"✅ Gemini 1.5 Flash initialized successfully")
    
    def generate_answer(self, query: str, context_chunks: List[Tuple[str, float]], 
                       document_name: str = "") -> Dict:
        """
        Generate intelligent answer using Gemini 1.5 Flash
        
        Args:
            query: User's question
            context_chunks: List of (text, relevance_score) tuples
            document_name: Name of the document for context
            
        Returns:
            Dict with answer, sources, and metadata
        """
        try:
            # Build context from chunks
            context = self._build_context(context_chunks)
            
            # Generate optimized prompt for Gemini
            prompt = self._build_prompt(query, context, document_name)
            
            # Get response from Gemini
            response = self._query_gemini(prompt)
            
            return {
                "answer": response,
                "context_used": len(context_chunks),
                "provider": self.provider,
                "model": self.model
            }
            
        except Exception as e:
            logger.error(f"Gemini generation failed: {str(e)}")
            # Fallback to basic summary
            return self._fallback_answer(query, context_chunks)
    
    def _build_context(self, context_chunks: List[Tuple[str, float]]) -> str:
        """Build formatted context from retrieved chunks"""
        if not context_chunks:
            return "No relevant context found."
        
        context_parts = []
        for i, (text, score) in enumerate(context_chunks[:5]):  # Limit to top 5 chunks
            context_parts.append(f"Context {i+1} (Relevance: {score:.2f}):\n{text.strip()}")
        
        return "\n\n".join(context_parts)
    
    def _build_prompt(self, query: str, context: str, document_name: str) -> str:
        """Build optimized prompt for Gemini 1.5 Flash"""
        prompt = f"""You are an intelligent document assistant. Answer the user's question based ONLY on the provided context from the document.

Document: {document_name if document_name else "User's document"}

Context from the document:
{context}

User Question: {query}

Instructions:
1. Answer the question directly and comprehensively using ONLY the provided context
2. If the context doesn't contain enough information, clearly state what's missing
3. Be specific and cite relevant details from the context
4. Use a helpful, professional tone
5. If asked for a summary, provide a well-structured overview
6. If multiple context sections are relevant, synthesize them coherently
7. Don't make up information not present in the context
8. Keep your response concise but complete
9. Format your response in a clear, readable way

Answer:"""
        
        return prompt
    
    def _query_gemini(self, prompt: str) -> str:
        """Query Google Gemini 1.5 Flash API"""
        try:
            # Configure generation parameters optimized for document Q&A
            generation_config = genai.types.GenerationConfig(
                temperature=0.1,  # Low temperature for consistent, factual answers
                top_p=0.9,
                top_k=40,
                max_output_tokens=1000,  # Allow longer responses
                stop_sequences=[]
            )
            
            # Safety settings optimized for document analysis
            safety_settings = [
                {
                    "category": "HARM_CATEGORY_HARASSMENT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_HATE_SPEECH", 
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
            
            # Generate response
            response = self.gemini_model.generate_content(
                prompt,
                generation_config=generation_config,
                safety_settings=safety_settings
            )
            
            # Check if response was blocked
            if response.prompt_feedback:
                if hasattr(response.prompt_feedback, 'block_reason'):
                    raise Exception(f"Content blocked by safety filters: {response.prompt_feedback.block_reason}")
            
            # Extract text from response
            if response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'content') and candidate.content.parts:
                    generated_text = candidate.content.parts[0].text.strip()
                    if generated_text:
                        return generated_text
                    else:
                        raise Exception("Empty response generated")
                else:
                    raise Exception("No content in response candidate")
            else:
                raise Exception("No candidates in response")
            
        except Exception as e:
            logger.error(f"Gemini API error: {str(e)}")
            raise Exception(f"Gemini API error: {str(e)}")
    
    def _fallback_answer(self, query: str, context_chunks: List[Tuple[str, float]]) -> Dict:
        """Fallback when Gemini fails - return organized chunks"""
        if not context_chunks:
            answer = "I couldn't find relevant information in the document to answer your question. Please try rephrasing your question or ask about different topics covered in the document."
        else:
            answer = f"I encountered an issue generating a response, but here are the most relevant sections from the document for your question '{query}':\n\n"
            
            for i, (text, score) in enumerate(context_chunks[:3]):
                answer += f"**Section {i+1}** (Relevance: {score*100:.1f}%)\n{text}\n\n"
        
        return {
            "answer": answer,
            "context_used": len(context_chunks),
            "provider": "fallback",
            "model": "none"
        }
    
    def classify_query_type(self, query: str) -> str:
        """Classify the type of query to optimize response"""
        query_lower = query.lower()
        
        if any(word in query_lower for word in ['summary', 'summarize', 'overview', 'main points', 'key points']):
            return "summary"
        elif any(word in query_lower for word in ['what is', 'define', 'explain', 'describe', 'tell me about']):
            return "explanation"
        elif any(word in query_lower for word in ['how', 'process', 'steps', 'method', 'procedure']):
            return "process"
        elif any(word in query_lower for word in ['why', 'reason', 'cause', 'because', 'rationale']):
            return "reasoning"
        elif any(word in query_lower for word in ['when', 'date', 'time', 'schedule', 'timeline']):
            return "temporal"
        elif any(word in query_lower for word in ['who', 'person', 'people', 'author', 'name']):
            return "entity"
        elif any(word in query_lower for word in ['compare', 'difference', 'versus', 'vs', 'contrast']):
            return "comparison"
        else:
            return "general"
    
    def get_provider_status(self) -> Dict:
        """Check if Gemini is available and working"""
        try:
            # Test Gemini with a simple query
            test_response = self.gemini_model.generate_content(
                "Hello, please respond with just 'OK' to confirm you're working.",
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                    max_output_tokens=10
                )
            )
            
            if test_response.candidates and test_response.candidates[0].content.parts:
                response_text = test_response.candidates[0].content.parts[0].text.strip()
                if "OK" in response_text.upper():
                    return {
                        "status": "available",
                        "provider": self.provider,
                        "model": self.model,
                        "message": "Gemini 1.5 Flash is ready!"
                    }
                else:
                    return {
                        "status": "available",
                        "provider": self.provider,
                        "model": self.model,
                        "message": "Gemini responded but test failed",
                        "response": response_text
                    }
            else:
                raise Exception("No response from Gemini test")
                
        except Exception as e:
            return {
                "status": "unavailable",
                "provider": self.provider,
                "model": self.model,
                "error": str(e),
                "message": "Please check your GEMINI_API_KEY in .env file"
            }