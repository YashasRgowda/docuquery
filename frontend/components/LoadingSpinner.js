// components/LoadingSpinner.js
// Beautiful loading components for different states

import { Loader2, FileText, Brain, Search } from 'lucide-react';

/**
 * Simple spinning loader
 */
export function SimpleSpinner({ size = 24, className = "" }) {
  return (
    <Loader2 
      className={`animate-spin ${className}`} 
      size={size} 
    />
  );
}

/**
 * General LoadingSpinner component (alias for SimpleSpinner)
 */
export function LoadingSpinner({ size = "md", className = "" }) {
  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48
  };
  
  return (
    <div className="flex items-center justify-center">
      <Loader2 
        className={`animate-spin text-blue-600 ${className}`} 
        size={sizeMap[size] || 24} 
      />
    </div>
  );
}

/**
 * File upload progress loader
 */
export function UploadProgress({ progress = 0, fileName = "" }) {
  return (
    <div className="flex flex-col items-center space-y-4 p-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-200 rounded-full">
          <div 
            className="w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"
            style={{
              background: `conic-gradient(from 0deg, #3B82F6 ${progress * 3.6}deg, transparent ${progress * 3.6}deg)`
            }}
          ></div>
        </div>
        <FileText className="absolute inset-0 m-auto w-6 h-6 text-blue-600" />
      </div>
      
      <div className="text-center">
        <div className="text-lg font-medium text-gray-700">
          Uploading PDF...
        </div>
        <div className="text-sm text-gray-500">
          {fileName && `${fileName}`}
        </div>
        <div className="text-xl font-bold text-blue-600 mt-1">
          {progress}%
        </div>
      </div>
    </div>
  );
}

/**
 * PDF processing animation
 */
export function ProcessingAnimation({ stage = "processing" }) {
  const stages = {
    processing: "Processing PDF...",
    extracting: "Extracting text...",
    chunking: "Creating chunks...",
    embedding: "Generating embeddings...",
    indexing: "Building search index..."
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-6">
      <div className="relative">
        {/* Outer rotating ring */}
        <div className="w-16 h-16 border-4 border-green-200 rounded-full animate-spin">
          <div className="absolute top-0 left-0 w-4 h-4 bg-green-600 rounded-full"></div>
        </div>
        
        {/* Inner pulsing circle */}
        <div className="absolute inset-2 w-8 h-8 bg-green-100 rounded-full animate-pulse flex items-center justify-center">
          <Brain className="w-4 h-4 text-green-600" />
        </div>
      </div>
      
      <div className="text-center">
        <div className="text-lg font-medium text-gray-700">
          {stages[stage] || stages.processing}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          This may take a few moments...
        </div>
        
        {/* Animated dots */}
        <div className="flex justify-center space-x-1 mt-2">
          <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
}

/**
 * Query search animation
 */
export function QueryLoader({ query = "" }) {
  return (
    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
      <div className="relative">
        <Search className="w-6 h-6 text-blue-600 animate-pulse" />
        <div className="absolute -inset-1 border-2 border-blue-300 rounded-full animate-ping"></div>
      </div>
      
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-700">
          Searching document...
        </div>
        {query && (
          <div className="text-xs text-gray-500 truncate">
            "{query}"
          </div>
        )}
      </div>
      
      <div className="flex space-x-1">
        <div className="w-1 h-4 bg-blue-600 rounded animate-pulse"></div>
        <div className="w-1 h-4 bg-blue-600 rounded animate-pulse" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-1 h-4 bg-blue-600 rounded animate-pulse" style={{ animationDelay: '0.2s' }}></div>
      </div>
    </div>
  );
}

/**
 * Full screen loading overlay
 */
export function LoadingOverlay({ message = "Loading...", description = "" }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {message}
        </h3>
        {description && (
          <p className="text-sm text-gray-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Inline loading button
 */
export function LoadingButton({ 
  loading = false, 
  children, 
  onClick,
  disabled = false,
  className = "",
  variant = "primary",
  size = "md",
  type = "button"
}) {
  const baseClasses = "flex items-center justify-center space-x-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    success: "bg-green-600 text-white hover:bg-green-700"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <SimpleSpinner size={16} />}
      <span>{children}</span>
    </button>
  );
}

/**
 * Skeleton loader for content
 */
export function SkeletonLoader({ lines = 3, className = "" }) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`h-4 bg-gray-300 rounded mb-2 ${
            index === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        ></div>
      ))}
    </div>
  );
}

/**
 * Progress bar component
 */
export function ProgressBar({ 
  progress = 0, 
  className = "",
  showPercentage = true,
  color = "blue" 
}) {
  const colorClasses = {
    blue: "bg-blue-600",
    green: "bg-green-600",
    red: "bg-red-600",
    yellow: "bg-yellow-600"
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-1">
        {showPercentage && (
          <span className="text-sm font-medium text-gray-700">
            {Math.round(progress)}%
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ease-out ${colorClasses[color]}`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        ></div>
      </div>
    </div>
  );
}

// Export individual components
export {
  SimpleSpinner as default,
  LoadingSpinner,  // ← ADDED THIS EXPORT
  UploadProgress,
  ProcessingAnimation,
  QueryLoader,
  LoadingOverlay,
  LoadingButton,
  SkeletonLoader,
  ProgressBar
};