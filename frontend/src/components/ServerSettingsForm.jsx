import { useEffect, useState } from 'react';
import { serverApi } from '../services/api';
import './ServerSettingsForm.css';

const defaultSettings = {
  motd: '',
  maxPlayers: 20,
  difficulty: 'easy',
  pvp: true,
  whitelist: false,
  allowNether: true,
  hardcore: false,
  viewDistance: 10
};

function ServerSettingsForm({ serverId, initialSettings, onUpdated }) {
  const [form, setForm] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!initialSettings) return;
    if (isDirty) return;

    setForm({
      ...defaultSettings,
      ...initialSettings
    });
  }, [initialSettings, isDirty]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
    setIsDirty(true);
  };

  const handleNumberChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value === '' ? '' : Number(value)
    }));
    setIsDirty(true);
  };

  const handleCheckbox = (event) => {
    const { name, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: checked
    }));
    setIsDirty(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);

    try {
      const updated = await serverApi.updateServerSettings(serverId, form);
      setStatus({ type: 'success', message: 'Server settings updated' });
      setIsDirty(false);
      setForm({
        ...defaultSettings,
        ...(updated?.settings || form)
      });
      onUpdated?.(updated);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="server-settings-card">
      <h3>Server Settings</h3>
      <form className="server-settings-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="motd">MOTD</label>
          <textarea
            id="motd"
            name="motd"
            value={form.motd}
            onChange={handleChange}
            rows={2}
            placeholder="Welcome to my server!"
          />
        </div>

        <div className="form-grid">
          <div className="form-row">
            <label htmlFor="maxPlayers">Max Players</label>
            <input
              type="number"
              id="maxPlayers"
              name="maxPlayers"
              min={1}
              max={500}
              value={form.maxPlayers}
              onChange={handleNumberChange}
            />
          </div>

          <div className="form-row">
            <label htmlFor="viewDistance">View Distance</label>
            <input
              type="number"
              id="viewDistance"
              name="viewDistance"
              min={2}
              max={32}
              value={form.viewDistance}
              onChange={handleNumberChange}
            />
          </div>

          <div className="form-row">
            <label htmlFor="difficulty">Difficulty</label>
            <select
              id="difficulty"
              name="difficulty"
              value={form.difficulty}
              onChange={handleChange}
            >
              <option value="peaceful">Peaceful</option>
              <option value="easy">Easy</option>
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div className="checkbox-grid">
          <label>
            <input
              type="checkbox"
              name="pvp"
              checked={form.pvp}
              onChange={handleCheckbox}
            />
            PvP Enabled
          </label>
          <label>
            <input
              type="checkbox"
              name="whitelist"
              checked={form.whitelist}
              onChange={handleCheckbox}
            />
            Whitelist
          </label>
          <label>
            <input
              type="checkbox"
              name="allowNether"
              checked={form.allowNether}
              onChange={handleCheckbox}
            />
            Allow Nether
          </label>
          <label>
            <input
              type="checkbox"
              name="hardcore"
              checked={form.hardcore}
              onChange={handleCheckbox}
            />
            Hardcore Mode
          </label>
        </div>

        {status && (
          <div className={`settings-status status-${status.type}`}>
            {status.message}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ServerSettingsForm;
