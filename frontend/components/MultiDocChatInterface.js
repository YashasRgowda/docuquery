// components/MultiDocChatInterface.js
'use client'

import { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  User, 
  Bot, 
  Users, 
  RotateCcw, 
  Settings, 
  Info, 
  Clock, 
  Hash,
  FileText,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { queryMultipleDocuments, getCollectionSummary } from '../lib/api';
import { QueryLoader, LoadingButton } from './LoadingSpinner';

export default function MultiDocChatInterface({ collectionDocuments, onBack }) {
  // Component state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState(null); // null = all documents
  const [kTotal, setKTotal] = useState(8);
  const [showSettings, setShowSettings] = useState(false);
  const [showDocumentList, setShowDocumentList] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add welcome message on component mount
  useEffect(() => {
    addWelcomeMessage();
  }, [collectionDocuments]);

  // Add welcome message
  const addWelcomeMessage = () => {
    const totalChunks = collectionDocuments.reduce((sum, doc) => sum + doc.chunks_count, 0);
    const documentNames = collectionDocuments.map(doc => doc.name).join(', ');
    
    const welcomeMessage = {
      id: 'welcome-multi',
      type: 'bot',
      content: `🎉 **Multi-Document Analysis Ready!**\n\nI can now analyze across **${collectionDocuments.length} documents** with **${totalChunks} searchable sections**.\n\n**Documents in collection:**\n${collectionDocuments.map(doc => `• ${doc.name} (${doc.chunks_count} sections)`).join('\n')}\n\n**Try these powerful queries:**\n• "Compare the main themes across all documents"\n• "What are the common findings mentioned in these papers?"\n• "Which document has the most detailed analysis on [topic]?"\n• "Summarize the key differences between these documents"\n\nWhat would you like to analyze across these documents?`,
      timestamp: new Date(),
      isWelcome: true,
      documentsInfo: collectionDocuments
    };
    setMessages([welcomeMessage]);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuery = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Query across multiple documents
      const result = await queryMultipleDocuments(
        currentQuery,
        selectedDocuments, // null = all documents
        kTotal
      );

      if (result.success) {
        const botMessage = {
          id: `bot-${Date.now()}`,
          type: 'bot',
          content: result.answer,
          timestamp: new Date(),
          sources: result.sources,
          processingTime: result.processingTime,
          documentsSearched: result.documentsSearched,
          documentNames: result.documentNames,
          query: currentQuery,
          isMultiDoc: true
        };

        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Multi-document query failed:', error);
      const errorMessage = {
        id: `error-${Date.now()}`,
        type: 'bot',
        content: `I'm sorry, I encountered an error while analyzing your documents: ${error.message}\n\nPlease try rephrasing your question or check your document collection.`,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  // Advanced multi-document queries
  const advancedQuestions = [
    "Compare the methodologies used across all documents",
    "What are the common conclusions or recommendations?",
    "Which document provides the most comprehensive analysis?",
    "Identify the key differences in approaches between documents",
    "What themes appear consistently across all documents?",
    "Which document would be best for understanding [specific topic]?"
  ];

  // Handle suggestion click
  const handleSuggestionClick = (question) => {
    setInput(question);
    inputRef.current?.focus();
  };

  // Handle document selection for filtering
  const handleDocumentSelection = (docId) => {
    if (!selectedDocuments) {
      // If all documents selected, start with just this one
      setSelectedDocuments([docId]);
    } else if (selectedDocuments.includes(docId)) {
      // Remove from selection
      const newSelection = selectedDocuments.filter(id => id !== docId);
      setSelectedDocuments(newSelection.length === 0 ? null : newSelection);
    } else {
      // Add to selection
      setSelectedDocuments([...selectedDocuments, docId]);
    }
  };

  // Get selected document names for display
  const getSelectedDocumentNames = () => {
    if (!selectedDocuments) return "All Documents";
    return selectedDocuments
      .map(id => collectionDocuments.find(doc => doc.file_id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-white">
            <Users className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-semibold">
                Multi-Document Analysis
              </h2>
              <p className="text-indigo-100 text-sm">
                {collectionDocuments.length} documents • {collectionDocuments.reduce((sum, doc) => sum + doc.chunks_count, 0)} sections
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDocumentList(!showDocumentList)}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
              title="Document List"
            >
              <FileText className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={onBack}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
              title="Back to Collection Manager"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document List Panel */}
        {showDocumentList && (
          <div className="mt-4 bg-white bg-opacity-10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">Documents in Collection</h3>
              <button
                onClick={() => setShowDocumentList(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {collectionDocuments.map((doc) => (
                <div
                  key={doc.file_id}
                  className={`text-sm p-2 rounded border border-white border-opacity-20 ${
                    selectedDocuments && !selectedDocuments.includes(doc.file_id)
                      ? 'text-indigo-200 bg-white bg-opacity-5'
                      : 'text-white bg-white bg-opacity-10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{doc.name}</span>
                    <span className="text-xs opacity-75">{doc.chunks_count} chunks</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-4 bg-white bg-opacity-10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">Query Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-indigo-100 mb-1">
                  Search Scope: {getSelectedDocumentNames()}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedDocuments(null)}
                    className={`text-xs p-2 rounded border border-white border-opacity-20 ${
                      !selectedDocuments 
                        ? 'bg-white bg-opacity-20 text-white' 
                        : 'bg-white bg-opacity-5 text-indigo-200'
                    }`}
                  >
                    All Documents
                  </button>
                  {collectionDocuments.map((doc) => (
                    <button
                      key={doc.file_id}
                      onClick={() => handleDocumentSelection(doc.file_id)}
                      className={`text-xs p-2 rounded border border-white border-opacity-20 truncate ${
                        selectedDocuments?.includes(doc.file_id)
                          ? 'bg-white bg-opacity-20 text-white'
                          : 'bg-white bg-opacity-5 text-indigo-200'
                      }`}
                    >
                      {doc.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-indigo-100 mb-1">
                  Results Depth: {kTotal} chunks
                </label>
                <input
                  type="range"
                  min="4"
                  max="20"
                  value={kTotal}
                  onChange={(e) => setKTotal(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-indigo-200 mt-1">
                  <span>Focused (4)</span>
                  <span>Comprehensive (20)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Messages Container */}
      <div className="h-96 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Ready to analyze across multiple documents!</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-4xl rounded-lg p-4 ${
                message.type === 'user'
                  ? 'bg-indigo-600 text-white'
                  : message.isError
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : message.isWelcome
                      ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-800 border border-indigo-200'
                      : 'bg-white text-gray-800 border border-gray-200'
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center space-x-2 mb-2">
                {message.type === 'user' ? (
                  <User className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <Users className="w-4 h-4 flex-shrink-0" />
                )}
                <span className="text-sm font-medium">
                  {message.type === 'user' ? 'You' : 'Multi-Document AI'}
                </span>
                <span className={`text-xs ${
                  message.type === 'user' ? 'text-indigo-200' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </span>
                {message.isMultiDoc && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                    Multi-Doc
                  </span>
                )}
              </div>

              {/* Message Content */}
              <div className="whitespace-pre-wrap">
                {message.content}
              </div>

              {/* Multi-Document Sources */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <Hash className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600">
                      Sources from {message.documentsSearched} documents
                    </span>
                    {message.processingTime && (
                      <span className="flex items-center space-x-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{message.processingTime.toFixed(2)}s</span>
                      </span>
                    )}
                  </div>

                  {/* Group sources by document */}
                  {(() => {
                    const sourcesByDoc = {};
                    message.sources.forEach(source => {
                      if (!sourcesByDoc[source.document_name]) {
                        sourcesByDoc[source.document_name] = [];
                      }
                      sourcesByDoc[source.document_name].push(source);
                    });

                    return Object.entries(sourcesByDoc).map(([docName, sources]) => (
                      <div key={docName} className="mb-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <FileText className="w-3 h-3 text-indigo-500" />
                          <span className="text-xs font-medium text-indigo-700">
                            {docName}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({sources.length} section{sources.length !== 1 ? 's' : ''})
                          </span>
                        </div>
                        <div className="space-y-2 ml-5">
                          {sources.map((source, index) => (
                            <div
                              key={`${source.file_id}-${source.chunk_id}`}
                              className="bg-gray-50 rounded p-3 text-sm border-l-2 border-indigo-200"
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium text-gray-700">
                                  Section {source.chunk_id}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {Math.round(source.relevance_score * 100)}% relevant
                                </span>
                              </div>
                              <p className="text-gray-600 text-xs leading-relaxed">
                                {source.preview}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <QueryLoader query={messages[messages.length - 1]?.content} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Advanced Suggestions */}
      {messages.length <= 1 && !isLoading && (
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-t border-indigo-100">
          <h4 className="text-sm font-medium text-indigo-800 mb-3">
            🚀 Try these advanced multi-document queries:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {advancedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(question)}
                className="text-xs bg-white text-indigo-700 px-3 py-2 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors text-left"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="border-t border-gray-200 p-6 bg-white">
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question across multiple documents..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
            disabled={isLoading}
          />
          <LoadingButton
            type="submit"
            loading={isLoading}
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700"
          >
            <Send className="w-5 h-5" />
          </LoadingButton>
        </form>

        <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
          <span>
            Press Enter to send • Analyzing across {
              selectedDocuments ? `${selectedDocuments.length} selected` : collectionDocuments.length
            } document{collectionDocuments.length !== 1 ? 's' : ''}
          </span>
          <span>
            Powered by Multi-Document AI
          </span>
        </div>
      </div>
    </div>
  );
}