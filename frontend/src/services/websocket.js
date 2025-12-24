class WebSocketClient {
  constructor() {
    this.ws = null;
    this.serverId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.messageHandlers = new Set();
  }

  /**
   * Connect to console WebSocket
   */
  connect(serverId, onMessage) {
    if (this.ws) {
      console.warn('WebSocket already connected');
      return;
    }

    this.serverId = serverId;

    // Add message handler
    if (onMessage) {
      this.messageHandlers.add(onMessage);
    }

    // Use relative WebSocket URL (works in both dev and production)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/console?serverId=${serverId}`;
    console.log(`Connecting to WebSocket: ${wsUrl}`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.notifyHandlers({
          type: 'connection',
          status: 'connected'
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.notifyHandlers(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.notifyHandlers({
          type: 'error',
          message: 'WebSocket connection error'
        });
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.ws = null;

        this.notifyHandlers({
          type: 'connection',
          status: 'disconnected'
        });

        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.ws) {
      console.log('Disconnecting WebSocket');
      this.ws.close();
      this.ws = null;
      this.serverId = null;
      this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
    }
  }

  /**
   * Send message to WebSocket
   */
  send(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      return false;
    }
  }

  /**
   * Send command to server
   */
  sendCommand(command) {
    return this.send({
      type: 'command',
      command
    });
  }

  /**
   * Add message handler
   */
  addMessageHandler(handler) {
    this.messageHandlers.add(handler);
  }

  /**
   * Remove message handler
   */
  removeMessageHandler(handler) {
    this.messageHandlers.delete(handler);
  }

  /**
   * Notify all message handlers
   */
  notifyHandlers(message) {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  /**
   * Attempt to reconnect
   */
  attemptReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (this.serverId) {
        this.connect(this.serverId);
      }
    }, delay);
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Create factory function to get new instances
export const createWebSocketClient = () => new WebSocketClient();

export default WebSocketClient;
