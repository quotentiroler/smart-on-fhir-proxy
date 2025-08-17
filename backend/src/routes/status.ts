import { Elysia, t } from 'elysia'
import { collectSystemStatus } from '../lib/system-status'

// Legacy helper removed: FHIR server health collection centralized in system-status.ts

/**
 * General server information endpoints
 */
export const statusRoutes = new Elysia({ tags: ['server', 'info', 'health'] })

  // Health check endpoint - check if server is healthy
  .get('/health', async ({ set, query }) => {
    const force = query.force === '1';
    try {
      const full = await collectSystemStatus(force);
      const payload = {
        status: full.overall,
        timestamp: full.timestamp,
        uptime: full.uptime
      };
      if (full.overall === 'unhealthy') set.status = 503;
      return payload;
    } catch {
      set.status = 503;
      return { status: 'unhealthy', timestamp: new Date().toISOString(), error: 'Health collection failed' };
    }
  }, {
    query: t.Object({
      force: t.Optional(t.String())
    }),
    response: {
      200: t.Object({
        status: t.String(),
        timestamp: t.String(),
        uptime: t.Number()
      }),
      503: t.Object({
        status: t.String(),
        timestamp: t.String(),
        error: t.String()
      })
    },
    detail: {
      summary: 'Health Check (lean)',
  description: 'Fast liveness/readiness probe. Use /status for detailed system information.',
      tags: ['server']
    }
  })

  // System status endpoint - comprehensive system health check
  .get('/status', async ({ set }) => {
    const status = await collectSystemStatus(true);
    if (status.overall === 'unhealthy') set.status = 503;
    return status;
  }, {
    response: {
      200: t.Object({
        version: t.String(),
        timestamp: t.String(),
        uptime: t.Number(),
        overall: t.String(),
        fhir: t.Object({
          status: t.String(),
            totalServers: t.Number(),
            healthyServers: t.Number(),
            servers: t.Array(t.Object({
              name: t.String(),
              url: t.String(),
              status: t.String(),
              accessible: t.Boolean(),
              version: t.String(),
              serverName: t.Optional(t.String()),
              serverVersion: t.Optional(t.String()),
              error: t.Optional(t.String())
            }))
        }),
        keycloak: t.Object({
          status: t.String(),
          accessible: t.Boolean(),
          realm: t.String(),
          lastConnected: t.Optional(t.String())
        }),
        memory: t.Object({
          used: t.Number(),
          total: t.Number()
        })
      })
    },
    detail: {
      summary: 'System Status',
      description: 'Comprehensive system status (cached components)',
      tags: ['server']
    }
  })
