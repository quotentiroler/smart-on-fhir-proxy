import { getFHIRServerInfo, getServerIdentifier } from './fhir-utils';
import { config } from '../config';
import { keycloakConnectionLogger } from './keycloak-connection-logger';

interface FhirServerEntry {
  name: string;
  url: string;
  status: string;
  accessible: boolean;
  version: string;
  serverName?: string;
  serverVersion?: string;
  error?: string;
}

export interface SystemStatus {
  version: string; // Optional version field for future use
  timestamp: string;
  uptime: number;
  overall: 'healthy' | 'degraded' | 'unhealthy';
  fhir: {
    status: string;
    totalServers: number;
    healthyServers: number;
    servers: FhirServerEntry[];
  };
  keycloak: {
    status: string;
    accessible: boolean;
    realm: string;
    lastConnected?: string;
  };
  memory: {
    used: number;
    total: number;
  };
}

export let lastSystemStatus: SystemStatus | null = null;
export let lastSystemStatusUpdated = 0;

const STATUS_TTL_MS = 30_000; // cache window for heavy checks

function deriveOverall(fhirStatus: string, keycloakStatus: string): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = [fhirStatus, keycloakStatus];
  if (statuses.every(s => s === 'healthy')) return 'healthy';
  if (statuses.some(s => s === 'unhealthy')) return 'unhealthy';
  return 'degraded';
}

async function collectFhirStatus(): Promise<SystemStatus['fhir']> {
  const servers: FhirServerEntry[] = [];
  for (let i = 0; i < config.fhir.serverBases.length; i++) {
    const base = config.fhir.serverBases[i];
    try {
      const info = await getFHIRServerInfo(base);
      const name = getServerIdentifier(info, base, i);
      servers.push({
        name,
        url: base,
        status: info.supported ? 'healthy' : 'degraded',
        accessible: info.supported,
        version: info.fhirVersion,
        serverName: info.serverName,
        serverVersion: info.serverVersion
      });
    } catch (err) {
      servers.push({
        name: `server-${i}`,
        url: base,
        status: 'unhealthy',
        accessible: false,
        version: 'unknown',
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  }
  const healthy = servers.filter(s => s.status === 'healthy').length;
  const status = healthy === servers.length && servers.length > 0 ? 'healthy' : healthy > 0 ? 'degraded' : 'unhealthy';
  return { status, totalServers: servers.length, healthyServers: healthy, servers };
}

async function collectKeycloakStatus(): Promise<SystemStatus['keycloak']> {
  const realm = process.env.KEYCLOAK_REALM || 'smart-on-fhir';
  const base = process.env.KEYCLOAK_BASE_URL;
  if (!base) {
    return { status: 'unhealthy', accessible: false, realm };
  }

  const startTime = performance.now();
  
  try {
    const kcUrl = `${base}/realms/${realm}/.well-known/openid-configuration`;
    const resp = await fetch(kcUrl, { method: 'GET', signal: AbortSignal.timeout(4000) });
    const responseTime = Math.round(performance.now() - startTime);
    
    if (resp.ok) {
      // Log successful connection
      await keycloakConnectionLogger.logConnectionAttempt(
        'connected',
        realm,
        base,
        responseTime
      );

      // Get last connected time from logs
      const lastConnected = await keycloakConnectionLogger.getLastConnectedTime();
      
      return { 
        status: 'healthy', 
        accessible: true, 
        realm, 
        lastConnected: lastConnected || undefined 
      };
    }
    
    // Log failed connection (non-200 response)
    await keycloakConnectionLogger.logConnectionAttempt(
      'failed',
      realm,
      base,
      responseTime,
      `HTTP ${resp.status}: ${resp.statusText}`
    );
    
    return { status: 'degraded', accessible: false, realm };
  } catch (error) {
    const responseTime = Math.round(performance.now() - startTime);
    
    // Log failed connection (network error)
    await keycloakConnectionLogger.logConnectionAttempt(
      'failed',
      realm,
      base,
      responseTime,
      error instanceof Error ? error.message : 'Unknown error'
    );
    
    return { status: 'unhealthy', accessible: false, realm };
  }
}

export async function collectSystemStatus(force = false): Promise<SystemStatus> {
  const now = Date.now();
  if (!force && lastSystemStatus && now - lastSystemStatusUpdated < STATUS_TTL_MS) {
    return lastSystemStatus;
  }
  const [fhir, keycloak] = await Promise.all([
    collectFhirStatus(),
    collectKeycloakStatus()
  ]);
  const overall = deriveOverall(fhir.status, keycloak.status);
  const memoryUsage = process.memoryUsage();
  lastSystemStatus = {
    version: config.version,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    overall,
    fhir,
    keycloak,
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024)
    }
  };
  lastSystemStatusUpdated = now;
  return lastSystemStatus;
}
