import { create } from 'zustand'
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

interface FHIRServerStore {
  servers: Map<string, FHIRServerInfo>
  isInitialized: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  initializeServers: () => Promise<void>
  getServerByName: (serverName: string) => FHIRServerInfo | null
  getServerUrlByName: (serverName: string) => string | null
  refreshServer: (serverName: string) => Promise<void>
  refreshAllServers: () => Promise<void>
  clearError: () => void
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export const useFHIRServerStore = create<FHIRServerStore>((set, get) => ({
  servers: new Map(),
  isInitialized: false,
  isLoading: false,
  error: null,

  initializeServers: async () => {
    const { isInitialized, isLoading } = get()
    
    // Don't initialize if already initialized or currently loading
    if (isInitialized || isLoading) return

    set({ isLoading: true, error: null })

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
          
          serverInfos.set(identifier, serverInfo)
        } catch (error) {
          logger.fhir.warn(`Failed to initialize server ${serverUrl}`, { error })
          
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

      set({ 
        servers: serverInfos, 
        isInitialized: true, 
        isLoading: false, 
        error: null 
      })
    } catch (error) {
      logger.fhir.error('Failed to initialize FHIR servers', { error })
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  },

  getServerByName: (serverName: string) => {
    const { servers } = get()
    return servers.get(serverName) || null
  },

  getServerUrlByName: (serverName: string) => {
    const { servers } = get()
    const server = servers.get(serverName)
    return server ? server.url : null
  },

  refreshServer: async (serverName: string) => {
    const { servers } = get()
    const server = servers.get(serverName)
    
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
      
      const updatedServers = new Map(servers)
      updatedServers.set(serverName, updatedServer)
      
      set({ servers: updatedServers })
    } catch (error) {
      logger.fhir.error(`Failed to refresh server ${serverName}`, { error })
    }
  },

  refreshAllServers: async () => {
    const { servers } = get()
    
    for (const [serverName, server] of servers) {
      // Check if server needs refresh (older than cache TTL)
      if (Date.now() - server.lastUpdated > CACHE_TTL) {
        await get().refreshServer(serverName)
      }
    }
  },

  clearError: () => {
    set({ error: null })
  }
}))

// Helper function to get server URL by name (for backward compatibility)
export async function getServerByName(serverName: string): Promise<string | null> {
  const store = useFHIRServerStore.getState()
  
  // Initialize servers if not done yet
  if (!store.isInitialized) {
    await store.initializeServers()
  }
  
  return store.getServerUrlByName(serverName)
}

// Helper function to get server info by name
export async function getServerInfoByName(serverName: string): Promise<FHIRServerInfo | null> {
  const store = useFHIRServerStore.getState()
  
  // Initialize servers if not done yet
  if (!store.isInitialized) {
    await store.initializeServers()
  }
  
  return store.getServerByName(serverName)
}

// Helper function to get all servers
export async function getAllServers(): Promise<FHIRServerInfo[]> {
  const store = useFHIRServerStore.getState()
  
  // Initialize servers if not done yet
  if (!store.isInitialized) {
    await store.initializeServers()
  }
  
  return Array.from(store.servers.values())
}

// Helper function to ensure servers are initialized
export async function ensureServersInitialized(): Promise<void> {
  const store = useFHIRServerStore.getState()
  
  if (!store.isInitialized) {
    await store.initializeServers()
  }
}