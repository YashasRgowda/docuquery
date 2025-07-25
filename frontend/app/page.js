// app/page.js
'use client'

import { useState, useEffect } from 'react';
import { MessageSquare, FileText, Sparkles, Github, ExternalLink } from 'lucide-react';
import FileUpload, { UploadTips } from '../components/FileUpload';
import ChatInterface from '../components/ChatInterface';
import { healthCheck } from '../lib/api';

export default function Home() {
  // Application state
  const [currentView, setCurrentView] = useState('upload'); // 'upload' or 'chat'
  const [documentData, setDocumentData] = useState(null);
  const [backendStatus, setBackendStatus] = useState('unknown'); // 'online', 'offline', 'unknown'

  // Check backend health on component mount
  useEffect(() => {
    checkBackendHealth();
  }, []);

  // Check if backend is running
  const checkBackendHealth = async () => {
    try {
      const result = await healthCheck();
      setBackendStatus(result.success ? 'online' : 'offline');
    } catch (error) {
      setBackendStatus('offline');
    }
  };

  // Handle successful document upload and processing
  const handleUploadSuccess = (uploadData) => {
    setDocumentData(uploadData);
    setCurrentView('chat');
  };

  // Handle reset (go back to upload)
  const handleReset = () => {
    setCurrentView('upload');
    setDocumentData(null);
  };

  // Render backend status indicator
  const renderBackendStatus = () => {
    if (backendStatus === 'unknown') return null;

    return (
      <div className={`fixed top-4 right-4 z-50 px-3 py-2 rounded-lg text-sm font-medium ${
        backendStatus === 'online' 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            backendStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`}></div>
          <span>
            Backend {backendStatus === 'online' ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100">
      {/* Backend Status Indicator */}
      {renderBackendStatus()}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2 rounded-lg">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  DocuQuery AI
                </h1>
                <p className="text-sm text-gray-600">
                  Chat with your PDF documents using AI
                </p>
              </div>
            </div>

            {/* Navigation/Actions */}
            <div className="flex items-center space-x-4">
              {currentView === 'chat' && (
                <button
                  onClick={handleReset}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>New Document</span>
                </button>
              )}
              
              <a
                href="https://github.com/yourusername/docuquery"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Github className="w-4 h-4" />
                <span>GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {currentView === 'upload' ? (
          <>
            {/* Hero Section */}
            <div className="text-center mb-12">
              <div className="flex justify-center mb-6">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-4 rounded-full">
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Transform Your PDFs into 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  {" "}Intelligent Conversations
                </span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                Upload any PDF document and start asking questions. Our AI will analyze the content 
                and provide intelligent answers based on the document's information.
              </p>

              {/* Feature highlights */}
              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Smart Processing</h3>
                  <p className="text-sm text-gray-600">
                    Advanced text extraction and chunking for optimal search results
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Natural Conversations</h3>
                  <p className="text-sm text-gray-600">
                    Ask questions in plain English and get contextual answers
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Source Citations</h3>
                  <p className="text-sm text-gray-600">
                    Every answer includes references to relevant document sections
                  </p>
                </div>
              </div>
            </div>

            {/* File Upload Component */}
            <FileUpload onUploadSuccess={handleUploadSuccess} />

            {/* Upload Tips */}
            <UploadTips />

            {/* Backend Status Warning */}
            {backendStatus === 'offline' && (
              <div className="max-w-2xl mx-auto mt-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <h4 className="font-semibold text-red-800">Backend Offline</h4>
                  </div>
                  <p className="text-sm text-red-700 mt-2">
                    The DocuQuery backend is not running. Please start your FastAPI server:
                  </p>
                  <code className="block bg-red-100 text-red-800 p-2 rounded mt-2 text-xs">
                    uvicorn main:app --reload --port 8000
                  </code>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Chat Interface */}
            <ChatInterface 
              documentData={documentData} 
              onReset={handleReset}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-1.5 rounded">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <span className="text-gray-700 font-medium">DocuQuery AI</span>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <span>Built with Next.js & FastAPI</span>
              <span>•</span>
              <span>Powered by AI</span>
              <span>•</span>
              <a 
                href="https://github.com/yourusername/docuquery" 
                className="hover:text-blue-600 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Source
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Example usage for testing (you can remove this later)
export function ExampleStates() {
  return (
    <div className="p-8 space-y-8 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold">DocuQuery State Examples</h1>
      
      {/* Upload State */}
      <div className="bg-white p-6 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Upload State</h2>
        <FileUpload onUploadSuccess={(data) => console.log('Upload success:', data)} />
      </div>

      {/* Chat State */}
      <div className="bg-white p-6 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Chat State</h2>
        <ChatInterface 
          documentData={{
            fileId: 'example-id',
            filename: 'example.pdf',
            chunksCount: 25,
            processingTime: 3.45
          }}
          onReset={() => console.log('Reset clicked')}
        />
      </div>
    </div>
  );
}