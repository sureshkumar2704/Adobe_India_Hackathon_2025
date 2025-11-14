import React, { useState } from 'react';

const SectionSidebar = ({ title, sections, onSectionClick }) => {
  const [activeSection, setActiveSection] = useState(null);

  const handleSectionClick = (section, index) => {
    setActiveSection(index);
    onSectionClick(section);
  };

  const getLevelClass = (level) => {
    switch(level) {
      case 'H1': return 'level-1';
      case 'H2': return 'level-2';
      case 'H3': return 'level-3';
      case 'H4': return 'level-4';
      default: return 'level-1';
    }
  };

  return (
    <div className="section-sidebar">
      <div className="sidebar-header">
        <h2>📚 Document Outline</h2>
        {title && (
          <div className="document-title">
            <strong>{title}</strong>
          </div>
        )}
      </div>
      
      <div className="sections-list">
        {sections.length === 0 ? (
          <div className="no-sections">
            <p>No sections found in this document</p>
          </div>
        ) : (
          sections.map((section, index) => (
            <div
              key={index}
              className={`section-item ${getLevelClass(section.level)} ${activeSection === index ? 'active' : ''}`}
              onClick={() => handleSectionClick(section, index)}
            >
              <div className="section-content">
                <span className="section-level">{section.level}</span>
                <span className="section-text">{section.text}</span>
                <span className="section-page">Page {section.page + 1}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SectionSidebar;