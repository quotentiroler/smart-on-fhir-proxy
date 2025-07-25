// OAuth WebSocket Service - Simplified version for real-time monitoring
import { useAuthStore } from '../stores/authStore';

export interface OAuthEvent {
  id: string;
  timestamp: string;
  type: 'authorization' | 'token' | 'refresh' | 'error' | 'revoke' | 'introspect';
  status: 'success' | 'error' | 'pending' | 'warning';
  clientId: string;
  clientName?: string;
  scopes: string[];
  grantType: string;
  responseTime: number;
  errorMessage?: string;
}

export interface OAuthAnalytics {
  totalFlows: number;
  successRate: number;
  averageResponseTime: number;
  activeTokens: number;
  topClients: Array<{
    clientId: string;
    clientName: string;
    count: number;
    successRate: number;
  }>;
  flowsByType: Record<string, number>;
  errorsByType: Record<string, number>;
  hourlyStats: Array<{
    hour: string;
    success: number;
    error: number;
    total: number;
  }>;
}

export class OAuthWebSocketService {
  private ws: WebSocket | null = null;
  private authenticated = false;
  private eventHandlers: Record<string, ((data: unknown) => void)[]> = {};
  private baseUrl: string;
  private isConnecting = false;
  private clientId: string | null = null;
  
  constructor(baseUrl: string = 'ws://localhost:8445') {
    this.baseUrl = baseUrl;
  }

  async connect(): Promise<void> {
    // Prevent multiple simultaneous connections
    if (this.isConnecting) {
      console.log('Connection already in progress, waiting...');
      // Wait for the current connection attempt to complete
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return;
    }

    // If already connected, disconnect first
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected/connecting, disconnecting first');
      this.disconnect();
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      const wsUrl = `${this.baseUrl}/oauth/monitoring/websocket`;
      console.log('Connecting to WebSocket URL:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      // Set up welcome message handler to know when we can authenticate
      const welcomeHandler = (data: unknown) => {
        const message = data as { type: string; data?: { clientId?: string } };
        if (message.type === 'welcome') {
          console.log('Received welcome message from WebSocket server:', message.data);
          // Store the client ID from the welcome message
          this.clientId = message.data?.clientId || null;
          this.removeEventHandler('welcome', welcomeHandler);
          this.isConnecting = false;
          resolve();
        }
      };

      this.ws.onopen = () => {
        console.log('OAuth WebSocket connected, waiting for welcome message...');
        this.addEventListener('welcome', welcomeHandler);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onclose = (event) => {
        console.log('OAuth WebSocket disconnected', { code: event.code, reason: event.reason });
        this.authenticated = false;
        this.isConnecting = false;
      };

      this.ws.onerror = (error) => {
        console.error('OAuth WebSocket error:', error);
        this.isConnecting = false;
        reject(error);
      };
    });
  }

  async authenticate(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Ensure WebSocket is connected and client ID is received
      if (!this.isFullyReady) {
        reject(new Error('WebSocket not fully ready. Connection or client ID missing.'));
        return;
      }

      // Get token from auth store
      const getToken = (): string | null => {
        try {
          // Access the auth store directly (not using the hook since this is outside React)
          const authStore = useAuthStore.getState();
          
          if (authStore.isAuthenticated) {
            // Try to get token from localStorage using the same key as auth store
            const stored = localStorage.getItem('openid_tokens');
            if (stored) {
              const tokens = JSON.parse(stored);
              if (tokens.access_token) {
                console.log('Found access token from auth store localStorage');
                return tokens.access_token;
              }
            }
          }
          
          console.warn('No valid authentication token found. User may need to log in.');
          return null;
        } catch (error) {
          console.error('Error reading token from auth store:', error);
          return null;
        }
      };

      const token = getToken();
      if (!token) {
        reject(new Error('No authentication token found. Please log in first.'));
        return;
      }

      console.log('Attempting WebSocket authentication with token from auth store, length:', token.length);

      // Set up timeout for authentication
      const authTimeout = setTimeout(() => {
        this.removeEventHandler('auth_success', authHandler);
        this.removeEventHandler('auth_error', authHandler);
        this.removeEventHandler('error', errorHandler);
        reject(new Error('Authentication timeout - no response from server'));
      }, 10000); // 10 second timeout

      // Listen for auth response
      const authHandler = (data: unknown) => {
        const message = data as { type: string; data?: { message?: string } };
        console.log('Received WebSocket message during auth:', message);
        
        if (message.type === 'auth_success') {
          clearTimeout(authTimeout);
          this.authenticated = true;
          this.removeEventHandler('auth_success', authHandler);
          this.removeEventHandler('auth_error', authHandler);
          this.removeEventHandler('error', errorHandler);
          console.log('WebSocket authentication successful');
          resolve();
        } else if (message.type === 'auth_error') {
          clearTimeout(authTimeout);
          this.removeEventHandler('auth_success', authHandler);
          this.removeEventHandler('auth_error', authHandler);
          this.removeEventHandler('error', errorHandler);
          const errorMsg = message.data?.message || 'Authentication failed';
          console.error('WebSocket authentication failed:', errorMsg);
          reject(new Error(errorMsg));
        }
      };

      // Listen for general errors during auth
      const errorHandler = (data: unknown) => {
        const message = data as { type: string; data?: { message?: string; error?: string } };
        console.error('WebSocket error during authentication:', message);
        
        clearTimeout(authTimeout);
        this.removeEventHandler('auth_success', authHandler);
        this.removeEventHandler('auth_error', authHandler);
        this.removeEventHandler('error', errorHandler);
        
        const errorMsg = message.data?.message || message.data?.error || 'Unknown authentication error';
        reject(new Error(`Authentication error: ${errorMsg}`));
      };

      this.addEventListener('auth_success', authHandler);
      this.addEventListener('auth_error', authHandler);
      this.addEventListener('error', errorHandler);

      // Send auth message
      const authMessage = { type: 'auth', token };
      console.log('Sending auth message:', { type: 'auth', tokenLength: token.length });
      this.sendMessage(authMessage);
    });
  }

  async subscribe(type: 'events' | 'analytics'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.authenticated) {
        reject(new Error('Not authenticated'));
        return;
      }

      const confirmHandler = (data: unknown) => {
        const message = data as { type: string; data?: { subscriptionType?: string } };
        if (message.type === 'subscription_confirmed' && message.data?.subscriptionType === type) {
          this.removeEventHandler('subscription_confirmed', confirmHandler);
          resolve();
        }
      };

      this.addEventListener('subscription_confirmed', confirmHandler);
      this.sendMessage({ type: 'subscribe', data: { subscriptionType: type } });
    });
  }

  onEventsData(handler: (events: OAuthEvent[]) => void) {
    this.addEventListener('events_data', (data: unknown) => {
      const message = data as { data?: { events?: OAuthEvent[] } };
      handler(message.data?.events || []);
    });
  }

  onEventsUpdate(handler: (event: OAuthEvent) => void) {
    this.addEventListener('events_update', (data: unknown) => {
      const message = data as { data?: { event?: OAuthEvent } };
      if (message.data?.event) {
        handler(message.data.event);
      }
    });
  }

  onAnalyticsData(handler: (analytics: OAuthAnalytics) => void) {
    this.addEventListener('analytics_data', (data: unknown) => {
      const message = data as { data?: OAuthAnalytics };
      if (message.data) {
        handler(message.data);
      }
    });
  }

  onAnalyticsUpdate(handler: (analytics: OAuthAnalytics) => void) {
    this.addEventListener('analytics_update', (data: unknown) => {
      const message = data as { data?: OAuthAnalytics };
      if (message.data) {
        handler(message.data);
      }
    });
  }

  onError(handler: (error: string) => void) {
    this.addEventListener('error', (data: unknown) => {
      const message = data as { data?: { message?: string } };
      handler(message.data?.message || 'Unknown error');
    });
  }

  private addEventListener(type: string, handler: (data: unknown) => void) {
    if (!this.eventHandlers[type]) {
      this.eventHandlers[type] = [];
    }
    this.eventHandlers[type].push(handler);
  }

  private removeEventHandler(type: string, handler: (data: unknown) => void) {
    if (this.eventHandlers[type]) {
      const index = this.eventHandlers[type].indexOf(handler);
      if (index > -1) {
        this.eventHandlers[type].splice(index, 1);
      }
    }
  }

  private sendMessage(message: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Include client ID in the message if available
      const messageWithClientId = this.clientId 
        ? { ...message, clientId: this.clientId }
        : message;
      const messageStr = JSON.stringify(messageWithClientId);
      console.log('Sending WebSocket message:', messageWithClientId);
      this.ws.send(messageStr);
    } else {
      console.error('Cannot send message - WebSocket not connected. State:', 
        this.ws ? this.ws.readyState : 'null');
    }
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      console.log('Received WebSocket message:', data);
      
      // Log error messages for debugging
      if (data.type === 'error') {
        console.error('WebSocket server error:', data.data);
      }
      
      const handlers = this.eventHandlers[data.type];
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            console.error('Error in event handler:', error);
          }
        });
      } else {
        console.warn('No handlers registered for message type:', data.type, 'Data:', data);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error, 'Raw data:', event.data);
    }
  }

  disconnect() {
    if (this.ws) {
      console.log('Disconnecting WebSocket...');
      // Remove all event listeners before closing
      this.eventHandlers = {};
      
      // Close the connection if it's open
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      
      this.ws = null;
    }
    this.authenticated = false;
    this.isConnecting = false;
    this.clientId = null; // Reset client ID
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  get isFullyReady(): boolean {
    return this.isConnected && this.clientId !== null;
  }

  get isAuthenticated(): boolean {
    return this.authenticated;
  }
}

// Create singleton instance
export const oauthWebSocketService = new OAuthWebSocketService();
