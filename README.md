# SMART on FHIR Implementation

A comprehensive SMART on FHIR server implementation that acts as a secure proxy for FHIR servers, providing OAuth2/OIDC authorization using Keycloak with PostgreSQL backend. This project implements the full SMART App Launch Framework specification with support for EHR Launch, Standalone Launch, and Backend Services flows.

⚠️ **DEVELOPMENT STATUS: Early Development Phase** ⚠️

Checkout from `update` branch to create a new branch.

New development branches should  start with `dev/` and create a PR to merge into `update`

## Project Overview

This server intercepts requests to otherwise open FHIR servers and requires proper authorization, implementing:

- **OAuth2/OIDC Authorization** - Full SMART on FHIR authorization flows
- **Keycloak Integration** - Identity and access management
- **Multi-tenant Architecture** - Support for multiple healthcare organizations
- **Launch Context Management** - Patient and encounter context handling
- **Role-based Access Control** - Healthcare-specific role management
- **Agent Support** - Autonomous agents with Device-based identity (see [AGENT_SUPPORT.md](AGENT_SUPPORT.md))
- **FHIR Proxy** - Secure FHIR resource access

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   SMART     │    │   Backend    │    │   FHIR      │
│   Client    │◄──►│   Proxy      │◄──►│   Server    │
│             │    │   Server     │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │  Keycloak    │
                   │  + PostgreSQL│
                   └──────────────┘
```

## Current Development Status

### ✅ Core Infrastructure Complete

- Backend server architecture (Node.js/TypeScript)
- Keycloak integration and OAuth2 flows
- Administrative API with generated clients
- Docker containerization
- Development environment setup

### 🚧 Currently Working On

- **Test Suite Implementation** - This is our immediate focus

### ❌ Missing Critical Components

- **No comprehensive tests implemented yet**
- OAuth security validation tests
- SMART flow end-to-end tests
- Integration test coverage
- Backend logic verification

## Next Steps: Test Implementation Priority

The [`test/`](test/) directory structure exists but is essentially empty. Our immediate tasks:

1. **Fill Test Infrastructure**

   - Implement SMART flow tests in `test/smart-flows/`
   - Create OAuth security tests in `test/oauth-security/`
   - Build integration test framework
2. **Verify Backend Logic**

   - Test all API endpoints and authentication flows
   - Validate FHIR proxy functionality
   - Ensure Keycloak integration works correctly
3. **Security Validation**

   - Test OAuth2 security implementation
   - Verify token handling and validation
   - Check for common OAuth vulnerabilities
4. Then continue with **UI**

## Development Setup

```bash
# Install dependencies
bun setup

# Start development environment
bun dev

# Start Keycloak and database
bun docker:up

# Both together
bun docker:dev
```

## API Client Generation

API clients are (semi-)auto-generated from OpenAPI specs:

```bash
# Generate type-safe API clients
bun run generate
```

Clients available at:

- `test/lib/api-client/` - For testing (when we implement them)
- `ui/src/lib/api-client/` - For admin UI

This will be fully automated using CI/CD
