# SMART on FHIR Platform Documentation

Welcome to the comprehensive documentation for the SMART on FHIR Platform. This platform provides a complete healthcare application management system with OAuth 2.0 authorization, FHIR resource management, and an intelligent administrative interface.

## 🏥 Platform Overview

The SMART on FHIR Platform is a complete solution for managing healthcare applications, users, and FHIR servers in compliance with the SMART App Launch framework. It provides secure OAuth 2.0 flows, comprehensive user management, and real-time monitoring capabilities.

### Key Features

- **🔐 OAuth 2.0 & SMART Authorization**: Complete implementation of SMART App Launch Framework
- **👥 Healthcare User Management**: Comprehensive user lifecycle management with FHIR associations
- **🏥 FHIR Server Management**: Multi-server support with health monitoring and configuration
- **📱 SMART App Registry**: Application registration, scope management, and launch context configuration
- **🎯 Scope Management**: Granular FHIR resource permissions with role-based templates
- **🚀 Launch Context Management**: Dynamic context injection for clinical applications
- **📊 OAuth Monitoring**: Real-time analytics and flow monitoring with WebSocket support
- **🔑 Identity Provider Integration**: SAML 2.0 and OpenID Connect IdP management
- **🤖 AI Assistant**: Intelligent administrative assistant with RAG-powered support

## 📚 Documentation Structure

### Admin UI Documentation
- [Dashboard Overview](./admin-ui/dashboard.md) - System overview and health monitoring
- [User Management](./admin-ui/user-management.md) - Healthcare users and FHIR associations
- [SMART Apps](./admin-ui/smart-apps.md) - Application registration and management
- [FHIR Servers](./admin-ui/fhir-servers.md) - Server configuration and monitoring
- [Scope Management](./admin-ui/scope-management.md) - FHIR permissions and templates
- [Launch Context](./admin-ui/launch-context.md) - Context configuration and injection
- [OAuth Monitoring](./admin-ui/oauth-monitoring.md) - Real-time flow analytics
- [Identity Providers](./admin-ui/identity-providers.md) - IdP configuration and management

### SMART on FHIR Concepts
- [SMART App Launch](./smart-on-fhir/smart-app-launch.md) - Framework overview and implementation
- [OAuth 2.0 Flows](./smart-on-fhir/oauth-flows.md) - Authorization flows and patterns
- [FHIR Resources](./smart-on-fhir/fhir-resources.md) - Resource types and relationships
- [Scopes and Permissions](./smart-on-fhir/scopes-permissions.md) - Access control and security
- [Launch Contexts](./smart-on-fhir/launch-contexts.md) - Clinical context management
- [Agent Scopes](./smart-on-fhir/agent-scopes.md) - Autonomous agent authorization

### API Documentation
- [Admin API](./api/admin-api.md) - Administrative endpoints and operations
- [OAuth Endpoints](./api/oauth-endpoints.md) - Authorization server endpoints
- [FHIR Proxy](./api/fhir-proxy.md) - FHIR server proxy and routing
- [WebSocket Events](./api/websocket-events.md) - Real-time event streaming

### Tutorials and Guides
- [Getting Started](./tutorials/getting-started.md) - Platform setup and first steps
- [Registering SMART Apps](./tutorials/smart-app-registration.md) - Step-by-step app registration
- [User Onboarding](./tutorials/user-onboarding.md) - Adding and configuring users
- [FHIR Server Setup](./tutorials/fhir-server-setup.md) - Connecting FHIR servers
- [Launch Context Configuration](./tutorials/launch-context-setup.md) - Setting up clinical contexts
- [OAuth Flow Testing](./tutorials/oauth-flow-testing.md) - Testing authorization flows
- [Troubleshooting](./tutorials/troubleshooting.md) - Common issues and solutions

## 🚀 Quick Start

1. **System Setup**: Configure your FHIR servers and identity providers
2. **User Management**: Add healthcare users and associate them with FHIR Person resources
3. **App Registration**: Register your SMART applications with appropriate scopes
4. **Launch Context**: Configure clinical contexts for your applications
5. **Testing**: Use the OAuth monitoring dashboard to test and validate flows

## 🛠️ AI Assistant Integration

This platform includes an intelligent AI assistant that can help you navigate and manage all aspects of the system. The assistant is powered by RAG (Retrieval Augmented Generation) technology and has comprehensive knowledge of:

- SMART on FHIR specifications and best practices
- Platform configuration and administration
- OAuth 2.0 flows and troubleshooting
- FHIR resource management
- Clinical workflow integration

Ask the assistant questions like:
- "How do I register a new SMART app?"
- "What scopes do I need for patient data access?"
- "How do I configure launch contexts?"
- "Show me the OAuth monitoring dashboard"

## 📖 Additional Resources

- [SMART App Launch Framework](https://hl7.org/fhir/smart-app-launch/)
- [FHIR R4 Specification](https://hl7.org/fhir/R4/)
- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect](https://openid.net/connect/)

## 🤝 Support

For support and questions:
- Use the built-in AI Assistant for immediate help
- Check the troubleshooting guide
- Review the comprehensive documentation sections above

---

*This documentation is automatically synchronized with the AI assistant's knowledge base for consistent and up-to-date information.*
