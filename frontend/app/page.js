// app/page.js - Enhanced with Multi-Document Features
'use client'

import { useState, useEffect } from 'react';
import { MessageSquare, FileText, Sparkles, Github, ExternalLink, Users, FolderOpen } from 'lucide-react';
import FileUpload, { UploadTips } from '../components/FileUpload';
import ChatInterface from '../components/ChatInterface';
import CollectionManager from '../components/CollectionManager';
import MultiDocChatInterface from '../components/MultiDocChatInterface';
import { healthCheck } from '../lib/api';

export default function Home() {
  // Application state
  const [currentView, setCurrentView] = useState('home'); // 'home', 'upload', 'chat', 'collection', 'multi-chat'
  const [documentData, setDocumentData] = useState(null);
  const [collectionDocuments, setCollectionDocuments] = useState([]);
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

  // Handle starting multi-document chat
  const handleStartMultiChat = (documents) => {
    setCollectionDocuments(documents);
    setCurrentView('multi-chat');
  };

  // Handle navigation
  const handleNavigation = (view) => {
    setCurrentView(view);
    if (view === 'home') {
      setDocumentData(null);
      setCollectionDocuments([]);
    }
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

  // Navigation items based on current view
  const getNavigationItems = () => {
    const items = [];
    
    if (currentView !== 'home') {
      items.push({
        label: 'Home',
        action: () => handleNavigation('home'),
        icon: MessageSquare
      });
    }
    
    if (currentView === 'chat') {
      items.push({
        label: 'New Document',
        action: () => handleNavigation('upload'),
        icon: FileText
      });
      items.push({
        label: 'Manage Collection',
        action: () => handleNavigation('collection'),
        icon: FolderOpen
      });
    }
    
    if (currentView === 'multi-chat') {
      items.push({
        label: 'Back to Collection',
        action: () => handleNavigation('collection'),
        icon: FolderOpen
      });
    }
    
    return items;
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
                  {currentView === 'multi-chat' 
                    ? 'Multi-Document Intelligence Platform'
                    : 'Chat with your PDF documents using AI'
                  }
                </p>
              </div>
            </div>

            {/* Navigation/Actions */}
            <div className="flex items-center space-x-4">
              {getNavigationItems().map((item, index) => (
                <button
                  key={index}
                  onClick={item.action}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              ))}
              
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
        {currentView === 'home' && (
          <>
            {/* Hero Section */}
            <div className="text-center mb-12">
              <div className="flex justify-center mb-6">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-4 rounded-full">
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Enterprise Document Intelligence
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  {" "}Platform
                </span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                Upload PDFs and unlock powerful AI-driven document analysis. Chat with individual documents 
                or analyze multiple documents simultaneously for comparative insights and cross-document analysis.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <button
                  onClick={() => handleNavigation('upload')}
                  className="flex items-center justify-center space-x-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105"
                >
                  <FileText className="w-5 h-5" />
                  <span>Upload Document</span>
                </button>
                
                <button
                  onClick={() => handleNavigation('collection')}
                  className="flex items-center justify-center space-x-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105"
                >
                  <Users className="w-5 h-5" />
                  <span>Manage Collection</span>
                </button>
              </div>

              {/* Feature highlights */}
              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Single Document Analysis</h3>
                  <p className="text-sm text-gray-600">
                    Upload and chat with individual PDFs. Get instant answers with source citations and contextual understanding.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Users className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Multi-Document Intelligence</h3>
                  <p className="text-sm text-gray-600">
                    Analyze multiple documents simultaneously. Compare, contrast, and find connections across your document collection.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Enterprise Features</h3>
                  <p className="text-sm text-gray-600">
                    Advanced search, source attribution, document management, and production-ready architecture.
                  </p>
                </div>
              </div>
            </div>

            {/* Use Cases Section */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-8 mb-12">
              <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
                Perfect for Professional Use Cases
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Research Analysis</h4>
                  <p className="text-sm text-gray-600">Compare research papers, extract methodologies, and identify trends across studies.</p>
                </div>
                
                <div className="text-center">
                  <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Contract Review</h4>
                  <p className="text-sm text-gray-600">Analyze multiple contracts simultaneously to identify key terms and differences.</p>
                </div>
                
                <div className="text-center">
                  <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Report Synthesis</h4>
                  <p className="text-sm text-gray-600">Combine insights from multiple reports into comprehensive analysis and summaries.</p>
                </div>
                
                <div className="text-center">
                  <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Due Diligence</h4>
                  <p className="text-sm text-gray-600">Analyze financial documents, legal filings, and business reports for comprehensive insights.</p>
                </div>
              </div>
            </div>

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
                    cd backend && python main.py
                  </code>
                </div>
              </div>
            )}
          </>
        )}

        {currentView === 'upload' && (
          <>
            {/* Upload Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-3 rounded-full">
                  <FileText className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Upload Your PDF Document
              </h2>
              <p className="text-lg text-gray-600">
                Start by uploading a PDF document to begin your AI-powered analysis
              </p>
            </div>

            {/* File Upload Component */}
            <FileUpload onUploadSuccess={handleUploadSuccess} />

            {/* Upload Tips */}
            <UploadTips />
          </>
        )}

        {currentView === 'chat' && (
          <>
            {/* Single Document Chat Interface */}
            <ChatInterface 
              documentData={documentData} 
              onReset={() => handleNavigation('home')}
            />
          </>
        )}

        {currentView === 'collection' && (
          <>
            {/* Document Collection Manager */}
            <CollectionManager 
              onStartMultiChat={handleStartMultiChat}
            />
          </>
        )}

        {currentView === 'multi-chat' && (
          <>
            {/* Multi-Document Chat Interface */}
            <MultiDocChatInterface 
              collectionDocuments={collectionDocuments}
              onBack={() => handleNavigation('collection')}
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
              <span className="text-sm text-gray-500">Enterprise Document Intelligence</span>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <span>Built with Next.js & FastAPI</span>
              <span>•</span>
              <span>Powered by Google Gemini AI</span>
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