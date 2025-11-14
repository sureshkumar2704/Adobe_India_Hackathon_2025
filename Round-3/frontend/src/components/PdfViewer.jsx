import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Fix for PDF.js using URL.parse in some builds
if (typeof URL !== "undefined" && !URL.parse) {
  URL.parse = function (val, base) {
    try {
      return new URL(val, base);
    } catch (e) {
      return null;
    }
  };
}

// Use CDN worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PDFViewer = forwardRef(({ pdfUrl, sections }, ref) => {
  const containerRef = useRef(null);
  const pdfRef = useRef(null);
  const renderedPagesRef = useRef(new Map());
  const [scale, setScale] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSelectedText, setHasSelectedText] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [podcast, setPodcast] = useState(null);
  const [podcastLoading, setPodcastLoading] = useState(false);
  const [showPodcast, setShowPodcast] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(0);
  const playbackTimerRef = useRef(null);
  const speechUtteranceRef = useRef(null);
  const [audioSupported, setAudioSupported] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState({
    rate: 1,
    pitch: 1,
    volume: 0.8
  });

  // Check for audio support on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setAudioSupported(true);
      console.log('Speech synthesis supported');
    } else {
      console.warn('Speech synthesis not supported');
    }
  }, []);

  // Allow parent to call navigation
  useImperativeHandle(ref, () => ({
    navigateToSection(section) {
      navigateToSection(section);
    },
  }));

  useEffect(() => {
    if (!pdfUrl) return;
    loadPdf();
    return () => {
      // Cleanup
      if (pdfRef.current) {
        try {
          pdfRef.current.destroy();
        } catch (e) {}
        pdfRef.current = null;
      }
      renderedPagesRef.current.clear();
      if (containerRef.current) containerRef.current.innerHTML = "";
      stopPodcast();
    };
  }, [pdfUrl]);

  useEffect(() => {
    if (pdfRef.current) {
      renderAllPages(pdfRef.current);
    }
  }, [scale]);

  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection().toString().trim();
      if (selection.length > 10) {
        console.log("Selected text:", selection);
        setHasSelectedText(true);
        setSelectedText(selection);
        fetchInsights(selection);
      }
    };

    const handleMouseDown = () => {
      const currentSelection = window.getSelection().toString().trim();
      if (currentSelection.length === 0) {
        // Only clear insights and podcast when no text is selected
        // Don't close the entire sidebar if it was manually opened
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mouseup", handleMouseUp);
      container.addEventListener("mousedown", handleMouseDown);
    }
    return () => {
      if (container) {
        container.removeEventListener("mouseup", handleMouseUp);
        container.removeEventListener("mousedown", handleMouseDown);
      }
    };
  }, []);

  // Function to close only insights (not the entire sidebar)
  const closeInsights = () => {
    stopPodcast();
    setInsights(null);
    setError(null);
    setInsightsLoading(false);
    setPodcast(null);
    setShowPodcast(false);
    
    // Clear text selection
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
    
    // Only hide sidebar if no meaningful text is selected
    const currentSelection = window.getSelection().toString().trim();
    if (currentSelection.length <= 10) {
      setHasSelectedText(false);
      setSelectedText('');
    }
  };

  async function fetchInsights(selectedText) {
    if (!selectedText || selectedText.trim().length < 10) {
      setError("Please select more text for analysis");
      return;
    }

    setInsightsLoading(true);
    setError(null);
    
    try {
      console.log("Sending request to backend:", selectedText.substring(0, 100) + "...");
      
      const res = await fetch("http://127.0.0.1:8000/get-insights", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ text: selectedText })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Server error (${res.status}): ${errorText}`);
      }

      const data = await res.json();
      console.log("Received insights:", data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setInsights(data);
    } catch (err) {
      console.error("Error fetching insights:", err);
      setError(err.message || "Failed to get insights");
      setInsights({
        insight: "Unable to analyze the selected text due to an error.",
        recommendation: "Please try selecting a different text segment or check the server connection."
      });
    } finally {
      setInsightsLoading(false);
    }
  }

  async function generatePodcast() {
    if (!insights || !selectedText) {
      setError("Please wait for insights to be generated first");
      return;
    }

    setPodcastLoading(true);
    
    try {
      console.log("Generating podcast...");
      
      const res = await fetch("http://127.0.0.1:8000/generate-podcast", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          text: selectedText,
          insight: insights.insight,
          recommendation: insights.recommendation
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Server error (${res.status}): ${errorText}`);
      }

      const data = await res.json();
      console.log("Received podcast:", data);
      
      setPodcast(data);
      setShowPodcast(true);
    } catch (err) {
      console.error("Error generating podcast:", err);
      setError(err.message || "Failed to generate podcast");
    } finally {
      setPodcastLoading(false);
    }
  }

  const playPodcast = () => {
    if (!podcast || !podcast.conversation || !audioSupported) {
      if (!audioSupported) {
        setError("Audio not supported in this browser");
      }
      return;
    }
    
    setIsPlaying(true);
    setCurrentSegment(0);
    playNextSegment(0);
  };

  const playNextSegment = (segmentIndex) => {
    if (!podcast || !podcast.conversation || segmentIndex >= podcast.conversation.length) {
      setIsPlaying(false);
      setCurrentSegment(0);
      return;
    }

    setCurrentSegment(segmentIndex);
    
    const segment = podcast.conversation[segmentIndex];
    const text = segment.text;
    
    // Stop any existing speech
    if (speechUtteranceRef.current) {
      window.speechSynthesis.cancel();
    }

    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    speechUtteranceRef.current = utterance;
    
    // Configure voice settings
    utterance.rate = voiceSettings.rate;
    utterance.pitch = voiceSettings.pitch;
    utterance.volume = voiceSettings.volume;
    
    // Use different voices for different speakers
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      if (segment.speaker === 'Alex') {
        // Use a more formal/analytical voice for Alex
        const maleVoice = voices.find(voice => 
          voice.name.toLowerCase().includes('male') || 
          voice.name.toLowerCase().includes('david') ||
          voice.name.toLowerCase().includes('james')
        );
        if (maleVoice) utterance.voice = maleVoice;
      } else if (segment.speaker === 'Sam') {
        // Use a different voice for Sam
        const femaleVoice = voices.find(voice => 
          voice.name.toLowerCase().includes('female') || 
          voice.name.toLowerCase().includes('samantha') ||
          voice.name.toLowerCase().includes('karen')
        );
        if (femaleVoice) utterance.voice = femaleVoice;
      }
    }

    // Set up event handlers
    utterance.onend = () => {
      console.log(`Finished speaking segment ${segmentIndex}`);
      // Add a small pause between segments
      setTimeout(() => {
        playNextSegment(segmentIndex + 1);
      }, 500);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setError('Audio playback error occurred');
      setIsPlaying(false);
    };

    // Start speaking
    try {
      window.speechSynthesis.speak(utterance);
      console.log(`Playing segment ${segmentIndex}: ${text.substring(0, 50)}...`);
    } catch (err) {
      console.error('Error starting speech:', err);
      setError('Failed to start audio playback');
      setIsPlaying(false);
    }
  };

  const stopPodcast = () => {
    setIsPlaying(false);
    setCurrentSegment(0);
    
    // Stop speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    if (speechUtteranceRef.current) {
      speechUtteranceRef.current = null;
    }
    
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  };

  const pausePodcast = () => {
    setIsPlaying(false);
    
    // Pause speech synthesis
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  };

  const resumePodcast = () => {
    if (!isPlaying && currentSegment < podcast?.conversation?.length) {
      setIsPlaying(true);
      
      // Resume speech synthesis if paused
      if (window.speechSynthesis && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        // If not paused, continue from current segment
        playNextSegment(currentSegment);
      }
    }
  };

  // Test audio functionality
  const testAudio = () => {
    if (!audioSupported) {
      alert('Speech synthesis not supported in this browser');
      return;
    }

    const testUtterance = new SpeechSynthesisUtterance("Hello! This is a test of the audio system. If you can hear this, audio is working correctly.");
    testUtterance.rate = voiceSettings.rate;
    testUtterance.pitch = voiceSettings.pitch;
    testUtterance.volume = voiceSettings.volume;
    
    try {
      window.speechSynthesis.speak(testUtterance);
    } catch (err) {
      console.error('Test audio error:', err);
      alert('Audio test failed: ' + err.message);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPodcast();
    };
  }, []);

  async function loadPdf() {
    setLoading(true);
    try {
      console.log("PdfViewer: final PDF URL used ->", pdfUrl);
      const loadingTask = pdfjsLib.getDocument({ url: pdfUrl, withCredentials: false });
      const pdf = await loadingTask.promise;
      pdfRef.current = pdf;
      await renderAllPages(pdf);
    } catch (err) {
      console.error("Error loading PDF (PdfViewer):", err);
      setError("Failed to load PDF: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function renderAllPages(pdf) {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    renderedPagesRef.current.clear();

    for (let i = 1; i <= pdf.numPages; i++) {
      await renderPage(pdf, i);
    }
  }

  async function renderPage(pdf, pageNum) {
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const pageContainer = document.createElement("div");
      pageContainer.className = "pdf-page-container";
      pageContainer.style.cssText = `
        position: relative;
        width: ${Math.floor(viewport.width)}px;
        height: ${Math.floor(viewport.height)}px;
        margin: 8px auto;
      `;

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.cssText = `
        width: ${Math.floor(viewport.width)}px;
        height: ${Math.floor(viewport.height)}px;
      `;

      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

      const renderContext = {
        canvasContext: context,
        transform,
        viewport,
      };

      const textLayerDiv = document.createElement("div");
      textLayerDiv.className = "textLayer";
      textLayerDiv.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        width: ${Math.floor(viewport.width)}px;
        height: ${Math.floor(viewport.height)}px;
      `;
      
      const pageNumberDiv = document.createElement("div");
      pageNumberDiv.className = "page-number-label";
      pageNumberDiv.textContent = `Page ${pageNum} / ${pdf.numPages}`;
      pageNumberDiv.style.cssText = `
        position: absolute;
        top: 5px;
        right: 5px;
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 12px;
      `;

      pageContainer.appendChild(canvas);
      pageContainer.appendChild(textLayerDiv);
      pageContainer.appendChild(pageNumberDiv);
      containerRef.current.appendChild(pageContainer);

      await page.render(renderContext).promise;

      const textContent = await page.getTextContent();
      pdfjsLib.renderTextLayer({
        textContent,
        container: textLayerDiv,
        viewport,
        textDivs: [],
      });

      renderedPagesRef.current.set(pageNum, {
        page,
        viewport,
        textContent,
        container: pageContainer,
        textLayerDiv,
      });
    } catch (err) {
      console.error(`Error rendering page ${pageNum}:`, err);
    }
  }

  function navigateToSection(section) {
    if (!section) return;
    const pageNum = typeof section.page === "number" ? section.page + 1 : section.page;
    const pageInfo = renderedPagesRef.current.get(pageNum);
    if (!pageInfo) {
      console.warn("Target page not yet rendered:", pageNum);
      return;
    }

    pageInfo.container.scrollIntoView({ behavior: "smooth", block: "start" });
    clearHighlights();
    setTimeout(() => {
      highlightTextOnPage(section.text, pageInfo);
    }, 300);
  }

  function clearHighlights() {
    renderedPagesRef.current.forEach((pinfo) => {
      const spans = pinfo.textLayerDiv.querySelectorAll("span");
      spans.forEach((s) => s.classList.remove("highlighted"));
    });
  }

  function highlightTextOnPage(text, pageInfo) {
    if (!text || !pageInfo) return;
    const target = text.replace(/\s+/g, " ").trim().toLowerCase();
    const spans = Array.from(pageInfo.textLayerDiv.querySelectorAll("span"));
    if (!spans.length) return;

    spans.forEach(s => s.classList.remove("highlighted"));

    for (let i = 0; i < spans.length; i++) {
      let combined = "";
      const matchedSpans = [];

      for (let j = i; j < spans.length; j++) {
        combined += (spans[j].textContent || "").replace(/\s+/g, " ");
        matchedSpans.push(spans[j]);
        const normalized = combined.trim().toLowerCase();

        if (normalized.includes(target)) {
          matchedSpans.forEach(s => s.classList.add("highlighted"));
          return;
        }

        if (combined.length > target.length + 50) break;
      }
    }
  }

  const zoomIn = () => setScale((s) => Math.min(2.5, +(s + 0.25).toFixed(2)));
  const zoomOut = () => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)));

  return (
    <div style={{ display: "flex" }}>
      {/* PDF Viewer Section */}
      <div style={{ flex: hasSelectedText ? 3 : 1, transition: "flex 0.3s ease" }}>
        <div style={{ 
          padding: '10px',
          background: '#f8f9fa',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <button onClick={zoomOut} style={{ padding: '5px 10px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>🔍➖</button>
          <span style={{ minWidth: '50px', textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} style={{ padding: '5px 10px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>🔍➕</button>
          {audioSupported && (
            <button 
              onClick={testAudio}
              style={{ 
                padding: '5px 10px', 
                border: '1px solid #28a745', 
                borderRadius: '4px', 
                cursor: 'pointer',
                background: '#28a745',
                color: 'white',
                marginLeft: 'auto'
              }}
            >
              🔊 Test Audio
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>Loading PDF...</div>
        ) : error ? (
          <div style={{ color: 'red', padding: '20px' }}>Error: {error}</div>
        ) : (
          <div
            ref={containerRef}
            style={{ 
              overflowY: "auto", 
              maxHeight: "80vh",
              padding: '10px'
            }}
          />
        )}
      </div>

      {/* Insights Sidebar */}
      {hasSelectedText && (
        <div style={{
          flex: 1,
          background: "#f8f9fa",
          color: "black",
          padding: "1rem",
          borderLeft: "1px solid #ccc",
          minHeight: "80vh",
          animation: "slideIn 0.3s ease"
        }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginBottom: "1rem" 
          }}>
            <h3 style={{ margin: 0 }}>AI Insights & Recommendations</h3>
            <button
              onClick={closeInsights}
              style={{
                background: "transparent",
                border: "1px solid #ccc",
                borderRadius: "4px",
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: "16px",
                color: "#666"
              }}
              title="Close insights"
            >
              ✕
            </button>
          </div>

          {/* Navigation Tabs */}
          <div style={{ marginBottom: "1rem", borderBottom: "1px solid #ddd" }}>
            <button
              onClick={() => setShowPodcast(false)}
              style={{
                background: !showPodcast ? "#007bff" : "transparent",
                color: !showPodcast ? "white" : "#007bff",
                border: "1px solid #007bff",
                borderRadius: "4px 4px 0 0",
                padding: "8px 16px",
                cursor: "pointer",
                marginRight: "4px"
              }}
            >
              📊 Insights
            </button>
            <button
              onClick={() => setShowPodcast(true)}
              style={{
                background: showPodcast ? "#28a745" : "transparent",
                color: showPodcast ? "white" : "#28a745",
                border: "1px solid #28a745",
                borderRadius: "4px 4px 0 0",
                padding: "8px 16px",
                cursor: "pointer"
              }}
              disabled={!insights || insightsLoading}
            >
              🎙️ Podcast
            </button>
          </div>
          
          {!showPodcast ? (
            // Insights Tab Content
            <>
              {insightsLoading ? (
                <div>
                  <p>🤖 Analyzing selected text...</p>
                  <div style={{ 
                    width: '100%', 
                    height: '4px', 
                    background: '#e0e0e0', 
                    borderRadius: '2px',
                    overflow: 'hidden' 
                  }}>
                    <div style={{
                      width: '50%',
                      height: '100%',
                      background: '#007bff',
                      animation: 'loading 1.5s infinite'
                    }}></div>
                  </div>
                </div>
              ) : error ? (
                <div style={{ 
                  color: 'red', 
                  padding: '10px', 
                  background: '#ffe6e6', 
                  borderRadius: '4px' 
                }}>
                  <strong>Error:</strong> {error}
                  <br />
                  <small>Please try selecting text again or check server connection.</small>
                </div>
              ) : insights ? (
                <div>
                  <div style={{ 
                    marginBottom: '20px', 
                    padding: '10px', 
                    background: '#e8f4f8', 
                    borderRadius: '4px' 
                  }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>💡 Insight</h4>
                    <p style={{ margin: 0, lineHeight: '1.5' }}>{insights.insight}</p>
                  </div>
                  <div style={{ 
                    marginBottom: '20px', 
                    padding: '10px', 
                    background: '#f0f8e8', 
                    borderRadius: '4px' 
                  }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#006600' }}>🎯 Recommendation</h4>
                    <p style={{ margin: 0, lineHeight: '1.5' }}>{insights.recommendation}</p>
                  </div>
                  
                  <button
                    onClick={generatePodcast}
                    disabled={podcastLoading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: podcastLoading ? '#ccc' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: podcastLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    {podcastLoading ? '🎙️ Generating Podcast...' : '🎙️ Generate Podcast Discussion'}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            // Podcast Tab Content
            <div>
              {podcastLoading ? (
                <div>
                  <p>🎙️ Creating podcast discussion...</p>
                  <div style={{ 
                    width: '100%', 
                    height: '4px', 
                    background: '#e0e0e0', 
                    borderRadius: '2px',
                    overflow: 'hidden' 
                  }}>
                    <div style={{
                      width: '70%',
                      height: '100%',
                      background: '#28a745',
                      animation: 'loading 2s infinite'
                    }}></div>
                  </div>
                </div>
              ) : podcast ? (
                <div>
                  <div style={{ 
                    marginBottom: '15px', 
                    padding: '10px', 
                    background: '#e8f5e8', 
                    borderRadius: '4px' 
                  }}>
                    <h4 style={{ margin: '0 0 5px 0', color: '#28a745' }}>🎙️ {podcast.title}</h4>
                    <small style={{ color: '#666' }}>Duration: {podcast.duration_estimate}</small>
                  </div>
                  
                  {/* Audio Settings */}
                  <div style={{ 
                    marginBottom: '15px', 
                    padding: '10px', 
                    background: '#f0f0f0', 
                    borderRadius: '4px' 
                  }}>
                    <h5 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>🔧 Audio Settings</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#666' }}>Speed: {voiceSettings.rate}x</label>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={voiceSettings.rate}
                          onChange={(e) => setVoiceSettings(prev => ({...prev, rate: parseFloat(e.target.value)}))}
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#666' }}>Volume: {Math.round(voiceSettings.volume * 100)}%</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={voiceSettings.volume}
                          onChange={(e) => setVoiceSettings(prev => ({...prev, volume: parseFloat(e.target.value)}))}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Podcast Controls */}
                  <div style={{ 
                    marginBottom: '15px', 
                    padding: '10px', 
                    background: '#f8f9fa', 
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {!isPlaying ? (
                        <button
                          onClick={currentSegment > 0 ? resumePodcast : playPodcast}
                          disabled={!audioSupported}
                          style={{
                            background: audioSupported ? '#28a745' : '#ccc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            cursor: audioSupported ? 'pointer' : 'not-allowed',
                            fontSize: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title={audioSupported ? (currentSegment > 0 ? "Resume podcast" : "Play podcast") : "Audio not supported"}
                        >
                          ▶️
                        </button>
                      ) : (
                        <button
                          onClick={pausePodcast}
                          style={{
                            background: '#ffc107',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Pause podcast"
                        >
                          ⏸️
                        </button>
                      )}
                      
                      <button
                        onClick={stopPodcast}
                        style={{
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '40px',
                          height: '40px',
                          cursor: 'pointer',
                          fontSize: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Stop podcast"
                      >
                        ⏹️
                      </button>
                    </div>
                    
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {isPlaying ? '🔴 Playing' : currentSegment > 0 ? '⏸️ Paused' : '⏹️ Stopped'} 
                      {podcast.conversation && ` • ${currentSegment + 1}/${podcast.conversation.length}`}
                    </div>
                  </div>

                  {!audioSupported && (
                    <div style={{ 
                      marginBottom: '15px', 
                      padding: '10px', 
                      background: '#fff3cd', 
                      border: '1px solid #ffeaa7', 
                      borderRadius: '4px',
                      color: '#856404' 
                    }}>
                      <strong>⚠️ Audio Not Available</strong>
                      <br />
                      <small>Speech synthesis is not supported in this browser. Try Chrome, Safari, or Edge for audio playback.</small>
                    </div>
                  )}
                  
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {podcast.conversation && podcast.conversation.map((item, index) => (
                      <div 
                        key={index} 
                        style={{ 
                          marginBottom: '12px', 
                          padding: '10px', 
                          background: item.speaker === 'Alex' ? '#f0f8ff' : '#fff8f0',
                          borderLeft: `4px solid ${item.speaker === 'Alex' ? '#007bff' : '#ff8c00'}`,
                          borderRadius: '0 4px 4px 0',
                          position: 'relative',
                          opacity: index === currentSegment && isPlaying ? 1 : index < currentSegment ? 0.6 : 0.8,
                          transform: index === currentSegment && isPlaying ? 'scale(1.02)' : 'scale(1)',
                          transition: 'all 0.3s ease',
                          border: index === currentSegment && isPlaying ? '2px solid #28a745' : 'none'
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          marginBottom: '5px' 
                        }}>
                          <strong style={{ 
                            color: item.speaker === 'Alex' ? '#007bff' : '#ff8c00',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            {item.speaker === 'Alex' ? '👨‍💼 Alex' : '👩‍🎓 Sam'}
                            {index === currentSegment && isPlaying && (
                              <span style={{ fontSize: '10px', color: '#28a745' }}>🔊</span>
                            )}
                          </strong>
                          <small style={{ color: '#666' }}>{item.timestamp}</small>
                        </div>
                        <p style={{ margin: 0, lineHeight: '1.4', fontSize: '14px' }}>{item.text}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '10px', 
                    background: '#f8f9fa', 
                    borderRadius: '4px', 
                    textAlign: 'center' 
                  }}>
                    <small style={{ color: '#666' }}>
                      💡 Click ▶️ to start the podcast. Audio will play automatically through each segment using your browser's text-to-speech.
                    </small>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  <p>📻 No podcast generated yet.</p>
                  <p>Switch to the Insights tab and click "Generate Podcast Discussion" to create an AI-powered conversation.</p>
                </div>
              )}
            </div>
          )}

          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{ 
              marginTop: '20px', 
              padding: '10px', 
              background: '#f0f0f0', 
              borderRadius: '4px',
              fontSize: '12px' 
            }}>
              <strong>Debug Info:</strong>
              <br />
              Selected Text Length: {selectedText.length}
              <br />
              Audio Supported: {audioSupported.toString()}
              <br />
              Speech Synthesis Available: {(typeof window !== 'undefined' && 'speechSynthesis' in window).toString()}
              <br />
              Currently Playing: {currentlyPlaying?.toString() || 'None'}
              <br />
              Current Segment: {currentSegment}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        
        .highlighted {
          background-color: yellow !important;
          padding: 2px;
          border-radius: 2px;
        }
        
        .textLayer span {
          position: absolute;
          white-space: pre;
          cursor: text;
          transform-origin: 0% 0%;
        }
      `}</style>
    </div>
  );
});

PDFViewer.displayName = "PDFViewer";
export default PDFViewer;