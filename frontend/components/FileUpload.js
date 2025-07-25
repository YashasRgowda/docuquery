// components/FileUpload.js
'use client'

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { uploadPDF, processPDF, validatePDFFile, formatFileSize } from '../lib/api';
import { UploadProgress, ProcessingAnimation, LoadingButton } from './LoadingSpinner';

export default function FileUpload({ onUploadSuccess }) {
  // Component state
  const [uploadState, setUploadState] = useState('idle'); // idle, uploading, processing, success, error
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [error, setError] = useState(null);
  const [processingStage, setProcessingStage] = useState('processing');

  // Reset component state
  const resetState = () => {
    setUploadState('idle');
    setUploadProgress(0);
    setCurrentFile(null);
    setFileId(null);
    setError(null);
    setProcessingStage('processing');
  };

  // Handle file upload and processing
  const handleFileUpload = async (file) => {
    try {
      // Validate file
      const validation = validatePDFFile(file);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        setUploadState('error');
        return;
      }

      setCurrentFile(file);
      setUploadState('uploading');
      setError(null);

      // Step 1: Upload PDF
      const uploadResult = await uploadPDF(file, (progress) => {
        setUploadProgress(progress);
      });

      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      setFileId(uploadResult.fileId);
      setUploadState('processing');
      setProcessingStage('extracting');

      // Step 2: Process PDF
      const processResult = await processPDF(uploadResult.fileId);

      if (!processResult.success) {
        throw new Error(processResult.error);
      }

      // Success!
      setUploadState('success');
      
      // Call parent success handler after a brief delay
      setTimeout(() => {
        onUploadSuccess({
          fileId: uploadResult.fileId,
          filename: uploadResult.filename,
          chunksCount: processResult.chunksCount,
          processingTime: processResult.processingTime
        });
      }, 1000);

    } catch (err) {
      console.error('Upload/processing error:', err);
      setError(err.message || 'An unexpected error occurred');
      setUploadState('error');
    }
  };

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('File is too large. Maximum size is 50MB.');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Only PDF files are allowed.');
      } else {
        setError('File upload failed. Please try again.');
      }
      setUploadState('error');
      return;
    }

    // Handle accepted files
    if (acceptedFiles.length > 0) {
      handleFileUpload(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: uploadState === 'uploading' || uploadState === 'processing'
  });

  // Render different states
  const renderContent = () => {
    switch (uploadState) {
      case 'uploading':
        return (
          <UploadProgress 
            progress={uploadProgress} 
            fileName={currentFile?.name} 
          />
        );

      case 'processing':
        return (
          <ProcessingAnimation stage={processingStage} />
        );

      case 'success':
        return (
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-xl font-semibold text-green-700">
                Success!
              </h3>
              <p className="text-gray-600 mt-2">
                {currentFile?.name} has been processed successfully
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Redirecting to chat interface...
              </p>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <div>
              <h3 className="text-xl font-semibold text-red-700">
                Upload Failed
              </h3>
              <p className="text-red-600 mt-2">
                {error}
              </p>
              <LoadingButton
                onClick={resetState}
                variant="secondary"
                className="mt-4"
              >
                Try Again
              </LoadingButton>
            </div>
          </div>
        );

      default: // idle state
        return (
          <div className="text-center space-y-4">
            {isDragActive ? (
              <>
                <Upload className="w-16 h-16 text-blue-500 mx-auto animate-bounce" />
                <div>
                  <h3 className="text-xl font-semibold text-blue-700">
                    Drop your PDF here
                  </h3>
                  <p className="text-gray-600 mt-2">
                    Release to upload your document
                  </p>
                </div>
              </>
            ) : (
              <>
                <FileText className="w-16 h-16 text-gray-400 mx-auto" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-700">
                    Upload a PDF Document
                  </h3>
                  <p className="text-gray-600 mt-2">
                    Drag and drop your PDF here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500 mt-4">
                    Supports PDF files up to 50MB
                  </p>
                </div>
                
                {/* Upload instructions */}
                <div className="bg-blue-50 rounded-lg p-4 mt-6">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">
                    What happens next:
                  </h4>
                  <div className="text-xs text-blue-700 space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span>Your PDF will be uploaded securely</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span>Text will be extracted and processed</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span>You can then chat with your document</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 min-h-[400px] flex items-center justify-center
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50 scale-105' 
            : uploadState === 'error'
            ? 'border-red-300 bg-red-50'
            : uploadState === 'success'
            ? 'border-green-300 bg-green-50'
            : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
          }
          ${uploadState === 'uploading' || uploadState === 'processing' 
            ? 'pointer-events-none' 
            : ''
          }
        `}
      >
        <input {...getInputProps()} />
        {renderContent()}
      </div>

      {/* File info (when file is selected but not uploaded yet) */}
      {currentFile && uploadState === 'idle' && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {currentFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(currentFile.size)}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentFile(null);
              }}
              className="text-gray-400 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for upload tips
export function UploadTips() {
  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-yellow-800 mb-2">
          💡 Tips for best results:
        </h4>
        <ul className="text-xs text-yellow-700 space-y-1">
          <li>• Use text-based PDFs (not scanned images)</li>
          <li>• Smaller files process faster</li>
          <li>• Clear, well-formatted documents work best</li>
          <li>• Academic papers, reports, and manuals are ideal</li>
        </ul>
      </div>
    </div>
  );
}