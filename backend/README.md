# SMART on FHIR Backend

A SMART on FHIR compliant backend server that provides authentication, authorization, and multi-server FHIR proxy capabilities.

## Features

- **Multi-Server FHIR Support**: Support for multiple FHIR servers with dynamic routing
- **SMART on FHIR Compliance**: Full SMART App Launch framework implementation
- **OAuth2/OIDC**: Authentication and authorization via Keycloak
- **Authorization Details**: RFC 9396 compliant authorization details for multiple FHIR servers
- **Admin Interface**: Web-based administration for users, apps, and servers

## Getting Started

### Prerequisites
- Bun runtime
- Keycloak server (for authentication)
- One or more FHIR servers

### Installation
```bash
bun install
```

### Configuration
Copy `.env.example` to `.env` and configure your environment:

```bash
# Base URL for your SMART proxy
BASE_URL=http://localhost:8445

# Multiple FHIR servers (comma-separated)
FHIR_SERVER_BASE=https://hapi.fhir.org/baseR4,https://hapi.fhir.org/baseSTU3

# Keycloak configuration
KEYCLOAK_BASE_URL=http://localhost:8080
KEYCLOAK_REALM=smart-on-fhir
KEYCLOAK_CLIENT_ID=smart-on-fhir-backend
KEYCLOAK_CLIENT_SECRET=your-client-secret
```

### Development
```bash
bun run dev
```

## API Endpoints

### Server Discovery
- `GET /servers` - List all available FHIR servers
- `GET /servers/{serverName}` - Get specific server information

### FHIR Proxy (Multi-Server)
- `GET /{serverName}/{fhirVersion}/fhir/*` - FHIR resource access
- `GET /{serverName}/{fhirVersion}/fhir/.well-known/smart-configuration` - SMART configuration

### Authentication
- `GET /auth/authorize` - OAuth2 authorization endpoint
- `POST /auth/token` - OAuth2 token endpoint (with authorization details)
- `POST /auth/introspect` - Token introspection
- `GET /auth/userinfo` - User information

### Examples

With multiple servers configured:
```bash
# Discover available servers
curl http://localhost:8445/servers

# Access Patient resources on specific server
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8445/hapi-fhir-org/R4/fhir/Patient

# Get SMART configuration for specific server
curl http://localhost:8445/hapi-fhir-org/R4/fhir/.well-known/smart-configuration
```

## Server Naming

Server names are automatically generated from URLs:
- `https://hapi.fhir.org/baseR4` → `hapi-fhir-org`
- `https://server.fire.ly/r4` → `server-fire-ly`
- `https://test.com/fhir` → `test-com`

## Authorization Details

The server automatically generates RFC 9396 compliant authorization details for each configured FHIR server:

```json
{
  "authorization_details": [
    {
      "type": "smart_on_fhir",
      "locations": ["http://localhost:8445/hapi-fhir-org/R4/fhir"],
      "fhirVersions": ["R4"],
      "scope": "patient/*.read"
    }
  ]
}
```

## Documentation

API documentation is available at `http://localhost:8445/swagger` when the server is running.