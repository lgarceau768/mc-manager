import { useState, useEffect, useCallback, useMemo } from 'react';
import { serverApi } from '../services/api';
import { SERVER_TYPE_OPTIONS } from '../utils/serverTypes';
import TemplateSuggestions from './TemplateSuggestions';
import TemplateBrowser from './TemplateBrowser';
import './CreateServerForm.css';

const PORT_RANGE_START = Number(import.meta.env.VITE_PORT_RANGE_START || 25565);
const PORT_RANGE_END = Number(import.meta.env.VITE_PORT_RANGE_END || 25600);
const DEFAULT_VERSION_OPTIONS = ['1.21.1', '1.21', '1.20.4', '1.20.1', '1.19.4', '1.18.2', '1.16.5', '1.12.2'];
const DEFAULT_VERSION = DEFAULT_VERSION_OPTIONS[0];

const compareMinecraftVersions = (a, b) => {
  if (a === b) return 0;
  const parseParts = (value) => String(value)
    .split('.')
    .map((part) => {
      const numeric = parseInt(part.replace(/[^0-9]/g, ''), 10);
      return Number.isNaN(numeric) ? null : numeric;
    });
  const aParts = parseParts(a);
  const bParts = parseParts(b);
  const length = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < length; i++) {
    const aVal = aParts[i];
    const bVal = bParts[i];
    if (aVal === null || bVal === null) {
      continue;
    }
    if (aVal !== bVal) {
      return aVal - bVal;
    }
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
};

const sortVersionsDesc = (versions = []) => {
  return versions
    .map((version) => (typeof version === 'string' ? version.trim() : version))
    .filter((version) => Boolean(version))
    .map(String)
    .sort((a, b) => compareMinecraftVersions(b, a));
};

function CreateServerForm({ onClose, onCreate }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'PAPER',
    version: DEFAULT_VERSION,
    memory: '4G',
    cpuLimit: 2.0,
    modpack: '',
    port: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modpackOptions, setModpackOptions] = useState([]);
  const [modpackLoading, setModpackLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateBrowser, setShowTemplateBrowser] = useState(false);

  const fetchModpacks = useCallback(async (type) => {
    try {
      setModpackLoading(true);
      const packs = await serverApi.listSavedModpacks(type);
      setModpackOptions(packs || []);
    } catch (err) {
      console.error('Failed to load modpacks', err);
      setModpackOptions([]);
    } finally {
      setModpackLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModpacks(formData.type);
  }, [formData.type, fetchModpacks]);

  const selectedModpack = useMemo(
    () => modpackOptions.find((pack) => pack.filename === formData.modpack),
    [modpackOptions, formData.modpack]
  );

  const currentVersionOptions = useMemo(() => {
    // If modpack specifies versions, use those
    if (selectedModpack?.gameVersions?.length) {
      return sortVersionsDesc(selectedModpack.gameVersions);
    }
    // If template specifies a version, include it in options
    if (selectedTemplate?.minecraftVersion) {
      const templateVersion = selectedTemplate.minecraftVersion;
      if (!DEFAULT_VERSION_OPTIONS.includes(templateVersion)) {
        return sortVersionsDesc([templateVersion, ...DEFAULT_VERSION_OPTIONS]);
      }
    }
    return DEFAULT_VERSION_OPTIONS;
  }, [selectedModpack, selectedTemplate]);

  useEffect(() => {
    setFormData((prev) => {
      if (currentVersionOptions.length === 0) {
        return { ...prev, version: '' };
      }
      if (!prev.version || !currentVersionOptions.includes(prev.version)) {
        return { ...prev, version: currentVersionOptions[0] };
      }
      return prev;
    });
  }, [currentVersionOptions]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'type') {
      setFormData((prev) => ({
        ...prev,
        type: value,
        modpack: '',
        version: DEFAULT_VERSION
      }));
      setSelectedTemplate(null);
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);

    // Apply all template settings to form
    const updates = {};

    // Apply server type if template specifies it
    if (template.serverType) {
      const typeValue = template.serverType.toUpperCase();
      if (SERVER_TYPE_OPTIONS.some(opt => opt.value === typeValue)) {
        updates.type = typeValue;
      }
    }

    // Apply memory if template specifies it
    if (template.memory) {
      // Normalize memory format (e.g., "4G", "4g", "4GB" -> "4G")
      const memMatch = template.memory.match(/^(\d+)[gG][bB]?$/);
      if (memMatch) {
        updates.memory = `${memMatch[1]}G`;
      } else {
        updates.memory = template.memory;
      }
    }

    // Apply minecraft version if template specifies it
    if (template.minecraftVersion) {
      updates.version = template.minecraftVersion;
    }

    if (Object.keys(updates).length > 0) {
      setFormData((prev) => ({
        ...prev,
        ...updates
      }));
    }
  };

  // Track which fields were set by template
  const templateFields = useMemo(() => {
    if (!selectedTemplate) return {};
    return {
      type: !!selectedTemplate.serverType,
      memory: !!selectedTemplate.memory,
      version: !!selectedTemplate.minecraftVersion
    };
  }, [selectedTemplate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        ...formData,
        cpuLimit: formData.cpuLimit === '' ? undefined : Number(formData.cpuLimit),
        port: formData.port === '' ? undefined : Number(formData.port),
        modpack: formData.modpack || undefined,
        templateId: selectedTemplate?.id || undefined
      };
      const newServer = await serverApi.createServer(payload);
      onCreate(newServer);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Server</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Server Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              pattern="(?:[a-zA-Z0-9]|-)+"
              minLength={3}
              maxLength={32}
              placeholder="my-minecraft-server"
            />
            <small>Alphanumeric characters and hyphens only (3-32 chars)</small>
          </div>

          <div className={`form-group ${templateFields.type ? 'from-template' : ''}`}>
            <label htmlFor="type">
              Server Type *
              {templateFields.type && <span className="template-badge">from template</span>}
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              {SERVER_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small>
              {templateFields.type
                ? `Set by template: ${selectedTemplate?.name}`
                : 'Choose the mod loader/platform to install'}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="modpack">Saved Modpack</label>
            <div className="modpack-select-row">
              <select
                id="modpack"
                name="modpack"
                value={formData.modpack}
                onChange={handleChange}
                disabled={modpackLoading || modpackOptions.length === 0}
              >
                <option value="">None</option>
                {modpackOptions.map((pack) => (
                  <option key={pack.filename} value={pack.filename}>
                    {pack.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => fetchModpacks(formData.type)}
                disabled={modpackLoading}
              >
                ↻
              </button>
            </div>
            <small>Select a saved modpack for this server type (optional)</small>
          </div>

          <TemplateSuggestions
            serverType={formData.type}
            modpackUrl={formData.modpack ? selectedModpack?.sourceUrl : null}
            onSelect={handleTemplateSelect}
          />

          <button
            type="button"
            className="btn btn-link browse-templates-btn"
            onClick={() => setShowTemplateBrowser(true)}
          >
            Browse all templates...
          </button>

          {selectedTemplate && (
            <div className="selected-template-info">
              <span className="template-label">Using template:</span>
              <span className="template-name">{selectedTemplate.name}</span>
              <button
                type="button"
                className="clear-template-btn"
                onClick={() => setSelectedTemplate(null)}
                title="Clear template selection"
              >
                ×
              </button>
            </div>
          )}

          <div className={`form-group ${templateFields.version ? 'from-template' : ''}`}>
            <label htmlFor="version">
              Minecraft Version *
              {templateFields.version && <span className="template-badge">from template</span>}
            </label>
            <select
              id="version"
              name="version"
              value={formData.version}
              onChange={handleChange}
              required
            >
              {currentVersionOptions.map((version) => (
                <option key={version} value={version}>
                  {version}{templateFields.version && version === selectedTemplate?.minecraftVersion ? ' (template)' : ''}
                </option>
              ))}
            </select>
            <small>
              {templateFields.version
                ? `Set by template: ${selectedTemplate?.name}`
                : selectedModpack?.gameVersions?.length
                  ? 'Versions provided by the selected modpack (newest first)'
                  : 'Common Minecraft versions (select the one your mods require)'}
            </small>
          </div>

          <div className={`form-group ${templateFields.memory ? 'from-template' : ''}`}>
            <label htmlFor="memory">
              Memory Allocation *
              {templateFields.memory && <span className="template-badge">from template</span>}
            </label>
            <select
              id="memory"
              name="memory"
              value={formData.memory}
              onChange={handleChange}
              required
            >
              <option value="1G">1 GB</option>
              <option value="2G">2 GB</option>
              <option value="4G">4 GB{!templateFields.memory ? ' (Recommended)' : ''}</option>
              <option value="6G">6 GB</option>
              <option value="8G">8 GB</option>
              <option value="12G">12 GB</option>
              <option value="16G">16 GB</option>
            </select>
            <small>
              {templateFields.memory
                ? `Set by template: ${selectedTemplate?.name} (${selectedTemplate?.memory})`
                : 'RAM allocated to the server'}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="cpuLimit">CPU Limit (cores)</label>
            <input
              type="number"
              id="cpuLimit"
              name="cpuLimit"
              value={formData.cpuLimit}
              onChange={handleChange}
              min={0.5}
              max={8}
              step={0.5}
              placeholder="2.0"
            />
            <small>Number of CPU cores (0.5 - 8.0)</small>
          </div>

          <div className="form-group">
            <label htmlFor="port">Server Port</label>
            <input
              type="number"
              id="port"
              name="port"
              value={formData.port}
              onChange={handleChange}
              min={PORT_RANGE_START}
              max={PORT_RANGE_END}
              placeholder={`${PORT_RANGE_START}`}
            />
            <small>
              {`Leave blank to auto-assign the next available port (${PORT_RANGE_START}-${PORT_RANGE_END} by default)`}
            </small>
          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Server'}
            </button>
          </div>
        </form>
      </div>

      {showTemplateBrowser && (
        <TemplateBrowser
          initialServerType={formData.type}
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplateBrowser(false)}
        />
      )}
    </div>
  );
}

export default CreateServerForm;
