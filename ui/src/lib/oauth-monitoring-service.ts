import { getStoredToken, createOauthMonitoringApi } from './apiClient';
import type { 
  GetMonitoringOauthEvents200ResponseEventsInner,
  GetMonitoringOauthAnalytics200Response,
  GetMonitoringOauthEvents200Response
} from './api-client';

// Re-export types for convenience (using shorter names)
export type OAuthFlowEvent = GetMonitoringOauthEvents200ResponseEventsInner;
export type OAuthAnalytics = GetMonitoringOauthAnalytics200Response;

export interface SystemHealth {
  oauthServer: {
    status: string;
    uptime: number;
    responseTime: number;
  };
  tokenStore: {
    status: string;
    activeTokens: number;
    storageUsed: number;
  };
  network: {
    status: string;
    throughput: string;
    errorRate: number;
  };
  alerts: Array<{
    type: string;
    message: string;
  }>;
  timestamp: string;
}

class OAuthMonitoringService {
  private eventsEventSource: EventSource | null = null;
  private analyticsEventSource: EventSource | null = null;
  private eventListeners = new Set<(event: OAuthFlowEvent) => void>();
  private analyticsListeners = new Set<(analytics: OAuthAnalytics) => void>();
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8445';
  }

  /**
   * Subscribe to real-time OAuth events
   */
  subscribeToEvents(callback: (event: OAuthFlowEvent) => void): () => void {
    this.eventListeners.add(callback);
    
    if (!this.eventsEventSource) {
      this.connectToEventsStream();
    }

    return () => {
      this.eventListeners.delete(callback);
      if (this.eventListeners.size === 0) {
        this.disconnectFromEventsStream();
      }
    };
  }

  /**
   * Subscribe to real-time analytics updates
   */
  subscribeToAnalytics(callback: (analytics: OAuthAnalytics) => void): () => void {
    this.analyticsListeners.add(callback);
    
    if (!this.analyticsEventSource) {
      this.connectToAnalyticsStream();
    }

    return () => {
      this.analyticsListeners.delete(callback);
      if (this.analyticsListeners.size === 0) {
        this.disconnectFromAnalyticsStream();
      }
    };
  }

  /**
   * Get recent OAuth events with filtering
   */
  async getEvents(options?: {
    limit?: number;
    type?: string;
    status?: string;
    clientId?: string;
    since?: string;
  }): Promise<GetMonitoringOauthEvents200Response> {
    const token = getStoredToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    const api = createOauthMonitoringApi(token);
    
    try {
      return await api.getMonitoringOauthEvents({
        authorization: `Bearer ${token}`,
        limit: options?.limit?.toString(),
        type: options?.type,
        status: options?.status,
        clientId: options?.clientId,
        since: options?.since
      });
    } catch (error) {
      console.error('Failed to fetch OAuth events:', error);
      throw error;
    }
  }

  /**
   * Get current OAuth analytics
   */
  async getAnalytics(): Promise<OAuthAnalytics> {
    const token = getStoredToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    const api = createOauthMonitoringApi(token);
    
    try {
      return await api.getMonitoringOauthAnalytics({
        authorization: `Bearer ${token}`
      });
    } catch (error) {
      console.error('Failed to fetch OAuth analytics:', error);
      throw error;
    }
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const token = getStoredToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    const api = createOauthMonitoringApi(token);
    
    try {
      const response = await api.getMonitoringOauthHealth({
        authorization: `Bearer ${token}`
      });
      // The API returns the health data directly
      return response as unknown as SystemHealth;
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      throw error;
    }
  }

  /**
   * Connect to OAuth events SSE stream
   */
  private connectToEventsStream(): void {
    const token = getStoredToken();
    if (!token) {
      console.error('No token available for OAuth events stream');
      return;
    }

    try {
      // Note: EventSource doesn't support custom headers, so we'll use a different approach
      // We'll need to modify the backend to accept token via query parameter for SSE
      const url = `${this.baseUrl}/monitoring/oauth/events/stream?token=${encodeURIComponent(token)}`;
      this.eventsEventSource = new EventSource(url, {
        withCredentials: true
      });

      this.eventsEventSource.onopen = () => {
        console.log('Connected to OAuth events stream');
      };

      this.eventsEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Skip keepalive and connection messages
          if (data.type === 'keepalive' || data.type === 'connection') {
            return;
          }

          // Notify all listeners
          this.eventListeners.forEach(callback => {
            try {
              callback(data as OAuthFlowEvent);
            } catch (error) {
              console.error('Error in OAuth event listener:', error);
            }
          });
        } catch (error) {
          console.error('Error parsing OAuth event:', error);
        }
      };

      this.eventsEventSource.onerror = (error) => {
        console.error('OAuth events stream error:', error);
        this.disconnectFromEventsStream();
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (this.eventListeners.size > 0) {
            this.connectToEventsStream();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Failed to connect to OAuth events stream:', error);
    }
  }

  /**
   * Connect to OAuth analytics SSE stream
   */
  private connectToAnalyticsStream(): void {
    const token = getStoredToken();
    if (!token) {
      console.error('No token available for OAuth analytics stream');
      return;
    }

    try {
      // Note: EventSource doesn't support custom headers, so we'll use a different approach
      const url = `${this.baseUrl}/monitoring/oauth/analytics/stream?token=${encodeURIComponent(token)}`;
      this.analyticsEventSource = new EventSource(url, {
        withCredentials: true
      });

      this.analyticsEventSource.onopen = () => {
        console.log('Connected to OAuth analytics stream');
      };

      this.analyticsEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Skip keepalive messages
          if (data.type === 'keepalive') {
            return;
          }

          // Notify all listeners
          this.analyticsListeners.forEach(callback => {
            try {
              callback(data as OAuthAnalytics);
            } catch (error) {
              console.error('Error in OAuth analytics listener:', error);
            }
          });
        } catch (error) {
          console.error('Error parsing OAuth analytics:', error);
        }
      };

      this.analyticsEventSource.onerror = (error) => {
        console.error('OAuth analytics stream error:', error);
        this.disconnectFromAnalyticsStream();
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (this.analyticsListeners.size > 0) {
            this.connectToAnalyticsStream();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Failed to connect to OAuth analytics stream:', error);
    }
  }

  /**
   * Disconnect from OAuth events stream
   */
  private disconnectFromEventsStream(): void {
    if (this.eventsEventSource) {
      this.eventsEventSource.close();
      this.eventsEventSource = null;
    }
  }

  /**
   * Disconnect from OAuth analytics stream
   */
  private disconnectFromAnalyticsStream(): void {
    if (this.analyticsEventSource) {
      this.analyticsEventSource.close();
      this.analyticsEventSource = null;
    }
  }

  /**
   * Cleanup all connections
   */
  disconnect(): void {
    this.disconnectFromEventsStream();
    this.disconnectFromAnalyticsStream();
    this.eventListeners.clear();
    this.analyticsListeners.clear();
  }
}

// Export singleton instance
export const oauthMonitoringService = new OAuthMonitoringService();
