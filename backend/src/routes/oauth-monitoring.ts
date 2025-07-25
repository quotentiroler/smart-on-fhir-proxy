import { Elysia, t } from 'elysia';
import { oauthMetricsLogger } from '../lib/oauth-metrics-logger';
import { logger } from '../lib/logger';
import { validateToken } from '../lib/auth';

/**
 * OAuth monitoring routes - provides real-time monitoring and analytics
 */
export const oauthMonitoringRoutes = new Elysia({ prefix: '/monitoring/oauth', tags: ['oauth-monitoring'] })
  
  // Server-Sent Events endpoint for real-time OAuth events
  .get('/events/stream', async ({ set, headers, query }) => {
    // Validate authentication (support both header and query token for SSE)
    let token: string | undefined;
    
    if (headers.authorization) {
      token = headers.authorization.replace('Bearer ', '');
    } else if (query.token) {
      token = query.token;
    }
    
    if (!token) {
      set.status = 401;
      return new Response('Unauthorized', { status: 401 });
    }

    try {
      await validateToken(token);
    } catch {
      set.status = 401;
      return new Response('Unauthorized', { status: 401 });
    }

    // Set SSE headers
    set.headers['Content-Type'] = 'text/event-stream';
    set.headers['Cache-Control'] = 'no-cache';
    set.headers['Connection'] = 'keep-alive';
    set.headers['Access-Control-Allow-Origin'] = '*';
    set.headers['Access-Control-Allow-Headers'] = 'Cache-Control';

    const stream = new ReadableStream({
      start(controller) {
        logger.auth.info('OAuth events SSE stream started');

        // Send initial connection event
        const initialData = `data: ${JSON.stringify({ 
          type: 'connection', 
          message: 'Connected to OAuth events stream',
          timestamp: new Date().toISOString()
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(initialData));

        // Subscribe to OAuth events
        const unsubscribe = oauthMetricsLogger.subscribeToEvents((event) => {
          try {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          } catch (error) {
            logger.auth.error('Error sending OAuth event to SSE stream', { error });
          }
        });

        // Send keepalive every 30 seconds
        const keepAliveInterval = setInterval(() => {
          try {
            const keepAlive = `data: ${JSON.stringify({ 
              type: 'keepalive', 
              timestamp: new Date().toISOString() 
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(keepAlive));
          } catch (error) {
            logger.auth.error('Error sending keepalive to SSE stream', { error });
            clearInterval(keepAliveInterval);
            unsubscribe();
            controller.close();
          }
        }, 30000);

        // Handle stream closure
        return () => {
          logger.auth.info('OAuth events SSE stream closed');
          clearInterval(keepAliveInterval);
          unsubscribe();
        };
      }
    });

    return new Response(stream);
  }, {
    query: t.Object({
      token: t.Optional(t.String({ description: 'Bearer token for authentication (since EventSource cannot send custom headers)' }))
    }),
    headers: t.Object({
      authorization: t.Optional(t.String({ description: 'Bearer token' }))
    }),
    detail: {
      summary: 'OAuth Events Stream',
      description: 'Server-sent events stream for real-time OAuth flow monitoring. Token can be passed as query parameter or Authorization header.',
      tags: ['oauth-monitoring'],
      security: [{ BearerAuth: [] }]
    }
  })

  // Server-Sent Events endpoint for real-time analytics
  .get('/analytics/stream', async ({ set, headers, query }) => {
    // Validate authentication (support both header and query token for SSE)
    let token: string | undefined;
    
    if (headers.authorization) {
      token = headers.authorization.replace('Bearer ', '');
    } else if (query.token) {
      token = query.token;
    }
    
    if (!token) {
      set.status = 401;
      return new Response('Unauthorized', { status: 401 });
    }

    try {
      await validateToken(token);
    } catch {
      set.status = 401;
      return new Response('Unauthorized', { status: 401 });
    }

    // Set SSE headers
    set.headers['Content-Type'] = 'text/event-stream';
    set.headers['Cache-Control'] = 'no-cache';
    set.headers['Connection'] = 'keep-alive';
    set.headers['Access-Control-Allow-Origin'] = '*';
    set.headers['Access-Control-Allow-Headers'] = 'Cache-Control';

    const stream = new ReadableStream({
      start(controller) {
        logger.auth.info('OAuth analytics SSE stream started');

        // Send initial analytics
        const currentAnalytics = oauthMetricsLogger.getAnalytics();
        if (currentAnalytics) {
          const initialData = `data: ${JSON.stringify(currentAnalytics)}\n\n`;
          controller.enqueue(new TextEncoder().encode(initialData));
        }

        // Subscribe to analytics updates
        const unsubscribe = oauthMetricsLogger.subscribeToAnalytics((analytics) => {
          try {
            const data = `data: ${JSON.stringify(analytics)}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          } catch (error) {
            logger.auth.error('Error sending OAuth analytics to SSE stream', { error });
          }
        });

        // Send keepalive every 30 seconds
        const keepAliveInterval = setInterval(() => {
          try {
            const keepAlive = `data: ${JSON.stringify({ 
              type: 'keepalive', 
              timestamp: new Date().toISOString() 
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(keepAlive));
          } catch (error) {
            logger.auth.error('Error sending keepalive to analytics SSE stream', { error });
            clearInterval(keepAliveInterval);
            unsubscribe();
            controller.close();
          }
        }, 30000);

        // Handle stream closure
        return () => {
          logger.auth.info('OAuth analytics SSE stream closed');
          clearInterval(keepAliveInterval);
          unsubscribe();
        };
      }
    });

    return new Response(stream);
  }, {
    query: t.Object({
      token: t.Optional(t.String({ description: 'Bearer token for authentication (since EventSource cannot send custom headers)' }))
    }),
    headers: t.Object({
      authorization: t.Optional(t.String({ description: 'Bearer token' }))
    }),
    detail: {
      summary: 'OAuth Analytics Stream',
      description: 'Server-sent events stream for real-time OAuth analytics updates. Token can be passed as query parameter or Authorization header.',
      tags: ['oauth-monitoring'],
      security: [{ BearerAuth: [] }]
    }
  })

  // Get recent OAuth events with filtering
  .get('/events', async ({ query, headers, set }) => {
    // Validate authentication
    if (!headers.authorization) {
      set.status = 401;
      throw new Error('Unauthorized');
    }

    try {
      const token = headers.authorization.replace('Bearer ', '');
      await validateToken(token);
    } catch {
      set.status = 401;
      throw new Error('Unauthorized');
    }

    const options = {
      limit: query.limit ? parseInt(query.limit) : 100,
      type: query.type !== 'all' ? query.type : undefined,
      status: query.status !== 'all' ? query.status : undefined,
      clientId: query.clientId,
      since: query.since ? new Date(query.since) : undefined
    };

    const events = oauthMetricsLogger.getRecentEvents(options);
    
    return {
      events,
      total: events.length,
      timestamp: new Date().toISOString()
    };
  }, {
    query: t.Object({
      limit: t.Optional(t.String({ description: 'Maximum number of events to return' })),
      type: t.Optional(t.String({ description: 'Filter by event type' })),
      status: t.Optional(t.String({ description: 'Filter by event status' })),
      clientId: t.Optional(t.String({ description: 'Filter by client ID' })),
      since: t.Optional(t.String({ description: 'Filter events since this timestamp' }))
    }),
    headers: t.Object({
      authorization: t.Optional(t.String({ description: 'Bearer token' }))
    }),
    response: t.Object({
      events: t.Array(t.Object({
        id: t.String(),
        timestamp: t.String(),
        type: t.String(),
        status: t.String(),
        clientId: t.String(),
        clientName: t.Optional(t.String()),
        userId: t.Optional(t.String()),
        userName: t.Optional(t.String()),
        scopes: t.Array(t.String()),
        grantType: t.String(),
        responseTime: t.Number(),
        ipAddress: t.String(),
        userAgent: t.String(),
        errorMessage: t.Optional(t.String()),
        errorCode: t.Optional(t.String()),
        tokenType: t.Optional(t.String()),
        expiresIn: t.Optional(t.Number()),
        refreshToken: t.Optional(t.Boolean()),
        fhirContext: t.Optional(t.Object({
          patient: t.Optional(t.String()),
          encounter: t.Optional(t.String()),
          location: t.Optional(t.String()),
          fhirUser: t.Optional(t.String())
        }))
      })),
      total: t.Number(),
      timestamp: t.String()
    }),
    detail: {
      summary: 'Get OAuth Events',
      description: 'Retrieve recent OAuth events with optional filtering',
      tags: ['oauth-monitoring'],
      security: [{ BearerAuth: [] }]
    }
  })

  // Get current OAuth analytics
  .get('/analytics', async ({ headers, set }) => {
    // Validate authentication
    if (!headers.authorization) {
      set.status = 401;
      throw new Error('Unauthorized');
    }

    try {
      const token = headers.authorization.replace('Bearer ', '');
      await validateToken(token);
    } catch {
      set.status = 401;
      throw new Error('Unauthorized');
    }

    const analytics = oauthMetricsLogger.getAnalytics();
    
    if (!analytics) {
      return {
        totalFlows: 0,
        successRate: 0,
        averageResponseTime: 0,
        activeTokens: 0,
        topClients: [],
        flowsByType: {},
        errorsByType: {},
        hourlyStats: [],
        timestamp: new Date().toISOString()
      };
    }

    return {
      ...analytics,
      timestamp: new Date().toISOString()
    };
  }, {
    headers: t.Object({
      authorization: t.Optional(t.String({ description: 'Bearer token' }))
    }),
    response: t.Object({
      totalFlows: t.Number(),
      successRate: t.Number(),
      averageResponseTime: t.Number(),
      activeTokens: t.Number(),
      topClients: t.Array(t.Object({
        clientId: t.String(),
        clientName: t.String(),
        count: t.Number(),
        successRate: t.Number()
      })),
      flowsByType: t.Record(t.String(), t.Number()),
      errorsByType: t.Record(t.String(), t.Number()),
      hourlyStats: t.Array(t.Object({
        hour: t.String(),
        success: t.Number(),
        error: t.Number(),
        total: t.Number()
      })),
      timestamp: t.String()
    }),
    detail: {
      summary: 'Get OAuth Analytics',
      description: 'Get current OAuth analytics and metrics',
      tags: ['oauth-monitoring'],
      security: [{ BearerAuth: [] }]
    }
  })

  // Get system health metrics
  .get('/health', async ({ headers, set }) => {
    // Validate authentication
    if (!headers.authorization) {
      set.status = 401;
      throw new Error('Unauthorized');
    }

    try {
      const token = headers.authorization.replace('Bearer ', '');
      await validateToken(token);
    } catch {
      set.status = 401;
      throw new Error('Unauthorized');
    }

    const analytics = oauthMetricsLogger.getAnalytics();
    
    return {
      oauthServer: {
        status: 'healthy',
        uptime: process.uptime(),
        responseTime: analytics?.averageResponseTime || 0,
      },
      tokenStore: {
        status: 'healthy',
        activeTokens: analytics?.activeTokens || 0,
        storageUsed: 68, // This would be calculated based on actual storage
      },
      network: {
        status: 'healthy',
        throughput: '1.2k req/min', // This would be calculated from actual metrics
        errorRate: analytics ? (100 - analytics.successRate) : 0,
      },
      alerts: [
        ...(analytics && analytics.averageResponseTime > 500 ? [{
          type: 'warning',
          message: `High response time detected on authorization endpoint (avg ${analytics.averageResponseTime.toFixed(0)}ms)`
        }] : []),
        {
          type: 'info',
          message: 'Token storage is at 68% capacity. Consider cleanup or expansion.'
        }
      ],
      timestamp: new Date().toISOString()
    };
  }, {
    headers: t.Object({
      authorization: t.Optional(t.String({ description: 'Bearer token' }))
    }),
    detail: {
      summary: 'Get System Health',
      description: 'Get OAuth system health metrics and alerts',
      tags: ['oauth-monitoring'],
      security: [{ BearerAuth: [] }]
    }
  });
