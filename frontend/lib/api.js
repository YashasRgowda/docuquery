// lib/api.js - Enhanced with Multi-Document Features
import axios from 'axios';

// Base URL for your FastAPI backend
const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// EXISTING SINGLE-DOCUMENT API FUNCTIONS
// ============================================================================

/**
 * Health check - Test if backend is running
 * @returns {Promise} API response
 */
export const healthCheck = async () => {
  try {
    const response = await api.get('/');
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

/**
 * Upload a PDF file
 * @param {File} file - PDF file to upload
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise} Upload response with file_id
 */
export const uploadPDF = async (file, onProgress = null) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };

    // Add progress tracking if callback provided
    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      };
    }

    const response = await api.post('/upload-pdf', formData, config);
    
    return {
      success: true,
      data: response.data,
      fileId: response.data.file_id,
      filename: response.data.filename,
    };
  } catch (error) {
    console.error('PDF upload failed:', error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

/**
 * Process uploaded PDF (extract text, create embeddings)
 * @param {string} fileId - File ID from upload response
 * @returns {Promise} Processing response
 */
export const processPDF = async (fileId) => {
  try {
    const response = await api.post('/process-pdf', {
      file_id: fileId,
    });
    
    return {
      success: true,
      data: response.data,
      chunksCount: response.data.chunks_count,
      processingTime: response.data.processing_time,
    };
  } catch (error) {
    console.error('PDF processing failed:', error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

/**
 * Query a single document
 * @param {string} query - Question to ask about the document
 * @param {string} fileId - File ID of processed document
 * @param {number} k - Number of relevant chunks to return (default: 3)
 * @returns {Promise} Query response with answer and sources
 */
export const queryDocument = async (query, fileId, k = 3) => {
  try {
    const response = await api.post('/query', {
      query: query,
      file_id: fileId,
      k: k,
    });
    
    return {
      success: true,
      data: response.data,
      answer: response.data.answer,
      sources: response.data.sources,
      processingTime: response.data.processing_time,
    };
  } catch (error) {
    console.error('Document query failed:', error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

/**
 * Get document information
 * @param {string} fileId - File ID
 * @returns {Promise} Document info response
 */
export const getDocumentInfo = async (fileId) => {
  try {
    const response = await api.get(`/document/${fileId}`);
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Get document info failed:', error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

/**
 * Get list of all documents
 * @returns {Promise} List of documents response
 */
export const listDocuments = async () => {
  try {
    const response = await api.get('/documents');
    
    return {
      success: true,
      data: response.data,
      documents: response.data.documents,
      totalDocuments: response.data.total_documents,
    };
  } catch (error) {
    console.error('List documents failed:', error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

/**
 * Delete a document
 * @param {string} fileId - File ID to delete
 * @returns {Promise} Delete response
 */
export const deleteDocument = async (fileId) => {
  try {
    const response = await api.delete(`/document/${fileId}`);
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Delete document failed:', error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

// ============================================================================
// NEW MULTI-DOCUMENT API FUNCTIONS
// ============================================================================

/**
 * Add a document to the multi-document collection
 * @param {string} fileId - File ID of processed document
 * @returns {Promise} Add to collection response
 */
export const addToCollection = async (fileId) => {
  try {
    const response = await api.post(`/add-to-collection/${fileId}`);
    
    return {
      success: true,
      data: response.data,
      message: response.data.message,
      collectionSize: response.data.collection_size,
    };
  } catch (error) {
    console.error('Add to collection failed:', error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

/**
 * Remove a document from the multi-document collection
 * @param {string} fileId - File ID to remove
 * @returns {Promise} Remove from collection response
 */
export const removeFromCollection = async (fileId) => {
  try {
    const response = await api.delete(`/collection/${fileId}`);
    
    return {
      success: true,
      data: response.data,
      message: response.data.message,
      collectionSize: response.data.collection_size,
    };
  } catch (error) {
    console.error('Remove from collection failed:', error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

/**
 * Get multi-document collection summary
 * @returns {Promise} Collection summary with all documents
 */
export const getCollectionSummary = async () => {
  try {
    const response = await api.get('/collection-summary');
    
    return {
      success: true,
      data: response.data,
      totalDocuments: response.data.total_documents,
      totalChunks: response.data.total_chunks,
      documents: response.data.documents,
    };
  } catch (error) {
    console.error('Get collection summary failed:', error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

/**
 * Query across multiple documents
 * @param {string} query - Question to ask across documents
 * @param {Array} fileIds - Optional array of specific file IDs to search (null = search all)
 * @param {number} kTotal - Total number of chunks to retrieve across all documents
 * @returns {Promise} Multi-document query response
 */
export const queryMultipleDocuments = async (query, fileIds = null, kTotal = 8) => {
  try {
    const response = await api.post('/query-multi', {
      query: query,
      file_ids: fileIds,
      k_total: kTotal,
    });
    
    return {
      success: true,
      data: response.data,
      answer: response.data.answer,
      sources: response.data.sources,
      documentsSearched: response.data.documents_searched,
      documentNames: response.data.document_names,
      processingTime: response.data.processing_time,
      llmUsed: response.data.llm_used,
    };
  } catch (error) {
    console.error('Multi-document query failed:', error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Helper function to validate file before upload
export const validatePDFFile = (file) => {
  const errors = [];
  
  // Check file type
  if (file.type !== 'application/pdf') {
    errors.push('File must be a PDF');
  }
  
  // Check file size (50MB limit)
  const maxSize = 50 * 1024 * 1024; // 50MB in bytes
  if (file.size > maxSize) {
    errors.push('File size must be less than 50MB');
  }
  
  // Check if file name is reasonable
  if (file.name.length > 100) {
    errors.push('File name is too long');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors,
  };
};

// Helper function to format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to truncate text
export const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

// Helper function to format processing time
export const formatProcessingTime = (seconds) => {
  if (seconds < 1) {
    return `${Math.round(seconds * 1000)}ms`;
  }
  return `${seconds.toFixed(2)}s`;
};

// Helper function to get document status badge color
export const getStatusBadgeColor = (status) => {
  switch (status) {
    case 'processed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'processing':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'uploaded':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'error':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Export default API object with all functions
const apiService = {
  // Single document functions
  healthCheck,
  uploadPDF,
  processPDF,
  queryDocument,
  getDocumentInfo,
  listDocuments,
  deleteDocument,
  
  // Multi-document functions
  addToCollection,
  removeFromCollection,
  getCollectionSummary,
  queryMultipleDocuments,
  
  // Utility functions
  validatePDFFile,
  formatFileSize,
  truncateText,
  formatProcessingTime,
  getStatusBadgeColor,
};

export default apiService;