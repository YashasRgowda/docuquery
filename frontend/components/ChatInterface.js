// components/ChatInterface.js
'use client'

import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, FileText, RotateCcw, Trash2, Info, Clock, Hash } from 'lucide-react';
import { queryDocument, getDocumentInfo, deleteDocument } from '../lib/api';
import { QueryLoader, LoadingButton, SkeletonLoader } from './LoadingSpinner';

export default function ChatInterface({ documentData, onReset }) {
  // Component state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [documentInfo, setDocumentInfo] = useState(null);
  const [showDocInfo, setShowDocInfo] = useState(false);

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

  // Load document info on component mount
  useEffect(() => {
    if (documentData?.fileId) {
      loadDocumentInfo();
      // Add welcome message
      addWelcomeMessage();
    }
  }, [documentData]);

  // Load document information
  const loadDocumentInfo = async () => {
    try {
      const result = await getDocumentInfo(documentData.fileId);
      if (result.success) {
        setDocumentInfo(result.data);
      }
    } catch (error) {
      console.error('Failed to load document info:', error);
    }
  };

  // Add welcome message
  const addWelcomeMessage = () => {
    const welcomeMessage = {
      id: 'welcome',
      type: 'bot',
      content: `Hi! I've successfully processed your document **${documentData.filename}**. I've broken it down into ${documentData.chunksCount} searchable sections.\n\nYou can now ask me questions about the content! Try asking:\n• "What is this document about?"\n• "Summarize the main points"\n• "What are the key findings?"\n\nWhat would you like to know?`,
      timestamp: new Date(),
      isWelcome: true
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
      // Query the document
      const result = await queryDocument(currentQuery, documentData.fileId, 3);

      if (result.success) {
        const botMessage = {
          id: `bot-${Date.now()}`,
          type: 'bot',
          content: result.answer,
          timestamp: new Date(),
          sources: result.sources,
          processingTime: result.processingTime,
          query: currentQuery
        };

        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Query failed:', error);
      const errorMessage = {
        id: `error-${Date.now()}`,
        type: 'bot',
        content: `I'm sorry, I encountered an error while searching your document: ${error.message}\n\nPlease try rephrasing your question or try again.`,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  // Handle delete document
  const handleDeleteDocument = async () => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await deleteDocument(documentData.fileId);
      if (result.success) {
        onReset(); // Go back to upload screen
      } else {
        alert('Failed to delete document: ' + result.error);
      }
    } catch (error) {
      alert('Failed to delete document: ' + error.message);
    }
  };

  // Suggested questions
  const suggestedQuestions = [
    "What is this document about?",
    "What are the main key points?",
    "Can you summarize this document?",
    "What are the most important details?",
    "What conclusions does this document reach?"
  ];

  // Handle suggested question click
  const handleSuggestionClick = (question) => {
    setInput(question);
    inputRef.current?.focus();
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-white">
            <FileText className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-semibold">
                {documentData?.filename || 'Document Chat'}
              </h2>
              <p className="text-blue-100 text-sm">
                {documentData?.chunksCount || 0} sections • Ready for questions
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDocInfo(!showDocInfo)}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
              title="Document Information"
            >
              <Info className="w-5 h-5" />
            </button>

            <button
              onClick={onReset}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
              title="Upload New Document"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={handleDeleteDocument}
              className="text-white hover:bg-red-500 hover:bg-opacity-80 p-2 rounded-lg transition-colors"
              title="Delete Document"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Info Panel */}
        {showDocInfo && documentInfo && (
          <div className="mt-4 bg-white bg-opacity-10 backdrop-blur rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">Document Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-blue-100">
              <div>
                <span className="font-medium">File Size:</span>
                <span className="ml-2">{(documentInfo.file_size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div>
                <span className="font-medium">Chunks:</span>
                <span className="ml-2">{documentInfo.chunks_count}</span>
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <span className="ml-2 capitalize">{documentInfo.status}</span>
              </div>
              <div>
                <span className="font-medium">Processed:</span>
                <span className="ml-2">{new Date(documentInfo.processed_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Messages Container */}
      <div className="h-96 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No messages yet. Ask me anything about your document!</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg p-4 ${message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.isError
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : message.isWelcome
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-white text-gray-800 border border-gray-200'
                }`}
            >
              {/* Message Header */}
              <div className="flex items-center space-x-2 mb-2">
                {message.type === 'user' ? (
                  <User className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <Bot className="w-4 h-4 flex-shrink-0" />
                )}
                <span className="text-sm font-medium">
                  {message.type === 'user' ? 'You' : 'DocuQuery AI'}
                </span>
                <span className={`text-xs ${message.type === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>

              {/* Message Content */}
              <div className="whitespace-pre-wrap">
                {message.content}
              </div>

              {/* Sources (for bot messages with sources) */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Hash className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600">Sources</span>
                    {message.processingTime && (
                      <span className="flex items-center space-x-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{message.processingTime.toFixed(2)}s</span>
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {message.sources.map((source, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 rounded p-3 text-sm"
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

      {/* Suggested Questions (show when no messages) */}
      {messages.length <= 1 && !isLoading && (
        <div className="px-6 py-4 bg-blue-50 border-t border-blue-100">
          <h4 className="text-sm font-medium text-blue-800 mb-3">
            💡 Try asking these questions:
          </h4>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(question)}
                className="text-xs bg-white text-blue-700 px-3 py-2 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors"
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
            placeholder="Ask a question about your document..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
            disabled={isLoading}
          />
          <LoadingButton
            type="submit"
            loading={isLoading}
            disabled={!input.trim() || isLoading}
            className="px-6 py-3"
          >
            <Send className="w-5 h-5" />
          </LoadingButton>
        </form>

        <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
          <span>
            Press Enter to send • {messages.length} message{messages.length !== 1 ? 's' : ''}
          </span>
          <span>
            Powered by DocuQuery AI
          </span>
        </div>
      </div>
    </div>
  );
}

// Message bubble component (could be extracted)
function MessageBubble({ message, isUser }) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-3xl rounded-lg p-4 ${isUser
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-800 border border-gray-200'
          }`}
      >
        <div className="flex items-center space-x-2 mb-2">
          {isUser ? (
            <User className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">
            {isUser ? 'You' : 'DocuQuery AI'}
          </span>
          <span className={`text-xs ${isUser ? 'text-blue-200' : 'text-gray-500'}`}>
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>
        <div className="whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    </div>
  );
}