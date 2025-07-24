import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { keycloakPlugin } from './lib/keycloak-plugin';
import { smartRoutes } from './routes/smart';
import { fhirRoutes } from './routes/fhir';
import { serverRoutes } from './routes/server';
import { config } from './config';
import { getFHIRServerInfo } from './lib/fhir-utils';
import { adminRoutes } from './routes/admin';
import { authRoutes } from './routes/auth';
// Initialize FHIR server cache on startup
async function initializeServer() {
    console.log('🚀 Starting SMART on FHIR API server...');
    try {
        console.log('📡 Initializing FHIR server connection...');
        const fhirServer = await getFHIRServerInfo();
        console.log(`✅ FHIR server detected: ${fhirServer.serverName} (${fhirServer.fhirVersion})`);
        return fhirServer;
    }
    catch (error) {
        console.warn('⚠️  Failed to initialize FHIR server connection:', error);
        console.log('🔄 Proxy Server will continue with fallback configuration');
        return null;
    }
}
const app = new Elysia()
    .use(swagger({
    documentation: {
        info: {
            title: 'SMART on FHIR API',
            version: '1.0.0',
            description: 'Healthcare administration API for SMART on FHIR applications'
        },
        tags: [
            { name: 'authentication', description: 'Authentication and authorization endpoints' },
            { name: 'smart-apps', description: 'SMART on FHIR application management' },
            { name: 'users', description: 'Healthcare user management' },
            { name: 'admin', description: 'Administrative operations' },
            { name: 'fhir', description: 'FHIR resource proxy endpoints' },
            { name: 'identity-providers', description: 'Identity provider management' }
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT Bearer token from OAuth2 flow'
                }
            }
        },
        servers: [
            {
                url: config.baseUrl,
                description: 'Development server'
            }
        ]
    }
}))
    .use(keycloakPlugin)
    .use(smartRoutes) // smart-config
    .use(authRoutes)
    .use(adminRoutes) //admin keycloak endpoints
    .use(fhirRoutes) // the actual FHIR proxy endpoints
    .use(serverRoutes); // Server status and info endpoints, smart launcher, restart and shutdown too (will be moved to admin) - moved last to avoid static plugin interfering with FHIR routes
// Initialize and start server
initializeServer()
    .then((fhirServer) => {
    app.listen(config.port, () => {
        console.log(`🚀 SMART Launcher available at ${config.baseUrl}`);
        console.log(`📚 API Documentation available at ${config.baseUrl}/swagger`);
        if (fhirServer) {
            console.log(`🔗 SMART Protected FHIR Server available at ${config.baseUrl}/v/${fhirServer.fhirVersion}/fhir`);
        }
    });
})
    .catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});
