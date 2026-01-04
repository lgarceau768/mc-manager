import { useState, useEffect, useMemo } from 'react';
import { templateApi } from '../services/api';
import './TemplateBrowser.css';

function TemplateBrowser({ onSelect, onClose, initialServerType }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState(initialServerType || '');
  const [filterModpack, setFilterModpack] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await templateApi.listTemplates({
          serverType: filterType || undefined,
          hasModpack: filterModpack === 'yes' ? true : filterModpack === 'no' ? false : undefined,
          search: searchQuery || undefined
        });
        setTemplates(data.templates || []);
      } catch (err) {
        console.error('Failed to load templates:', err);
        setError(err.message);
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(loadTemplates, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, filterType, filterModpack]);

  const serverTypes = useMemo(() => {
    const types = new Set();
    templates.forEach(t => {
      if (t.serverType) types.add(t.serverType);
    });
    return Array.from(types).sort();
  }, [templates]);

  const handleSelect = (template) => {
    setSelectedId(template.id);
  };

  const handleConfirm = () => {
    const template = templates.find(t => t.id === selectedId);
    if (template) {
      onSelect?.(template);
      onClose?.();
    }
  };

  const selectedTemplate = templates.find(t => t.id === selectedId);

  return (
    <div className="template-browser-overlay" onClick={onClose}>
      <div className="template-browser" onClick={(e) => e.stopPropagation()}>
        <div className="template-browser-header">
          <h2>Browse Templates</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="template-browser-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-row">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All Server Types</option>
              <option value="paper">Paper</option>
              <option value="forge">Forge</option>
              <option value="fabric">Fabric</option>
              <option value="neoforge">NeoForge</option>
              <option value="quilt">Quilt</option>
              <option value="vanilla">Vanilla</option>
            </select>

            <select
              value={filterModpack}
              onChange={(e) => setFilterModpack(e.target.value)}
            >
              <option value="">All Templates</option>
              <option value="yes">Modpacks Only</option>
              <option value="no">Non-Modpacks Only</option>
            </select>
          </div>
        </div>

        <div className="template-browser-content">
          {loading && (
            <div className="templates-loading">
              Loading templates...
            </div>
          )}

          {error && (
            <div className="templates-error">
              Failed to load templates: {error}
            </div>
          )}

          {!loading && !error && templates.length === 0 && (
            <div className="templates-empty">
              No templates found matching your criteria.
            </div>
          )}

          {!loading && !error && templates.length > 0 && (
            <div className="templates-grid">
              {templates.map((template) => (
                <button
                  key={template.id}
                  className={`template-card ${selectedId === template.id ? 'selected' : ''}`}
                  onClick={() => handleSelect(template)}
                  type="button"
                >
                  <div className="template-card-header">
                    <span className="template-card-name">{template.name}</span>
                    <div className="template-card-badges">
                      {template.isModpack && (
                        <span className="badge modpack">Modpack</span>
                      )}
                      {template.serverType && (
                        <span className={`badge type-${template.serverType?.toLowerCase()}`}>
                          {template.serverType}
                        </span>
                      )}
                    </div>
                  </div>

                  {template.description && (
                    <p className="template-card-description">
                      {template.description}
                    </p>
                  )}

                  <div className="template-card-meta">
                    {template.memory && (
                      <span className="meta-item">
                        Memory: {template.memory}
                      </span>
                    )}
                    {template.minecraftVersion && (
                      <span className="meta-item">
                        MC: {template.minecraftVersion}
                      </span>
                    )}
                  </div>

                  {template.tags?.length > 0 && (
                    <div className="template-card-tags">
                      {template.tags.slice(0, 5).map((tag) => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedTemplate && (
          <div className="template-browser-preview">
            <h4>Selected: {selectedTemplate.name}</h4>
            {selectedTemplate.description && (
              <p>{selectedTemplate.description}</p>
            )}
            <div className="preview-details">
              {selectedTemplate.serverType && (
                <span>Type: {selectedTemplate.serverType}</span>
              )}
              {selectedTemplate.memory && (
                <span>Memory: {selectedTemplate.memory}</span>
              )}
              {selectedTemplate.minecraftVersion && (
                <span>Version: {selectedTemplate.minecraftVersion}</span>
              )}
            </div>
          </div>
        )}

        <div className="template-browser-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!selectedId}
            onClick={handleConfirm}
          >
            Use Template
          </button>
        </div>
      </div>
    </div>
  );
}

export default TemplateBrowser;
