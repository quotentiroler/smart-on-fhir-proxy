# SMART App Launch 2.2.0 Implementation Checklist

## Overview

This document provides a detailed breakdown of the HL7 SMART App Launch 2.2.0 specification requirements and our implementation status.

**Specification URL**: http://hl7.org/fhir/smart-app-launch/
**Version**: 2.2.0 (STU 2.2) - Published 2024-04-30
**FHIR Version**: Compatible with FHIR DSTU2+, artifacts for R4/R4B

**Key Features in 2.2.0:**
- Surface branding information for endpoints and organizations
- Enhanced fhirContext to support canonical and identifier references
- Absolute URL requirement for smart-configuration links
- Experimental support for SMART App State Persistence
- Task profiles for describing app launch

---

## 🔍 Discovery & Configuration

### .well-known/smart-configuration Endpoint

- [ ] **Required Fields**
  - `authorization_endpoint` - OAuth 2.0 authorization endpoint
  - `token_endpoint` - OAuth 2.0 token endpoint
  - `capabilities` - Array of supported capabilities
- [ ] **Optional Fields**
  - `revocation_endpoint` - Token revocation endpoint
  - `introspection_endpoint` - Token introspection endpoint
  - `management_endpoint` - App management endpoint
  - `registration_endpoint` - Dynamic client registration
- [ ] **SMART-Specific Fields**
  - `scopes_supported` - List of supported scopes
  - `response_types_supported` - Supported OAuth response types
  - `code_challenge_methods_supported` - PKCE methods
  - `grant_types_supported` - Supported grant types

### Capability Advertisement

- [ ] **App Launch Capabilities**
  - `launch-ehr` - EHR launch support
  - `launch-standalone` - Standalone launch support
  - `client-public` - Public client support
  - `client-confidential-symmetric` - Symmetric client authentication
  - `client-confidential-asymmetric` - Asymmetric client authentication
- [ ] **Context Capabilities**
  - `context-ehr-patient` - Patient context in EHR launch
  - `context-ehr-encounter` - Encounter context in EHR launch
  - `context-standalone-patient` - Patient selection in standalone
  - `context-standalone-encounter` - Encounter selection in standalone
- [ ] **Permission Capabilities**
  - `permission-offline` - Refresh token support
  - `permission-patient` - Patient-level access
  - `permission-user` - User-level access
  - `permission-v2` - SMARTv2 scope syntax

---

## 🚀 Authorization Patterns

### 1. SMART App Launch (User-Facing Apps)

#### EHR Launch Flow

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
- [ ] **Authorization Response**
  - Authorization code return
  - State validation
  - Error handling

#### Standalone Launch Flow

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

#### Token Exchange

- [ ] **Authorization Code Exchange**
  - Code for token exchange
  - Client authentication (if confidential)
  - PKCE verification (if used)
- [ ] **Token Response**
  - `access_token` - Bearer token for API access
  - `token_type` - Always "Bearer"
  - `expires_in` - Token lifetime
  - `scope` - Granted permissions
  - `refresh_token` - For offline access (optional)
  - `patient` - Patient context (if applicable)
  - `encounter` - Encounter context (if applicable)

### 2. SMART Backend Services (System-to-System)

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

### Asymmetric Authentication (Preferred)

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

### Symmetric Authentication

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

### SMART v2 Scope Syntax

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

### Launch Context Scopes (Enhanced in 2.2.0)

- [ ] **Patient Context**
  - `launch/patient` - Patient context required
  - Patient ID in token response
- [ ] **Encounter Context**
  - `launch/encounter` - Encounter context required
  - Encounter ID in token response
- [ ] **Enhanced fhirContext (New in 2.2.0)**
  - Canonical reference support
  - Identifier reference support
  - More detailed context when launching apps
  - PractitionerRole support for fhirUser
- [ ] **Other Contexts**
  - `launch` - General launch context
  - Custom context parameters

### Special Scopes

- [ ] **Offline Access**
  - `offline_access` - Refresh token issuance
  - Long-term access without user presence
- [ ] **OpenID Connect**
  - `openid` - Identity token issuance
  - `profile` - User profile information
  - `fhirUser` - FHIR User resource reference

### Legacy v1 Scope Support

- [ ] **Backward Compatibility**
  - `patient/*.read` - Read access patterns
  - `user/*.read` - User read access
  - `patient/*.write` - Write access patterns
  - Migration path from v1 to v2

---

## 🔍 Token Introspection

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

## 🎨 User-Access Brands (Enhanced in 2.2.0)

### Brand Discovery
- [ ] **Endpoint Implementation**
  - Brand information surfacing for endpoints
  - Organization-level branding metadata  
  - Enhanced brand discovery mechanisms
- [ ] **Brand Information (Enhanced in 2.2.0)**
  - `name` - Provider/organization name
  - `logo` - Logo URL with specifications
  - `description` - Provider description
  - `url` - Provider website
  - Organization-specific branding support
  - Endpoint-specific branding support
- [ ] **Patient-Facing UX**
  - "Connect to my records" interface
  - Provider selection with enhanced branding
  - Organization-level visual consistency

---

## 💾 App State Persistence (Experimental in 2.2.0)

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

### Task Profiles (New in 2.2.0)
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

## 📋 Implementation Priority Matrix

### High Priority (Core Functionality)

1. **Discovery & Configuration** - Foundation for all other features
2. **EHR Launch Flow** - Primary use case for most implementations
3. **Basic Scopes (patient/*.read)** - Essential for data access
4. **Token Management** - Core OAuth functionality

### Medium Priority (Extended Features)

1. **Standalone Launch** - Important for patient-facing apps
2. **Backend Services** - System-to-system integration
3. **Advanced Scopes (v2 syntax)** - Modern permission model
4. **Token Introspection** - Resource server support

### Lower Priority (Advanced Features)

1. **User-Access Brands** - UX enhancement
2. **App State Persistence** - Application convenience
3. **Legacy v1 Support** - Backward compatibility
4. **OpenID Connect Integration** - Identity features

---

## ✅ Completion Tracking

### Version 0.0.2 Targets

- [X] Project foundation
- [ ] Discovery endpoint basic implementation
- [ ] OAuth 2.0 framework setup

### Version 0.0.3 Targets

- [ ] EHR launch flow complete
- [ ] Basic token management
- [ ] Patient context support

### Version 0.0.4 Targets

- [ ] Standalone launch implementation
- [ ] Patient selection interface
- [ ] Public client support

### Continuing through v0.0.8...

- [ ] All SMART 2.2.0 features implemented
- [ ] Full test coverage achieved
- [ ] Certification ready

---

This checklist serves as both a reference for the SMART 2.2.0 specification and a tracking mechanism for our implementation progress. Each item should be verified against the official specification and tested thoroughly before marking as complete.
