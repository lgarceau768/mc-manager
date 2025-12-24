import { useState, useEffect, useRef } from 'react';
import { createWebSocketClient } from '../services/websocket';
import './ServerConsole.css';

function ServerConsole({ serverId }) {
  const [logs, setLogs] = useState([]);
  const [command, setCommand] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [refreshCounter, setRefreshCounter] = useState(0);
  const logsEndRef = useRef(null);
  const wsClient = useRef(null);

  useEffect(() => {
    setConnectionStatus('connecting');
    setLogs([]);
    wsClient.current = createWebSocketClient();

    wsClient.current.connect(serverId, (message) => {
      handleWebSocketMessage(message);
    });

    return () => {
      if (wsClient.current) {
        wsClient.current.disconnect();
      }
    };
  }, [serverId, refreshCounter]);

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleWebSocketMessage = (message) => {
    switch (message.type) {
      case 'connected':
        setConnectionStatus('connected');
        setLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toISOString(),
            message: `Connected to server: ${message.serverName}`,
            type: 'system'
          }
        ]);
        break;

      case 'log':
        setLogs((prev) => [...prev, { ...message, type: 'log' }]);
        break;

      case 'status':
        setLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toISOString(),
            message: message.message,
            type: 'status'
          }
        ]);
        break;

      case 'error':
        setLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toISOString(),
            message: `Error: ${message.message}`,
            type: 'error'
          }
        ]);
        break;

      case 'connection':
        setConnectionStatus(message.status);
        if (message.status === 'disconnected') {
          setLogs((prev) => [
            ...prev,
            {
              timestamp: new Date().toISOString(),
              message: 'Disconnected from server',
              type: 'system'
            }
          ]);
        }
        break;

      case 'command_result':
        setLogs((prev) => [
          ...prev,
          {
            timestamp: message.timestamp || new Date().toISOString(),
            message: `Command "${message.command}" ${message.success ? 'sent' : 'failed'}`,
            type: message.success ? 'status' : 'error'
          }
        ]);
        break;
    }
  };

  const handleRefresh = () => {
    setLogs([]);
    setCommand('');
    setConnectionStatus('connecting');
    setRefreshCounter((prev) => prev + 1);
  };

  const handleSendCommand = (e) => {
    e.preventDefault();

    if (!command.trim()) return;

    if (!wsClient.current || !wsClient.current.isConnected()) {
      alert('Not connected to server console');
      return;
    }

    // Add command to logs
    setLogs((prev) => [
      ...prev,
      {
        timestamp: new Date().toISOString(),
        message: `> ${command}`,
        type: 'command'
      }
    ]);

    // Send command
    wsClient.current.sendCommand(command);
    setCommand('');
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getConnectionStatusClass = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'status-connected';
      case 'disconnected':
        return 'status-disconnected';
      case 'connecting':
        return 'status-connecting';
      default:
        return '';
    }
  };

  return (
    <div className="server-console">
      <div className="console-header">
        <h3>Server Console</h3>
        <div className="console-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={connectionStatus === 'connecting'}
          >
            ↻ Refresh
          </button>
          <span className={`connection-status ${getConnectionStatusClass()}`}>
            {connectionStatus}
          </span>
        </div>
      </div>

      <div className="console-logs">
        {logs.length === 0 ? (
          <div className="console-empty">No logs yet...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className={`log-entry log-${log.type}`}>
              <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      <form className="console-input" onSubmit={handleSendCommand}>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Enter command..."
          disabled={connectionStatus !== 'connected'}
        />
        <button
          type="submit"
          disabled={connectionStatus !== 'connected' || !command.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default ServerConsole;
