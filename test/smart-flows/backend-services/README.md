# SMART Backend Services Flow Tests

This directory contains comprehensive tests for the SMART Backend Services authentication flow as specified in the SMART App Launch Framework 2.2.0.

## What's Tested

The `backend-services.test.ts` file implements the complete backend services flow:

### 1. Retrieve .well-known/smart-configuration
- Fetches SMART configuration from the discovery endpoint
- Validates required backend services capabilities
- Checks for supported authentication methods and scopes

### 2. Register Backend Service Client
- Registers a backend service client with asymmetric key authentication
- Generates RSA/ECDSA key pairs for JWT signing
- Validates proper client configuration

### 3. Generate Client Assertion JWT
- Creates properly formatted client assertion JWTs
- Uses private keys for asymmetric authentication
- Validates JWT structure and claims

### 4. Retrieve Access Token
- Exchanges client assertion for access token using client_credentials grant
- Validates token response format and properties
- Checks granted scopes match requested system-level access

### 5. Access FHIR API
- Uses bearer token to access FHIR resources
- Tests system-level permissions for Patient and metadata endpoints
- Validates proper authorization and error handling

## Usage

The tests use the generated client APIs from `../../lib/api-client` and client management utilities from `../../client-registration/client-manager`.

Run the tests:
```bash
npm test -- backend-services
```

## Key Features

- **Asymmetric Authentication**: Tests private_key_jwt authentication method
- **System-level Scopes**: Validates system/*.rs scope access
- **Error Handling**: Tests invalid tokens, expired assertions, and unauthorized requests
- **SMART 2.2.0 Compliance**: Follows the latest SMART specification
- **Integration Testing**: Requires live server connection (no mocking)

## Prerequisites

- Running SMART on FHIR server
- Keycloak authentication server
- Backend services capability enabled
- System-level FHIR resource access configured
