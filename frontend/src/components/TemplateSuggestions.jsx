import { useState, useEffect } from 'react';
import { templateApi } from '../services/api';
import './TemplateSuggestions.css';

function TemplateSuggestions({ serverType, modpackUrl, onSelect }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const loadSuggestions = async () => {
      if (!serverType && !modpackUrl) {
        setSuggestions([]);
        return;
      }

      try {
        setLoading(true);
        const data = await templateApi.getSuggestions({
          serverType,
          modpack: modpackUrl
        });
        setSuggestions(data.suggestions || []);
      } catch (err) {
        console.error('Failed to load suggestions:', err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    loadSuggestions();
  }, [serverType, modpackUrl]);

  const handleSelect = (template) => {
    setSelectedId(template.id);
    onSelect?.(template);
  };

  if (loading) {
    return (
      <div className="template-suggestions loading">
        Loading template suggestions...
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="template-suggestions">
      <div className="suggestions-header">
        <h4>Suggested Templates</h4>
        <span className="suggestions-hint">
          Select a template to use as a starting point
        </span>
      </div>

      <div className="suggestions-list">
        {suggestions.map((template) => (
          <button
            key={template.id}
            className={`suggestion-card ${selectedId === template.id ? 'selected' : ''}`}
            onClick={() => handleSelect(template)}
            type="button"
          >
            <div className="suggestion-header">
              <span className="suggestion-name">{template.name}</span>
              {template.isModpack && (
                <span className="suggestion-badge modpack">Modpack</span>
              )}
              {template.serverType && (
                <span className={`suggestion-badge type-${template.serverType?.toLowerCase()}`}>
                  {template.serverType}
                </span>
              )}
            </div>

            {template.description && (
              <p className="suggestion-description">{template.description}</p>
            )}

            <div className="suggestion-meta">
              {template.matchReason && (
                <span className="match-reason">{template.matchReason}</span>
              )}
              {template.memory && (
                <span className="memory-hint">Memory: {template.memory}</span>
              )}
            </div>

            {template.tags?.length > 0 && (
              <div className="suggestion-tags">
                {template.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default TemplateSuggestions;
