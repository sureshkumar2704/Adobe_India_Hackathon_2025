import React, { useState } from 'react';

const FileUpload = ({ onFileUpload, loading, error }) => {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      onFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      onFileUpload(file);
    }
  };

  return (
    <div className="file-upload">
      <div 
        className={`upload-zone ${dragOver ? 'drag-over' : ''} ${loading ? 'loading' : ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
      >
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Processing PDF...</p>
          </div>
        ) : (
          <>
            <div className="upload-icon">📁</div>
            <h3>Drop your PDF here</h3>
            <p>or click to browse files</p>
            <input 
              type="file" 
              accept=".pdf"
              onChange={handleFileSelect}
              className="file-input"
            />
          </>
        )}
      </div>
      
      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUpload;