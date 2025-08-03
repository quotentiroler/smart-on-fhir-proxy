# SMART App Launch Implementation Checklist (Version History)

## Overview

This document provides a detailed breakdown of the HL7 SMART App Launch specification requirements organized by version introduction and our implementation status.

**Specification URL**: http://hl7.org/fhir/smart-app-launch/
**Current Version**: 2.2.0 (STU 2.2) - Published 2024-04-30
**FHIR Version**: Compatible with FHIR DSTU2+, artifacts for R4/R4B

## 📅 Version History & Feature Introduction

### SMART 1.0 (STU 1) - November 2018
**Foundation Release**
- Basic OAuth 2.0 patterns for FHIR
- EHR launch and standalone launch flows
- Original scope syntax (`patient/*.read`, `user/*.read`)
- Basic patient and user context

### SMART 2.0 (STU 2) - November 2021
**Major Enhancement Release**
- **New scope syntax** for granular permissions (`patient/[Resource].[cruds]`)
- **PKCE requirement** for authorization
- **POST-based authorization** support
- **Token introspection** profiling (RFC 7662)
- **Backend Services** authorization pattern
- **Asymmetric client authentication** (preferred method)
- Enhanced discovery properties
- Guidance for communicating permissions to end users

### SMART 2.1 (STU 2.1) - April 2023
**Context & State Enhancement Release**
- **Enhanced fhirContext** for more detailed launch context
- **PractitionerRole support** for fhirUser
- **Absolute URL requirement** for smart-configuration links
- **SMART App State Persistence** (experimental)
- **Task profiles** for describing app launch
- Removal of dynamic ports note in redirect_uri

### SMART 2.2 (STU 2.2) - April 2024 (Current)
**Branding & Enhanced Context Release**
- **Surface branding information** for endpoints and organizations
- **Enhanced fhirContext** with canonical and identifier references
- **Organization-level branding** metadata
- **Endpoint-specific branding** support

---

## 🔍 Discovery & Configuration

### .well-known/smart-configuration Endpoint
**(SMART 1.0+ Core Feature)**

- [ ] **Required Fields**
  - `authorization_endpoint` - OAuth 2.0 authorization endpoint
  - `token_endpoint` - OAuth 2.0 token endpoint
  - `capabilities` - Array of supported capabilities
- [ ] **Optional Fields**
  - `revocation_endpoint` - Token revocation endpoint
  - `introspection_endpoint` - Token introspection endpoint *(SMART 2.0+)*
  - `management_endpoint` - App management endpoint
  - `registration_endpoint` - Dynamic client registration
- [ ] **SMART-Specific Fields**
  - `scopes_supported` - List of supported scopes
  - `response_types_supported` - Supported OAuth response types
  - `code_challenge_methods_supported` - PKCE methods *(SMART 2.0+)*
  - `grant_types_supported` - Supported grant types

### Capability Advertisement

#### SMART 1.0 Core Capabilities
- [ ] **App Launch Capabilities**
  - `launch-ehr` - EHR launch support
  - `launch-standalone` - Standalone launch support
  - `client-public` - Public client support
  - `client-confidential-symmetric` - Symmetric client authentication

#### SMART 2.0+ Enhanced Capabilities
- [ ] **Enhanced Authentication**
  - `client-confidential-asymmetric` - Asymmetric client authentication *(Preferred)*
- [ ] **Context Capabilities**
  - `context-ehr-patient` - Patient context in EHR launch
  - `context-ehr-encounter` - Encounter context in EHR launch
  - `context-standalone-patient` - Patient selection in standalone
  - `context-standalone-encounter` - Encounter selection in standalone
- [ ] **Permission Capabilities**
  - `permission-offline` - Refresh token support
  - `permission-patient` - Patient-level access
  - `permission-user` - User-level access
  - `permission-v2` - SMARTv2 scope syntax *(SMART 2.0+)*

---

## 🚀 Authorization Patterns

### 1. SMART App Launch (User-Facing Apps)
**(SMART 1.0+ Core Feature)**

#### EHR Launch Flow *(SMART 1.0+)*

- [ ] **Launch Parameters**
  - `iss` - FHIR server URL
  - `launch` - Launch context token
- [ ] **Authorization Request**
  - `response_type=code`
  - `client_id` - Registered client identifier
  - `redirect_uri` - Callback URL
  - `scope` - Requested permissions
  - `state` - CSRF protection
  - `aud` - FHIR server URL
  - `launch` - Launch context (EHR launch)
  - `code_challenge` + `code_challenge_method` - PKCE *(SMART 2.0+ Required)*
- [ ] **Authorization Response**
  - Authorization code return
  - State validation
  - Error handling

#### Standalone Launch Flow *(SMART 1.0+)*

- [ ] **Patient Selection**
  - Patient picker interface
  - Search functionality
  - Selection persistence
- [ ] **Authorization Request (Standalone)**
  - Same as EHR launch but without `launch` parameter
  - Patient selection during auth flow
- [ ] **Context Establishment**
  - Patient context from selection
  - Encounter context (if applicable)

#### Token Exchange *(Enhanced in SMART 2.0+)*

- [ ] **Authorization Code Exchange**
  - Code for token exchange
  - Client authentication (if confidential)
  - **PKCE verification** *(SMART 2.0+ Required)*
- [ ] **Token Response**
  - `access_token` - Bearer token for API access
  - `token_type` - Always "Bearer"
  - `expires_in` - Token lifetime
  - `scope` - Granted permissions
  - `refresh_token` - For offline access (optional)
  - `patient` - Patient context (if applicable)
  - `encounter` - Encounter context (if applicable)

### 2. SMART Backend Services (System-to-System)
**(SMART 2.0+ New Feature)**

#### Client Credentials Grant

- [ ] **Client Authentication**
  - JWT-based authentication (preferred)
  - Client secret authentication (alternative)
- [ ] **Token Request**
  - `grant_type=client_credentials`
  - `scope` - System-level scopes
  - `client_assertion_type` - JWT assertion type
  - `client_assertion` - Signed JWT
- [ ] **Token Response**
  - `access_token` - System-level access token
  - `token_type` - "Bearer"
  - `expires_in` - Token lifetime
  - `scope` - Granted system permissions

---

## 🔐 Client Authentication

### Asymmetric Authentication (Preferred - SMART 2.0+)

- [ ] **JWT Creation**
  - `iss` - Client ID
  - `sub` - Client ID
  - `aud` - Token endpoint URL
  - `jti` - Unique token identifier
  - `exp` - Expiration time
- [ ] **Key Management**
  - RSA or EC key pairs
  - Key rotation support
  - JWKS endpoint for public keys
- [ ] **Signature Validation**
  - Algorithm verification (RS256, ES256)
  - Key retrieval and caching
  - Signature verification

### Symmetric Authentication (SMART 1.0+)

- [ ] **Client Secret Methods**
  - HTTP Basic authentication
  - POST body parameters
  - Client secret validation
- [ ] **Security Considerations**
  - Secure secret storage
  - Secret rotation capabilities
  - Rate limiting protection

---

## 🎫 Scopes & Permissions

### Legacy SMART v1 Scope Syntax (SMART 1.0)

- [ ] **Backward Compatibility**
  - `patient/*.read` - Read access patterns
  - `user/*.read` - User read access
  - `patient/*.write` - Write access patterns
  - Migration path from v1 to v2

### SMART v2 Scope Syntax (SMART 2.0+)

- [ ] **Resource Scopes**
  - `patient/[Resource].[cruds]` - Patient-specific access
  - `user/[Resource].[cruds]` - User-accessible resources
  - `system/[Resource].[cruds]` - System-wide access
- [ ] **Interaction Types**
  - `c` - Create (POST)
  - `r` - Read (GET)
  - `u` - Update (PUT)
  - `d` - Delete (DELETE)
  - `s` - Search (GET with parameters)

### Launch Context Scopes (Enhanced in SMART 2.1/2.2)

#### Basic Context (SMART 1.0+)
- [ ] **Patient Context**
  - `launch/patient` - Patient context required
  - Patient ID in token response
- [ ] **Encounter Context**
  - `launch/encounter` - Encounter context required
  - Encounter ID in token response
- [ ] **Other Contexts**
  - `launch` - General launch context
  - Custom context parameters

#### Enhanced fhirContext (SMART 2.1+)
- [ ] **SMART 2.1 Enhancements**
  - More detailed context when launching apps
  - PractitionerRole support for fhirUser
- [ ] **SMART 2.2 Enhancements**
  - Canonical reference support
  - Identifier reference support

### Special Scopes

- [ ] **Offline Access (SMART 1.0+)**
  - `offline_access` - Refresh token issuance
  - Long-term access without user presence
- [ ] **OpenID Connect (SMART 1.0+)**
  - `openid` - Identity token issuance
  - `profile` - User profile information
  - `fhirUser` - FHIR User resource reference

---

## 🔍 Token Introspection (SMART 2.0+)

### RFC 7662 Implementation

- [ ] **Introspection Endpoint**
  - Token validation service
  - Metadata exposure
  - Client authentication required
- [ ] **Response Format**
  - `active` - Token validity status
  - `scope` - Granted scopes
  - `client_id` - Client identifier
  - `username` - User identifier (if applicable)
  - `exp` - Expiration timestamp
- [ ] **SMART Extensions**
  - `patient` - Patient context
  - `encounter` - Encounter context
  - `fhirUser` - User FHIR resource

---

## 🎨 User-Access Brands

### Basic Branding (SMART 2.1+)

- [ ] **Brand Information**
  - `name` - Provider/organization name
  - `logo` - Logo URL with specifications
  - `description` - Provider description
  - `url` - Provider website
- [ ] **Patient-Facing UX**
  - "Connect to my records" interface
  - Provider selection with branding

### Enhanced Branding (SMART 2.2+)

- [ ] **Endpoint-Level Branding**
  - Brand information surfacing for endpoints
  - Endpoint-specific branding support
- [ ] **Organization-Level Branding**
  - Organization-level branding metadata
  - Enhanced brand discovery mechanisms
  - Organization-specific visual consistency

---

## 💾 App State Persistence (SMART 2.1+ Experimental)

### State Management API

- [ ] **Storage Endpoints**
  - User-specific state storage
  - Patient-specific configurations
  - Application preferences
  - Cross-session persistence
- [ ] **Data Format**
  - JSON-based storage
  - Version control
  - Conflict resolution
  - State synchronization
- [ ] **Access Control**
  - Scope-based access to state
  - User isolation
  - Patient data separation
  - App-specific namespacing

### Task Profiles (SMART 2.1+)

- [ ] **App Launch Task Profiles**
  - Task profiles for describing app launch
  - Launch workflow documentation
  - Integration with FHIR workflow patterns

---

## 🧪 Testing & Compliance

### SMART App Launch Test Suite

- [ ] **Inferno Testing**
  - Official SMART test suite
  - Automated compliance verification
  - Certification readiness
- [ ] **Test Categories**
  - EHR launch flows
  - Standalone launch flows
  - Backend services
  - Token introspection
  - Error handling

### Custom Test Implementation

- [ ] **Unit Tests**
  - OAuth flow components
  - Scope validation
  - Token management
- [ ] **Integration Tests**
  - End-to-end flows
  - FHIR server integration
  - Client application testing
- [ ] **Security Tests**
  - Penetration testing
  - Vulnerability assessment
  - OWASP compliance

---

## 📋 Implementation Priority Matrix by Version

### SMART 1.0 Foundation (High Priority - Core Functionality)

1. **Discovery & Configuration** - Foundation for all other features
   - .well-known/smart-configuration endpoint
   - Basic capability advertisement
2. **EHR Launch Flow** - Primary use case for most implementations
   - Launch parameters (iss, launch)
   - Basic authorization request/response
3. **Basic Scopes (v1 syntax)** - Essential for data access
   - `patient/*.read`, `user/*.read` patterns
4. **Token Management** - Core OAuth functionality
   - Authorization code exchange
   - Basic token response

### SMART 2.0 Enhancements (Medium Priority - Extended Features)

1. **PKCE Implementation** - **Required** security enhancement
   - Code challenge/verifier support
2. **New Scope Syntax (v2)** - Modern permission model
   - `patient/[Resource].[cruds]` patterns
3. **Backend Services** - System-to-system integration
   - Client credentials grant
   - JWT-based authentication
4. **Token Introspection** - Resource server support
   - RFC 7662 implementation
5. **Asymmetric Authentication** - Preferred security method
   - JWT-based client authentication

### SMART 2.1 Context & State (Medium-Low Priority)

1. **Enhanced fhirContext** - Improved launch context
   - More detailed context information
   - PractitionerRole support
2. **App State Persistence** - Application convenience (Experimental)
   - User/patient-specific state storage
3. **Task Profiles** - Workflow integration
   - App launch workflow documentation
4. **Absolute URL Requirements** - Configuration compliance

### SMART 2.2 Branding (Lower Priority - UX Enhancement)

1. **User-Access Brands** - UX enhancement
   - Endpoint and organization branding
2. **Enhanced fhirContext (2.2)** - Advanced context support
   - Canonical and identifier references

### Legacy Support (As Needed)

1. **SMART v1 Scope Support** - Backward compatibility
   - Migration path from v1 to v2
2. **OpenID Connect Integration** - Identity features
   - Identity token support

---

## ✅ Implementation Roadmap by Release Stage

### Alpha Release Testing Strategy
**Focus: Unit Tests for Core Components**

#### Version 0.0.3-alpha Targets (SMART 1.0 Foundation)
- [ ] Discovery endpoint basic implementation
- [ ] OAuth 2.0 framework setup
- [ ] Basic EHR launch flow
- [ ] Unit tests for OAuth components

#### Version 0.0.4-alpha Targets (Enhanced Foundation)
- [ ] Standalone launch implementation
- [ ] Patient selection interface
- [ ] Basic scope validation
- [ ] Unit tests for scope parsing

### Beta Release Testing Strategy
**Focus: Integration & End-to-End Testing**

#### Version 0.0.5-beta Targets (SMART 2.0 Core)
- [ ] PKCE implementation (**Required**)
- [ ] New scope syntax support
- [ ] Token introspection
- [ ] Integration tests for complete flows
- [ ] Playwright tests for UI components

#### Version 0.0.6-beta Targets (Backend Services)
- [ ] Backend services authorization
- [ ] JWT-based authentication
- [ ] System-level scopes
- [ ] Integration tests for backend flows

### Production Release Testing Strategy
**Focus: Security & Penetration Testing**

#### Version 0.0.7-production Targets (Security Hardening)
- [ ] Asymmetric authentication
- [ ] Security audit compliance
- [ ] Performance optimization
- [ ] Penetration testing
- [ ] OWASP compliance verification

#### Version 0.0.8-production Targets (Advanced Features)
- [ ] Enhanced branding support
- [ ] App state persistence
- [ ] Full SMART 2.2 compliance
- [ ] Certification readiness

---

This checklist serves as both a reference for the SMART 2.2.0 specification and a tracking mechanism for our implementation progress. Each item should be verified against the official specification and tested thoroughly before marking as complete.
