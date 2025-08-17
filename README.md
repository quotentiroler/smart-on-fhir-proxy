# Proxy Smart

**Secure any FHIR server in minutes!** A comprehensive healthcare platform that transforms unsecured FHIR servers into SMART-compliant, OAuth 2.0 protected endpoints with enterprise-grade security, user management, and AI-powered administration.

[![Version](https://img.shields.io/badge/v0.0.1-alpha-blue.svg)](https://github.com/quotentiroler/proxy-smart)
[![SMART App Launch](https://img.shields.io/badge/SMART%20App%20Launch-2.2.0-green.svg)](http://hl7.org/fhir/smart-app-launch/)
[![FHIR](https://img.shields.io/badge/FHIR-R4%2FR4B-orange.svg)](https://hl7.org/fhir/R4/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Bun](https://img.shields.io/badge/bun-%3E%3D1.0.0-pink.svg)](https://bun.sh/)

## 🏥 Overview

Proxy Smart is an Open Source **stateless proxy solution** that makes it **incredibly easy to secure any FHIR server** with enterprise-grade OAuth 2.0 authentication and SMART App Launch compliance. 

### 🚀 **Secure Any FHIR Server in Minutes**

**All you need is:**
- ✅ **Any FHIR server** (HAPI FHIR, Microsoft FHIR, AWS HealthLake, etc.)
- ✅ **A running Keycloak instance** (included in our Docker setup)
- ✅ **Proxy Smart** (this application)

**That's it!** No vendor lock-in, no data migration required.

### 🔄 Stateless Proxy Architecture

**No Data Storage**: Proxy Smart acts as a secure intermediary that routes FHIR requests without storing patient data or clinical information. All FHIR resources remain on your existing servers.

**Real-time Routing**: Every request is processed and forwarded in real-time to the appropriate FHIR server, ensuring data freshness and compliance with source systems.

**Zero Data Persistence**: The proxy maintains no clinical data state between requests, providing enhanced security and simplified compliance requirements.

**Audit & Monitoring**: While clinical data flows through without storage, the proxy can optionally log request metadata, OAuth flows, and access patterns for monitoring and compliance auditing.

### Key Features

- **🔐 Complete OAuth 2.0 & SMART Authorization**: Full implementation of SMART App Launch Framework 2.2.0
- **🔄 Stateless FHIR Proxy**: Secure request routing without data persistence
- **👥 Healthcare User Management**: Comprehensive lifecycle management with FHIR resource associations
- **🏥 Multi-FHIR Server Support**: Health monitoring, configuration, and proxy capabilities
- **📱 SMART App Registry**: Application registration with granular scope management
- **🎯 Dynamic Launch Context**: Clinical context injection and management
- **📊 Real-time OAuth Monitoring**: Live analytics with WebSocket-powered dashboards
- **🔑 Enterprise Identity Integration**: SAML 2.0 and OpenID Connect support
- **🤖 AI-Powered Administrative Assistant**: RAG-enabled intelligent support system
- **🚀 Automated CI/CD Pipeline**: Multi-branch versioning with GitHub Actions

## 🏗️ Architecture

Proxy Smart implements a **stateless proxy architecture** that sits between SMART applications and FHIR servers, providing authentication, authorization, and monitoring without storing clinical data.

### 🔄 Proxy Flow

```
SMART App → Proxy Smart (Auth + Route) → FHIR Server → Response → Proxy Smart → SMART App
```

**Key Principle**: Every FHIR request flows through the proxy for authentication and routing, but **no clinical data is stored or cached** in the proxy layer. Optional audit logging captures request metadata for compliance and monitoring without storing clinical content.

```mermaid
graph TB
    subgraph "External Clients"
        A["Admin UI<br/>React + Vite"]
        B["SMART Apps<br/>Web & Mobile"]
        C["Healthcare Systems<br/>EHR Integration"]
    end
  
    subgraph "API Gateway & Core Platform"
        D["Proxy Smart<br/>Node.js + TypeScript"]
        E["OAuth 2.0 Endpoints<br/>SMART App Launch 2.2.0"]
        F["WebSocket Server<br/>Real-time Events"]
        G["Discovery Endpoints<br/>FHIR Capability"]
    end
  
    subgraph "Identity & Security Layer"
        H["Keycloak<br/>Identity Provider"]
        I["PostgreSQL<br/>User & Config Data"]
        J["SAML/OIDC<br/>Enterprise SSO"]
    end
  
    subgraph "FHIR Ecosystem"
        K["FHIR Servers<br/>R4/R4B Compliant"]
        L["FHIR Resources<br/>Patient, Practitioner"]
        M["Protected Resources<br/>Authorization Required"]
    end
  
    subgraph "AI & Intelligence"
        N["AI Assistant<br/>OpenAI gpt-5-mini"]
        O["Real-time Analytics<br/>OAuth Monitoring"]
        P["RAG System<br/>Documentation Knowledge"]
        Q["Predictive Insights<br/>Usage Patterns"]
    end
  
    subgraph "DevOps & Monitoring"
        R["Docker Containers<br/>Microservices"]
        S["CI/CD Pipeline<br/>GitHub Actions"]
        T["Health Monitoring<br/>System Metrics"]
        U["Audit Logging<br/>Compliance Tracking"]
    end
  
    %% Client Layer Connections
    A -->|HTTPS/WSS| D
    A -->|WebSocket| F
    B -->|OAuth Flow| E
    B -->|FHIR API| D
    C -->|SMART Launch| E
  
    %% Platform Core Connections
    D --> E
    D --> F
    D --> G
    E -->|Token Validation| H
    F -->|Live Events| O
  
    %% Identity & Security
    D -->|Authentication| H
    H --> I
    H --> J
    E -->|User Context| H
  
    %% FHIR Ecosystem
    D -->|Proxy Requests| K
    K --> L
    K -->|Access Control| M
    E -->|Scope Validation| M
  
    %% AI & Intelligence
    D -->|Context Data| N
    F -->|Event Stream| O
    N --> P
    O -->|Analytics| Q
    N -->|Smart Responses| A
  
    %% DevOps & Operations
    D -->|Logs| U
    H -->|Audit Trail| U
    R -->|Container Health| T
    S -->|Deployment| R
    T -->|Metrics| O
  
    %% Styling
    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef platform fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef security fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef fhir fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef ai fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef devops fill:#f1f8e9,stroke:#33691e,stroke-width:2px
  
    class A,B,C client
    class D,E,F,G platform
    class H,I,J security
    class K,L,M fhir
    class N,O,P,Q ai
    class R,S,T,U devops
```

### Technology Stack

- **Proxy Layer**: Node.js, TypeScript, Elysia, Bun (stateless request processing)
- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Identity**: Keycloak with PostgreSQL (user management only, no clinical data)
- **AI**: OpenAI gpt-5-mini with RAG
- **Monitoring**: WebSocket, Real-time dashboards
- **Testing**: Jest, Playwright, Comprehensive test suites
- **Deployment**: Docker, GitHub Actions CI/CD

**Note**: PostgreSQL stores only user management and configuration data. All clinical/FHIR data remains on source FHIR servers.

## ✨ Why Stateless Proxy?

### 🔒 Enhanced Security
- **No Data Exposure**: Clinical data never resides in the proxy, reducing attack surface
- **Compliance Simplified**: Easier HIPAA, GDPR compliance with no clinical data storage
- **Zero Data Breach Risk**: No clinical data to compromise in the proxy layer
- **Audit Trail**: Optional logging of access patterns and OAuth flows for compliance monitoring

### ⚡ Performance Benefits
- **Real-time Data**: Always current data from source FHIR servers
- **Scalable**: Stateless design enables horizontal scaling without data synchronization
- **Low Latency**: Direct routing without database lookups for FHIR requests

### 🛠️ Operational Advantages
- **Simple Backup**: Only configuration, user data, and optional audit logs - not terabytes of clinical data
- **Easy Migration**: Proxy can be moved/replicated without clinical data concerns
- **Minimal Storage**: Dramatically reduced infrastructure requirements
- **Configurable Logging**: Enable detailed audit trails when needed for compliance without affecting performance

## 🚀 Quick Start

### Prerequisites

- Node.js ≥18.0.0
- Bun ≥1.0.0
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/quotentiroler/proxy-smart.git
   cd proxy-smart
   ```
2. **Start the development environment**

   ```bash
   # Start all services with Docker
   bun docker:dev

   # Install dependencies
   bun install

   # Start development servers
   bun run dev
   ```
3. **Access the platform**

   - Admin UI: http://localhost:3000
   - Backend API: http://localhost:8080
   - Keycloak: http://localhost:8090
4. **Initial Configuration**

   - Log into the Admin UI with default credentials
   - Follow the [Getting Started Guide](docs/tutorials/getting-started.md)
   - Configure your first FHIR server and SMART app

## 📚 Documentation

### 🎯 Quick Links

- **[Getting Started](docs/tutorials/getting-started.md)** - Complete setup guide
- **[API Documentation](docs/api/)** - Comprehensive API reference
- **[SMART 2.2.0 Checklist](docs/SMART_2.2.0_CHECKLIST.md)** - Implementation progress
- **[Development Roadmap](ROADMAP.md)** - Feature roadmap and milestones

### 🛠️ Admin UI Documentation

- [Dashboard Overview](docs/admin-ui/dashboard.md) - System monitoring and health
- [User Management](docs/admin-ui/user-management.md) - Healthcare user administration
- [SMART Apps](docs/admin-ui/smart-apps.md) - Application registration and management
- [FHIR Servers](docs/admin-ui/fhir-servers.md) - Server configuration and monitoring
- [Scope Management](docs/admin-ui/scope-management.md) - Granular permission control

### 🔬 Technical Guides

- [OAuth 2.0 Flows](docs/smart-on-fhir/oauth-flows.md) - Authorization patterns
- [Launch Contexts](docs/smart-on-fhir/launch-contexts.md) - Clinical context management
- [Agent Scopes](docs/smart-on-fhir/agent-scopes.md) - Autonomous system authorization
- [Version Management](docs/VERSION_MANAGEMENT.md) - Release and versioning strategy

### 📖 Tutorials

- [Registering SMART Apps](docs/tutorials/smart-app-registration.md)
- [User Onboarding](docs/tutorials/user-onboarding.md)
- [FHIR Server Setup](docs/tutorials/fhir-server-setup.md)
- [OAuth Flow Testing](docs/tutorials/oauth-flow-testing.md)
- [Troubleshooting](docs/tutorials/troubleshooting.md)

## 🤖 AI Assistant

The platform includes an intelligent AI assistant powered by RAG (Retrieval Augmented Generation) technology:

### Capabilities

- **Navigation Guidance**: Help finding the right administrative sections
- **Configuration Assistance**: Step-by-step setup guidance
- **SMART on FHIR Expertise**: Deep knowledge of specifications and best practices
- **Troubleshooting Support**: Common issues and solutions
- **Real-time Documentation**: Always up-to-date with platform changes

### Example Queries

```
"How do I register a new SMART app?"
"What scopes do I need for patient data access?"
"Show me the OAuth monitoring dashboard"
"How do I configure launch contexts for my app?"
"What are the security best practices?"
```

## 🛠️ Development

### Project Structure

```
proxy-smart/
├── backend/          # Node.js backend API
├── ui/               # React admin interface
├── test/             # Comprehensive test suites
├── keycloak/         # Identity provider configuration
├── docs/             # Complete documentation
├── .github/          # CI/CD workflows
└── scripts/          # Development and deployment scripts
```

### Development Commands

```bash
# Development
bun run dev              # Start all development servers
bun run dev:backend      # Backend only
bun run dev:ui           # Frontend only

# Building
bun run build            # Build all projects
bun run build:backend    # Build backend
bun run build:ui         # Build frontend

# Testing
bun run test                    # Run all tests
bun run test:smart-flows        # SMART App Launch tests
bun run test:backend-services   # Backend API tests

# API Generation
bun run generate                # Generate client APIs
bun run validate-api            # Validate OpenAPI specs

# Version Management
bun run version:sync            # Sync all package.json versions
bun run version:bump patch      # Bump patch version
```

### Docker Commands

Proxy Smart provides multiple Docker deployment strategies for different use cases:

```bash
# Hot-Reload Environment: (Single Container Mode, No UI Hot-Reload)
docker compose up
bun run dev:mono

# Hot-Reload Environment: (Separated Services)
docker compose up
bun run dev

# Development Environment (Single Container Mode)
bun run docker:dev              # Start dev containers with mono app
bun run docker:dev:build        # Build and start dev containers
bun run docker:dev:down         # Stop dev containers
bun run docker:dev:logs         # View dev container logs

# Production Environment (Separated Services)
bun run docker:prod             # Start production containers
bun run docker:prod:build       # Build and start production containers
bun run docker:prod:down        # Stop production containers
bun run docker:prod:logs        # View production container logs

# Individual Container Builds
bun run docker:backend          # Build backend container only
bun run docker:ui               # Build UI container only
bun run docker:mono             # Build monolithic container

# Base Docker Commands
bun run docker:up               # Start default containers
bun run docker:down             # Stop default containers
bun run docker:logs             # View default container logs
```

### Docker Deployment Modes

#### 1. Development Mode (`docker:dev`)
- **File**: `docker-compose.development.yml`
- **Architecture**: Monolithic container (UI + Backend in one)
- **Use Case**: Local development and testing
- **Services**:
  - `app`: Mono container (Backend + UI at `/webapp/`)
  - `keycloak`: Identity provider
  - `postgres`: Database
- **URLs**:
  - Application: http://localhost:8445
  - UI: http://localhost:8445/webapp/
  - Keycloak: http://localhost:8080

#### 2. Production Mode (`docker:prod`)
- **File**: `docker-compose.prod.yml`
- **Architecture**: Microservices (separate containers)
- **Use Case**: Production deployment and staging
- **Services**:
  - `backend`: API server only
  - `frontend`: Nginx serving React SPA
  - `keycloak`: Identity provider
  - `postgres`: Database
- **URLs**:
  - Backend API: http://localhost:8445
  - Frontend UI: http://localhost:3000
  - Keycloak: http://localhost:8080

#### 3. Default Mode (`docker:up`)
- **File**: `docker-compose.yml`
- **Architecture**: Basic development setup
- **Use Case**: Simple local testing
- **Services**: Core services without application

### Quick Start Examples

```bash
# 🚀 Fastest setup - Development mode
bun run docker:dev:build
# ➜ Visit http://localhost:8445/webapp/

# 🏭 Production-like setup - Separated services
bun run docker:prod:build
# ➜ Frontend: http://localhost:3000
# ➜ Backend: http://localhost:8445

# 🔧 Build individual components
bun run docker:backend          # Just the API
bun run docker:ui               # Just the frontend
bun run docker:mono             # All-in-one container
```

### Branching Strategy

- **`main`**: Production releases (auto-tagged)
- **`test`**: Beta releases with `-beta` suffix
- **`develop`**: Alpha releases with `-alpha` suffix
- **`dev/*`**: Feature branches

Each branch automatically triggers appropriate CI/CD workflows with version management. No PR needs to be created when pushing into a branch starting with `dev/`

## 📋 Development Status

### ✅ Completed Features

- Core infrastructure and architecture
- Multi-branch CI/CD pipeline with automated versioning
- Keycloak integration and OAuth2 flows
- Administrative API with generated clients
- Docker containerization and development environment
- Comprehensive documentation structure

### 🚧 In Progress (v0.0.2-v0.0.8)

- SMART App Launch 2.2.0 specification implementation
- Discovery endpoints and capability advertisement
- EHR and Standalone launch flows
- Enhanced OAuth2 security patterns
- Real-time monitoring dashboards

### 📅 Roadmap Highlights

| Version          | Milestone              | Target Features                           |
| ---------------- | ---------------------- | ----------------------------------------- |
| **<0.1.0** | Early Development      | Test deployment, incomplete documentation |
| **v0.1.0** | SMART 2.2.0 Compliance | Complete specification implementation     |
| **v0.9.0** | AI Enhancement         | Advanced monitoring, predictive analytics |
| **v1.0.0** | Production Ready       | Enterprise deployment, full documentation |

**[📖 View Complete Roadmap](ROADMAP.md)**

## 🔒 Security

### OAuth 2.0 Security Features

- PKCE (Proof Key for Code Exchange) support
- JWT token validation and introspection
- Scope-based access control
- Refresh token rotation
- Rate limiting and brute force protection

### Enterprise Security

- SAML 2.0 and OpenID Connect integration
- Multi-factor authentication support
- Audit logging and compliance tracking
- TLS/SSL encryption for all communications
- Role-based access control (RBAC)

### SMART on FHIR Compliance

- Patient context security
- Launch context validation
- Scope verification and enforcement
- Backend services authentication
- Agent-based authorization patterns


## 📈 Monitoring & Analytics

### Real-time Dashboards

- OAuth flow monitoring and analytics
- FHIR server health and performance
- User activity and access patterns
- Application usage statistics
- System performance metrics

### WebSocket Integration

- Live event streaming
- Real-time notifications
- Interactive dashboards
- Immediate alert systems

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines and:

1. Fork the repository
2. Create a feature branch (`dev/feature-name`)
3. Make your changes with tests

### Development Guidelines

- Follow TypeScript and React best practices
- Include comprehensive tests for new features
- Update documentation for API changes
- Ensure SMART on FHIR compliance

## 📄 License

This project is available under **dual licensing**:

### 🔓 Open Source - AGPL v3

For open source projects, research, and non-commercial use:

- Free to use and modify
- Must share source code when deploying as web service
- All modifications must remain open source

### 💼 Commercial License

For commercial use and proprietary applications:

📋 **[Learn more about dual licensing](LICENSE-DUAL.md)**

## 🆘 Support

### Getting Help

- **🤖 AI Assistant**: Use the built-in AI assistant for immediate help
- **💬 Discord Community**: Join our active community at [https://discord.gg/FshSApM7](https://discord.gg/FshSApM7)
- **📚 Documentation**: Check our comprehensive [documentation](docs/)
- **🐛 Issues**: Report bugs and request features on GitHub
- **💡 Discussions**: Join community discussions and share your healthcare interoperability challenges

### Professional Support

For enterprise deployments and professional support, please contact our team.

## 🔗 Related Projects

- [SMART App Launch Framework](http://hl7.org/fhir/smart-app-launch/)
- [FHIR R4 Specification](https://hl7.org/fhir/R4/)
- [Keycloak](https://www.keycloak.org/)
- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)

---

<div align="center">

**Built with ❤️ for the healthcare community**

[🏠 Home](https://github.com/quotentiroler/proxy-smart) • [📚 Documentation](docs/) • [🚀 Roadmap](ROADMAP.md) • [🐛 Issues](https://github.com/quotentiroler/proxy-smart/issues)

</div>
