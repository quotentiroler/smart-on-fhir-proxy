import { config } from '../config'
import { getFHIRServerInfo, getServerIdentifier, type FHIRVersionInfo } from './fhir-utils'
import { logger } from './logger'

export interface FHIRServerInfo {
  name: string
  url: string
  identifier: string
  metadata: FHIRVersionInfo
  lastUpdated: number
}

class FHIRServerStore {
  private servers = new Map<string, FHIRServerInfo>()
  private isInitialized = false
  private isLoading = false
  private error: string | null = null
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  async initializeServers(): Promise<void> {
    // Don't initialize if already initialized or currently loading
    if (this.isInitialized || this.isLoading) return

    this.isLoading = true
    this.error = null

    try {
      const serverInfos = new Map<string, FHIRServerInfo>()

      // Fetch metadata for all configured servers
      for (let i = 0; i < config.fhir.serverBases.length; i++) {
        const serverUrl = config.fhir.serverBases[i]
        
        try {
          const metadata = await getFHIRServerInfo(serverUrl)
          const identifier = getServerIdentifier(metadata, serverUrl, i)
          
          const serverInfo: FHIRServerInfo = {
            name: metadata.serverName || `Server ${i + 1}`,
            url: serverUrl,
            identifier,
            metadata,
            lastUpdated: Date.now()
          }
          
          // Actually add the server to the map when successful
          serverInfos.set(identifier, serverInfo)
          
          logger.fhir.info(`Initialized FHIR server: ${serverInfo.name}`, { 
            url: serverUrl, 
            fhirVersion: metadata.fhirVersion 
          })
        } catch (error) {
          logger.fhir.warn(`Failed to fetch metadata for ${serverUrl}`, { error })
          
          // Add fallback server info
          const fallbackIdentifier = `server-${i}`
          const fallbackServerInfo: FHIRServerInfo = {
            name: `Server ${i + 1}`,
            url: serverUrl,
            identifier: fallbackIdentifier,
            metadata: {
              fhirVersion: config.fhir.supportedVersions[0],
              serverName: `Server ${i + 1}`,
              supported: true
            },
            lastUpdated: Date.now()
          }
          
          serverInfos.set(fallbackIdentifier, fallbackServerInfo)
        }
      }

      this.servers = serverInfos
      this.isInitialized = true
      this.isLoading = false
      this.error = null
    } catch (error) {
      logger.fhir.error('Failed to initialize FHIR servers', { error })
      this.isLoading = false
      this.error = error instanceof Error ? error.message : 'Unknown error'
    }
  }

  getServerByName(serverName: string): FHIRServerInfo | null {
    return this.servers.get(serverName) || null
  }

  getServerUrlByName(serverName: string): string | null {
    const server = this.servers.get(serverName)
    return server ? server.url : null
  }

  async refreshServer(serverName: string): Promise<void> {
    const server = this.servers.get(serverName)
    
    if (!server) {
      logger.fhir.warn(`Server ${serverName} not found`)
      return
    }

    try {
      const metadata = await getFHIRServerInfo(server.url)
      const updatedServer: FHIRServerInfo = {
        ...server,
        metadata,
        lastUpdated: Date.now()
      }
      
      this.servers.set(serverName, updatedServer)
    } catch (error) {
      logger.fhir.error(`Failed to refresh server ${serverName}`, { error })
    }
  }

  async refreshAllServers(): Promise<void> {
    for (const [serverName, server] of this.servers) {
      // Check if server needs refresh (older than cache TTL)
      if (Date.now() - server.lastUpdated > this.CACHE_TTL) {
        await this.refreshServer(serverName)
      }
    }
  }

  getAllServers(): FHIRServerInfo[] {
    return Array.from(this.servers.values())
  }

  clearError(): void {
    this.error = null
  }

  getError(): string | null {
    return this.error
  }

  getIsInitialized(): boolean {
    return this.isInitialized
  }

  getIsLoading(): boolean {
    return this.isLoading
  }
}

// Create a singleton instance
const fhirServerStore = new FHIRServerStore()

// Helper function to get server URL by name (for backward compatibility)
export async function getServerByName(serverName: string): Promise<string | null> {
  // Initialize servers if not done yet
  if (!fhirServerStore.getIsInitialized()) {
    await fhirServerStore.initializeServers()
  }
  
  return fhirServerStore.getServerUrlByName(serverName)
}

// Helper function to get server info by name
export async function getServerInfoByName(serverName: string): Promise<FHIRServerInfo | null> {
  // Initialize servers if not done yet
  if (!fhirServerStore.getIsInitialized()) {
    await fhirServerStore.initializeServers()
  }
  
  return fhirServerStore.getServerByName(serverName)
}

// Helper function to get all servers
export async function getAllServers(): Promise<FHIRServerInfo[]> {
  // Initialize servers if not done yet
  if (!fhirServerStore.getIsInitialized()) {
    await fhirServerStore.initializeServers()
  }
  
  return fhirServerStore.getAllServers()
}

// Helper function to ensure servers are initialized
export async function ensureServersInitialized(): Promise<void> {
  if (!fhirServerStore.getIsInitialized()) {
    await fhirServerStore.initializeServers()
  }
}

// Export the store instance for direct access if needed
export { fhirServerStore }