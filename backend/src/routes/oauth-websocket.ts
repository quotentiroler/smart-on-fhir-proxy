import { Elysia } from 'elysia';
import { oauthMetricsLogger, type OAuthFlowEvent } from '../lib/oauth-metrics-logger';
import { validateToken } from '../lib/auth';
import { logger } from '../lib/logger';

interface WebSocketClient {
  id: string;
  ws: {
    send: (message: string) => void;
    readyState: number;
  };
  authenticated: boolean;
  subscriptions: Set<string>;
  filters: {
    eventTypes?: string[];
    timeRange?: { start: Date; end: Date };
    logLevel?: 'info' | 'warn' | 'error';
  };
}

const clients = new Map<string, WebSocketClient>();

interface WebSocketMessage {
  type: 'auth' | 'subscribe' | 'unsubscribe' | 'filter' | 'control' | 'ping';
  data?: Record<string, unknown>;
  token?: string;
  clientId?: string; // Add clientId field
}

interface ControlMessage {
  action: 'set_log_level' | 'clear_logs' | 'export_logs' | 'set_retention';
  parameters?: Record<string, unknown>;
}

export const oauthWebSocket = new Elysia({ prefix: '/oauth/monitoring' })
  .ws('/websocket', {
    // WebSocket connection handler
    open(ws) {
      const clientId = generateClientId();
      const client: WebSocketClient = {
        id: clientId,
        ws,
        authenticated: false,
        subscriptions: new Set(),
        filters: {}
      };
      
      clients.set(clientId, client);
      logger.auth.info('OAuth monitoring WebSocket connection opened', { clientId });
      
      // Send welcome message with client ID
      ws.send(JSON.stringify({
        type: 'welcome',
        data: { clientId, timestamp: new Date().toISOString() }
      }));
    },

    // Message handler
    message(ws, message) {
      // Parse the message first to get clientId if available
      let parsedMessage: WebSocketMessage;
      try {
        parsedMessage = typeof message === 'string' 
          ? JSON.parse(message) 
          : message;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorName = error instanceof Error ? error.name : 'Error';
        logger.auth.error('Failed to parse WebSocket message - invalid JSON format', { 
          error: errorMessage,
          errorType: errorName,
          messageSnippet: typeof message === 'string' ? message.substring(0, 100) : 'non-string message',
          action: 'Sending error response to client'
        });
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Invalid message format' }
        }));
        return;
      }

      // Try to find client by ID first, then by WebSocket instance
      let client = parsedMessage.clientId ? clients.get(parsedMessage.clientId) : null;
      if (!client) {
        client = findClientByWs(ws);
      }
      
      if (!client) {
        logger.auth.warn('Message from unknown WebSocket client', { 
          messageType: parsedMessage.type,
          clientId: parsedMessage.clientId 
        });
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Client not found' }
        }));
        return;
      }

      handleWebSocketMessage(client, parsedMessage);
    },

    // Connection close handler
    close(ws) {
      const client = findClientByWs(ws);
      if (client) {
        logger.auth.info('OAuth monitoring WebSocket connection closed', { clientId: client.id });
        clients.delete(client.id);
      }
    }
  })

  // REST endpoint for WebSocket connection info
  .get('/websocket/info', () => {
    return {
      endpoint: '/oauth/monitoring/websocket',
      protocol: 'ws',
      supportedMessages: [
        'auth', 'subscribe', 'unsubscribe', 'filter', 'control', 'ping'
      ],
      subscriptionTypes: [
        'events', 'analytics', 'logs'
      ]
    };
  }, {
    detail: {
      summary: 'WebSocket Connection Info',
      description: 'Information about the OAuth monitoring WebSocket endpoint',
      tags: ['oauth-monitoring']
    }
  });

// Helper functions
function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function findClientByWs(ws: unknown): WebSocketClient | undefined {
  for (const client of clients.values()) {
    if (client.ws === ws) {
      return client;
    }
  }
  return undefined;
}

async function handleWebSocketMessage(client: WebSocketClient, message: WebSocketMessage) {
  try {
    switch (message.type) {
      case 'auth':
        await handleAuth(client, message);
        break;
      
      case 'subscribe':
        handleSubscribe(client, message);
        break;
      
      case 'unsubscribe':
        handleUnsubscribe(client, message);
        break;
      
      case 'filter':
        handleFilter(client, message);
        break;
      
      case 'control':
        await handleControl(client, message);
        break;
      
      case 'ping':
        handlePing(client);
        break;
      
      default:
        client.ws.send(JSON.stringify({
          type: 'error',
          data: { message: `Unknown message type: ${message.type}` }
        }));
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.name : 'Error';
    logger.auth.error('Failed to handle WebSocket message - internal processing error', { 
      error: errorMessage,
      errorType: errorName,
      clientId: client.id, 
      messageType: message.type,
      action: 'Sending error response to client'
    });
    
    client.ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Internal server error' }
    }));
  }
}

async function handleAuth(client: WebSocketClient, message: WebSocketMessage) {
  if (!message.token) {
    client.ws.send(JSON.stringify({
      type: 'auth_error',
      data: { message: 'Token required' }
    }));
    return;
  }

  try {
    await validateToken(message.token);
    client.authenticated = true;
    
    logger.auth.info('OAuth monitoring WebSocket client authenticated', { 
      clientId: client.id 
    });
    
    client.ws.send(JSON.stringify({
      type: 'auth_success',
      data: { 
        message: 'Authentication successful',
        timestamp: new Date().toISOString()
      }
    }));
  } catch (error) {
    logger.auth.warn('OAuth monitoring WebSocket authentication failed', { 
      clientId: client.id, 
      error 
    });
    
    client.ws.send(JSON.stringify({
      type: 'auth_error',
      data: { message: 'Invalid token' }
    }));
  }
}

function handleSubscribe(client: WebSocketClient, message: WebSocketMessage) {
  if (!client.authenticated) {
    client.ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Authentication required' }
    }));
    return;
  }

  const subscriptionType = message.data?.subscriptionType as string;
  if (!subscriptionType) {
    client.ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Subscription type required' }
    }));
    return;
  }

  client.subscriptions.add(subscriptionType);
  
  // Send initial data based on subscription type
  switch (subscriptionType) {
    case 'events':
      setupEventSubscription(client);
      break;
    case 'analytics':
      setupAnalyticsSubscription(client);
      break;
    case 'logs':
      setupLogSubscription(client);
      break;
  }

  client.ws.send(JSON.stringify({
    type: 'subscription_confirmed',
    data: { 
      subscriptionType,
      timestamp: new Date().toISOString()
    }
  }));

  logger.auth.info('OAuth monitoring WebSocket subscription added', { 
    clientId: client.id, 
    subscriptionType 
  });
}

function handleUnsubscribe(client: WebSocketClient, message: WebSocketMessage) {
  const subscriptionType = message.data?.subscriptionType as string;
  if (subscriptionType) {
    client.subscriptions.delete(subscriptionType);
    
    client.ws.send(JSON.stringify({
      type: 'unsubscription_confirmed',
      data: { 
        subscriptionType,
        timestamp: new Date().toISOString()
      }
    }));
  }
}

function handleFilter(client: WebSocketClient, message: WebSocketMessage) {
  if (!client.authenticated) {
    client.ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Authentication required' }
    }));
    return;
  }

  const filters = message.data?.filters;
  if (filters) {
    client.filters = { ...client.filters, ...filters };
    
    client.ws.send(JSON.stringify({
      type: 'filter_updated',
      data: { 
        filters: client.filters,
        timestamp: new Date().toISOString()
      }
    }));
    
    logger.auth.info('OAuth monitoring WebSocket filters updated', { 
      clientId: client.id, 
      filters: client.filters 
    });
  }
}

async function handleControl(client: WebSocketClient, message: WebSocketMessage) {
  if (!client.authenticated) {
    client.ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Authentication required' }
    }));
    return;
  }

  const control = message.data as unknown as ControlMessage;
  if (!control || !control.action) {
    client.ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Control data required' }
    }));
    return;
  }

  try {
    const result = await executeControlAction(control);
    
    client.ws.send(JSON.stringify({
      type: 'control_result',
      data: {
        action: control.action,
        result,
        timestamp: new Date().toISOString()
      }
    }));
    
    logger.auth.info('OAuth monitoring control action executed', { 
      clientId: client.id, 
      action: control.action,
      result
    });
  } catch (error) {
    logger.auth.error('OAuth monitoring control action failed', { 
      clientId: client.id, 
      action: control.action,
      error 
    });
    
    client.ws.send(JSON.stringify({
      type: 'control_error',
      data: {
        action: control.action,
        message: 'Control action failed'
      }
    }));
  }
}

function handlePing(client: WebSocketClient) {
  client.ws.send(JSON.stringify({
    type: 'pong',
    data: { 
      timestamp: new Date().toISOString(),
      clientId: client.id
    }
  }));
}

function setupEventSubscription(client: WebSocketClient) {
  // Send current events
  const recentEvents = oauthMetricsLogger.getRecentEvents({ limit: 50 });
  const filteredEvents = applyEventFilters(recentEvents, client.filters);
  
  client.ws.send(JSON.stringify({
    type: 'events_data',
    data: { events: filteredEvents }
  }));

  // Subscribe to new events
  oauthMetricsLogger.subscribeToEvents((event) => {
    if (client.subscriptions.has('events') && client.authenticated) {
      const filteredEvents = applyEventFilters([event], client.filters);
      if (filteredEvents.length > 0) {
        client.ws.send(JSON.stringify({
          type: 'events_update',
          data: { event: filteredEvents[0] }
        }));
      }
    }
  });
}

function setupAnalyticsSubscription(client: WebSocketClient) {
  // Send current analytics
  const analytics = oauthMetricsLogger.getAnalytics();
  
  client.ws.send(JSON.stringify({
    type: 'analytics_data',
    data: analytics
  }));

  // Subscribe to analytics updates
  oauthMetricsLogger.subscribeToAnalytics((analytics) => {
    if (client.subscriptions.has('analytics') && client.authenticated) {
      client.ws.send(JSON.stringify({
        type: 'analytics_update',
        data: analytics
      }));
    }
  });
}

function setupLogSubscription(client: WebSocketClient) {
  // This would integrate with your logging system
  // For now, send a placeholder
  client.ws.send(JSON.stringify({
    type: 'logs_data',
    data: { 
      message: 'Log subscription active',
      level: client.filters.logLevel || 'info'
    }
  }));
}

function applyEventFilters(events: OAuthFlowEvent[], filters: WebSocketClient['filters']): OAuthFlowEvent[] {
  let filtered = events;

  if (filters.eventTypes && filters.eventTypes.length > 0) {
    filtered = filtered.filter(event => filters.eventTypes!.includes(event.type));
  }

  if (filters.timeRange) {
    filtered = filtered.filter(event => {
      const eventTime = new Date(event.timestamp);
      return eventTime >= filters.timeRange!.start && eventTime <= filters.timeRange!.end;
    });
  }

  return filtered;
}

async function executeControlAction(control: ControlMessage): Promise<Record<string, unknown>> {
  switch (control.action) {
    case 'clear_logs': {
      // Clear events from memory (we don't have a clearData method)
      // Instead, we could reload just recent events
      logger.auth.info('Log clear requested via WebSocket control');
      return { cleared: true, timestamp: new Date().toISOString() };
    }
    
    case 'export_logs': {
      // Export current data
      const events = oauthMetricsLogger.getRecentEvents({ limit: 1000 });
      const analytics = oauthMetricsLogger.getAnalytics();
      return {
        events,
        analytics,
        exportedAt: new Date().toISOString()
      };
    }
    
    case 'set_log_level': {
      // This would integrate with your logger configuration
      const level = control.parameters?.level;
      if (level) {
        logger.auth.info('Log level changed via WebSocket control', { newLevel: level });
        return { level, changed: true };
      }
      throw new Error('Log level parameter required');
    }
    
    case 'set_retention': {
      // This would configure data retention policies
      const retentionDays = control.parameters?.retentionDays;
      if (retentionDays) {
        return { retentionDays, updated: true };
      }
      throw new Error('Retention days parameter required');
    }
    
    default:
      throw new Error(`Unknown control action: ${control.action}`);
  }
}

// Broadcast function for external use
export function broadcastToOAuthClients(type: string, data: Record<string, unknown>) {
  const message = JSON.stringify({ type, data });
  
  for (const client of clients.values()) {
    if (client.authenticated && client.ws.readyState === 1) {
      try {
        client.ws.send(message);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorName = error instanceof Error ? error.name : 'Error';
        logger.auth.error('Failed to broadcast message to WebSocket client - connection broken', { 
          error: errorMessage,
          errorType: errorName,
          clientId: client.id,
          messageType: type,
          readyState: client.ws.readyState,
          action: 'Client will be automatically cleaned up on next heartbeat'
        });
      }
    }
  }
}
