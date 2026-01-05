import { useState, useEffect } from 'react';
import { notificationApi } from '../../services/api';
import './NotificationsTab.css';

function NotificationsTab({ serverId }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [showWebhookField, setShowWebhookField] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [serverId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationApi.getSettings(serverId);
      setSettings(data);
      setWebhookUrl(data.discordWebhookUrl || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const updates = {
        enabled: settings.enabled,
        events: settings.events
      };

      // Only include webhook URL if it was changed
      if (showWebhookField && webhookUrl !== '••••••••') {
        updates.discordWebhookUrl = webhookUrl;
      }

      const updated = await notificationApi.updateSettings(serverId, updates);
      setSettings(updated);
      setWebhookUrl(updated.discordWebhookUrl || '');
      setShowWebhookField(false);
      setSuccess('Settings saved successfully!');

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setError(null);
      setSuccess(null);

      const urlToTest = showWebhookField && webhookUrl !== '••••••••' ? webhookUrl : undefined;
      await notificationApi.testWebhook(serverId, urlToTest);
      setSuccess('Test notification sent! Check your Discord channel.');

      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  const toggleEnabled = () => {
    setSettings({ ...settings, enabled: !settings.enabled });
  };

  const toggleEvent = (eventKey) => {
    setSettings({
      ...settings,
      events: {
        ...settings.events,
        [eventKey]: !settings.events[eventKey]
      }
    });
  };

  if (loading) {
    return <div className="notifications-tab loading">Loading notification settings...</div>;
  }

  const eventLabels = {
    serverStart: 'Server Started',
    serverStop: 'Server Stopped',
    serverError: 'Server Error',
    playerJoin: 'Player Joined',
    playerLeave: 'Player Left',
    backupComplete: 'Backup Complete',
    backupFailed: 'Backup Failed'
  };

  const eventDescriptions = {
    serverStart: 'Notify when the server starts successfully',
    serverStop: 'Notify when the server is stopped',
    serverError: 'Notify when the server encounters an error',
    playerJoin: 'Notify when a player joins the server',
    playerLeave: 'Notify when a player leaves the server',
    backupComplete: 'Notify when a backup completes successfully',
    backupFailed: 'Notify when a backup fails'
  };

  return (
    <div className="notifications-tab">
      <div className="notifications-card">
        <div className="card-header">
          <h3>Discord Notifications</h3>
          <p className="card-description">
            Receive notifications about server events in your Discord channel.
          </p>
        </div>

        {error && (
          <div className="notification-alert error">
            {error}
          </div>
        )}

        {success && (
          <div className="notification-alert success">
            {success}
          </div>
        )}

        <div className="settings-section">
          <div className="setting-row toggle-row">
            <div className="setting-info">
              <span className="setting-label">Enable Notifications</span>
              <span className="setting-description">
                Turn on Discord notifications for this server
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={toggleEnabled}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h4>Discord Webhook</h4>
          <div className="webhook-config">
            {!showWebhookField ? (
              <div className="webhook-status">
                <span className={`webhook-indicator ${settings.discordWebhookUrl ? 'configured' : 'not-configured'}`}>
                  {settings.discordWebhookUrl ? 'Webhook configured' : 'No webhook configured'}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowWebhookField(true)}
                >
                  {settings.discordWebhookUrl ? 'Change Webhook' : 'Add Webhook'}
                </button>
              </div>
            ) : (
              <div className="webhook-input-group">
                <input
                  type="text"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="webhook-input"
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setShowWebhookField(false);
                    setWebhookUrl(settings.discordWebhookUrl || '');
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
            <p className="webhook-help">
              Create a webhook in your Discord server settings under Integrations &rarr; Webhooks
            </p>
          </div>
        </div>

        <div className="settings-section">
          <h4>Notification Events</h4>
          <p className="section-description">
            Choose which events trigger a Discord notification
          </p>

          <div className="events-grid">
            {Object.entries(eventLabels).map(([key, label]) => (
              <div key={key} className="event-item">
                <label className="event-checkbox">
                  <input
                    type="checkbox"
                    checked={settings.events[key]}
                    onChange={() => toggleEvent(key)}
                    disabled={!settings.enabled}
                  />
                  <span className="event-label">{label}</span>
                </label>
                <span className="event-description">{eventDescriptions[key]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="notifications-actions">
          <button
            className="btn btn-secondary"
            onClick={handleTest}
            disabled={testing || !settings.discordWebhookUrl}
          >
            {testing ? 'Sending...' : 'Send Test Notification'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotificationsTab;
