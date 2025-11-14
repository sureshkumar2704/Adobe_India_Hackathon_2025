// frontend/src/App.jsx
import React, { useState, useRef } from 'react';
import axios from 'axios';
import PDFViewer from './components/PdfViewer';
import SectionSidebar from './components/SectionSidebar';
import FileUpload from './components/FileUpload';
import './App.css';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [pdfData, setPdfData] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pdfViewerRef = useRef();

  const handleFileUpload = async (file) => {
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Upload response:', response.data);
      const { title, sections: extractedSections, pdf_url } = response.data;

      // Robust URL handling:
      // If backend returns absolute URL (starts with http/https) use it as-is.
      // If backend returns relative path (starts with '/'), prefix API_BASE_URL.
      // If backend returns something else, try to make it a valid URL.
      let finalPdfUrl = pdf_url || response.data.fileUrl || response.data.pdfUrl || '';

      if (!finalPdfUrl) {
        throw new Error('Backend did not return a pdf URL');
      }

      if (!/^https?:\/\//i.test(finalPdfUrl)) {
        // not an absolute URL -> prefix API_BASE_URL safely
        if (finalPdfUrl.startsWith('/')) {
          finalPdfUrl = `${API_BASE_URL}${finalPdfUrl}`;
        } else {
          finalPdfUrl = `${API_BASE_URL}/${finalPdfUrl}`;
        }
      }

      console.log('Final PDF URL used in frontend:', finalPdfUrl);

      setPdfData({
        title: title || '',
        url: finalPdfUrl,
        filename: file.name
      });

      setSections(extractedSections || []);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to upload and process PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleSectionClick = (section) => {
    if (pdfViewerRef.current) {
      pdfViewerRef.current.navigateToSection(section);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>📄 PDF Section Navigator</h1>
        <p>Upload a PDF to extract and navigate through its sections</p>
      </header>

      <main className="app-main">
        {!pdfData ? (
          <div className="upload-container">
            <FileUpload 
              onFileUpload={handleFileUpload} 
              loading={loading}
              error={error}
            />
          </div>
        ) : (
          <div className="viewer-container">
            <SectionSidebar 
              title={pdfData.title}
              sections={sections}
              onSectionClick={handleSectionClick}
            />
            <div className="pdf-container">
              {/* Quick test link to open PDF in a new tab (useful for debugging) */}
              <div style={{ margin: '6px 0' }}>
                <a href={pdfData.url} target="_blank" rel="noreferrer">Open PDF in new tab</a>
              </div>

              <PDFViewer 
                ref={pdfViewerRef}
                pdfUrl={pdfData.url}
                sections={sections}
              />
            </div>
          </div>
        )}
        
        {pdfData && (
          <button 
            className="reset-btn"
            onClick={() => {
              setPdfData(null);
              setSections([]);
              setError('');
            }}
          >
            Upload New PDF
          </button>
        )}
      </main>
    </div>
  );
}

export default App;
