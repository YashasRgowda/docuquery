// lib/api.js
// API functions to communicate with our FastAPI backend

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

// API Functions

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
 * Query the processed document
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

// Export default API object with all functions
const apiService = {
  healthCheck,
  uploadPDF,
  processPDF,
  queryDocument,
  getDocumentInfo,
  listDocuments,
  deleteDocument,
  validatePDFFile,
  formatFileSize,
  truncateText,
};

export default apiService;