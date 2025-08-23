// components/CollectionManager.js
'use client'

import { useState, useEffect } from 'react';
import { 
  FolderOpen, 
  Plus, 
  Trash2, 
  FileText, 
  Users, 
  Clock, 
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { 
  listDocuments, 
  getCollectionSummary, 
  addToCollection, 
  removeFromCollection, 
  formatFileSize, 
  getStatusBadgeColor 
} from '../lib/api';
import { LoadingSpinner, LoadingButton } from './LoadingSpinner';

export default function CollectionManager({ onStartMultiChat }) {
  // Component state
  const [allDocuments, setAllDocuments] = useState([]);
  const [collectionDocuments, setCollectionDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({});

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Load all documents and collection summary
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load all documents
      const documentsResult = await listDocuments();
      if (documentsResult.success) {
        setAllDocuments(documentsResult.documents);
      } else {
        throw new Error(documentsResult.error);
      }

      // Load collection summary
      const collectionResult = await getCollectionSummary();
      if (collectionResult.success) {
        setCollectionDocuments(collectionResult.documents);
      } else {
        // Collection might be empty, which is okay
        setCollectionDocuments([]);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err.message);
    }
    
    setLoading(false);
  };

  // Add document to collection
  const handleAddToCollection = async (fileId) => {
    setActionLoading(prev => ({ ...prev, [fileId]: 'adding' }));
    
    try {
      const result = await addToCollection(fileId);
      if (result.success) {
        // Refresh collection data
        await loadData();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Failed to add to collection:', err);
      alert(`Failed to add document to collection: ${err.message}`);
    }
    
    setActionLoading(prev => ({ ...prev, [fileId]: null }));
  };

  // Remove document from collection
  const handleRemoveFromCollection = async (fileId) => {
    if (!confirm('Remove this document from the multi-document collection?')) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [fileId]: 'removing' }));
    
    try {
      const result = await removeFromCollection(fileId);
      if (result.success) {
        // Refresh collection data
        await loadData();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Failed to remove from collection:', err);
      alert(`Failed to remove document from collection: ${err.message}`);
    }
    
    setActionLoading(prev => ({ ...prev, [fileId]: null }));
  };

  // Check if document is in collection
  const isInCollection = (fileId) => {
    return collectionDocuments.some(doc => doc.file_id === fileId);
  };

  // Filter documents based on search and status
  const filteredDocuments = allDocuments.filter(doc => {
    const matchesSearch = doc.original_filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get collection stats
  const collectionStats = {
    totalDocuments: collectionDocuments.length,
    totalChunks: collectionDocuments.reduce((sum, doc) => sum + doc.chunks_count, 0),
    totalSize: allDocuments
      .filter(doc => isInCollection(doc.file_id))
      .reduce((sum, doc) => sum + (doc.file_size || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading documents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-700 mb-2">Error Loading Documents</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <LoadingButton onClick={loadData} variant="secondary">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </LoadingButton>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-3 rounded-full">
            <FolderOpen className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Document Collection Manager
        </h2>
        <p className="text-lg text-gray-600">
          Manage your documents and create multi-document collections for advanced analysis
        </p>
      </div>

      {/* Collection Stats */}
      {collectionDocuments.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-indigo-900">
              Active Multi-Document Collection
            </h3>
            <LoadingButton
              onClick={() => onStartMultiChat(collectionDocuments)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Users className="w-4 h-4 mr-2" />
              Start Multi-Document Chat
            </LoadingButton>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white rounded-lg p-4 border border-indigo-100">
              <div className="text-2xl font-bold text-indigo-600">
                {collectionStats.totalDocuments}
              </div>
              <div className="text-sm text-gray-600">Documents</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-indigo-100">
              <div className="text-2xl font-bold text-indigo-600">
                {collectionStats.totalChunks}
              </div>
              <div className="text-sm text-gray-600">Text Chunks</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-indigo-100">
              <div className="text-2xl font-bold text-indigo-600">
                {formatFileSize(collectionStats.totalSize)}
              </div>
              <div className="text-sm text-gray-600">Total Size</div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="processed">Processed</option>
              <option value="processing">Processing</option>
              <option value="uploaded">Uploaded</option>
              <option value="error">Error</option>
            </select>
          </div>

          <LoadingButton onClick={loadData} variant="secondary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </LoadingButton>
        </div>

        {/* Documents List */}
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-500 mb-2">
              No Documents Found
            </h3>
            <p className="text-gray-400">
              {allDocuments.length === 0 
                ? "Upload some PDF documents to get started" 
                : "Try adjusting your search or filter criteria"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.file_id}
                className={`border rounded-lg p-4 transition-all ${
                  isInCollection(doc.file_id)
                    ? 'border-indigo-200 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className={`p-2 rounded-lg ${
                      isInCollection(doc.file_id)
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {doc.original_filename}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span>{formatFileSize(doc.file_size || 0)}</span>
                        <span>•</span>
                        <span>{doc.chunks_count || 0} chunks</span>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(doc.upload_time).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Status Badge */}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeColor(doc.status)}`}>
                      {doc.status}
                    </span>

                    {/* Collection Status */}
                    {isInCollection(doc.file_id) && (
                      <div className="flex items-center space-x-1 text-indigo-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs font-medium">In Collection</span>
                      </div>
                    )}

                    {/* Action Button */}
                    {doc.status === 'processed' && (
                      <LoadingButton
                        onClick={() => 
                          isInCollection(doc.file_id)
                            ? handleRemoveFromCollection(doc.file_id)
                            : handleAddToCollection(doc.file_id)
                        }
                        loading={actionLoading[doc.file_id] === 'adding' || actionLoading[doc.file_id] === 'removing'}
                        variant={isInCollection(doc.file_id) ? "secondary" : "primary"}
                        size="sm"
                      >
                        {actionLoading[doc.file_id] === 'adding' ? (
                          'Adding...'
                        ) : actionLoading[doc.file_id] === 'removing' ? (
                          'Removing...'
                        ) : isInCollection(doc.file_id) ? (
                          <>
                            <Trash2 className="w-3 h-3 mr-1" />
                            Remove
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3 mr-1" />
                            Add to Collection
                          </>
                        )}
                      </LoadingButton>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">
          💡 How Multi-Document Collections Work:
        </h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Add processed documents to your collection for cross-document analysis</li>
          <li>• Query across multiple documents simultaneously to find connections and patterns</li>
          <li>• Get answers with source attribution showing which document contributed each piece of information</li>
          <li>• Perfect for comparing research papers, analyzing multiple reports, or finding common themes</li>
        </ul>
      </div>
    </div>
  );
}