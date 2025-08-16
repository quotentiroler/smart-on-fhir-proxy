# GitHub Actions for SMART-on-FHIR Proxy Testing

This directory contains reusable GitHub Actions for comprehensive testing of the SMART-on-FHIR Proxy application.

## Actions Overview

### 1. `setup-bun-version/`
Checkout code, setup Node.js and Bun with caching, and prepare version management.

**Inputs:**
- `node-version`: Node.js version to setup (default: '22')
- `bun-version`: Bun version to setup (default: '1.2.19')
- `fetch-depth`: Checkout fetch depth (default: '0')
- `checkout`: Whether to checkout code (default: 'true')
- `token`: GitHub token for checkout
- `ref`: Branch or ref to checkout

### 2. `setup-node-ai/`
Setup Node.js with caching and install AI dependencies (OpenAI + Octokit).

**Inputs:**
- `node-version`: Node.js version to setup (default: '22')
- `fetch-depth`: Checkout fetch depth (default: '0')
- `checkout`: Whether to checkout code (default: 'true')

### 3. `setup-python-ai/`
Setup Python with caching and install AI dependencies for error fixing.

**Inputs:**
- `python-version`: Python version to setup (default: '3.11')
- `cache-dependency-path`: Path to dependency file for cache key (default: 'scripts/requirements.txt')

### 4. `cache-openapi-generator/`
Cache OpenAPI Generator CLI tools and dependencies for faster builds.

**Inputs:**
- `cache-key-suffix`: Additional suffix for cache key to allow multiple caches

### 5. `setup-docker-inferno/`
Sets up Docker environment and prepares Inferno ONC Program Edition testing infrastructure.

**Inputs:**
- `test_stage`: Testing stage (alpha, beta, production)
- `fhir_server_url`: FHIR server URL for testing
- `keycloak_url`: Keycloak URL for OAuth testing
- `inferno_version`: Inferno Docker image version (default: latest)

**Outputs:**
- `inferno_container_id`: Container ID of started Inferno instance
- `test_config_path`: Path to generated test configuration

### 6. `run-inferno-tests/`
Executes Inferno ONC Program Edition tests and generates compliance reports.

**Inputs:**
- `test_stage`: Testing stage (alpha, beta, production)
- `inferno_container_id`: Container ID of running Inferno instance
- `test_config_path`: Path to Inferno test configuration
- `fhir_server_url`: FHIR server URL being tested
- `test_timeout`: Maximum test execution time (default: 1800s)

**Outputs:**
- `test_session_id`: ID of created test session
- `test_results_path`: Path to test results directory
- `compliance_status`: Overall compliance status (passed/failed)

### 7. `discord-notify/`
Send rich Discord webhook notifications for releases and deployments.

**Inputs:**
- `webhook-url`: Discord webhook URL
- `notification-type`: Type of notification (release, deployment, error, success)
- `title`: Notification title
- Plus many optional inputs for customization

### 8. `comprehensive-testing/` (Legacy)
Runs complete test suite: unit tests, integration tests, and ONC Inferno tests.

**Inputs:**
- `test_stage`: Testing stage (alpha, beta, production)
- `deployment_target`: Deployment location (local, fly.io, vps)
- `fhir_server_url`: FHIR server URL for testing
- `keycloak_url`: Keycloak URL for OAuth testing
- `app_version`: Application version being tested
- `skip_unit_tests`: Skip unit tests for deployed environments
- `skip_inferno_tests`: Skip Inferno ONC tests

**Outputs:**
- `unit_test_status`: Unit test results (passed/failed/skipped)
- `integration_test_status`: Integration test results (passed/failed)
- `inferno_test_status`: Inferno test results (passed/failed/skipped)
- `overall_status`: Overall test status (passed/failed)
- `test_reports_path`: Path to all test reports

## Usage Example

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run comprehensive tests
        uses: ./.github/actions/comprehensive-testing
        with:
          test_stage: "beta"
          deployment_target: "fly.io"
          fhir_server_url: "https://my-app.fly.dev"
          keycloak_url: "https://auth.fly.dev"
          app_version: "1.2.3"
```

## Test Stages

- **Alpha**: Basic compliance testing with unit and integration tests
- **Beta**: US Core profile testing with extended FHIR compliance
- **Production**: Full ONC certification testing with all required sequences

## Deployment Targets

- **Local**: Tests run in GitHub Actions with local Docker services
- **Fly.io**: Tests run against deployed application on Fly.io
- **VPS**: Tests run against deployed application on your VPS

## Test Reports

All test results are stored in structured directories:
```
testing/
├── alpha/reports/
├── beta/reports/
├── production/reports/
└── summary/
```

Each stage generates comprehensive reports including:
- Unit test coverage
- Integration test results
- FHIR compliance reports
- Inferno ONC test results
- Overall compliance status

## Performance Optimizations

### Caching Strategy
- **Bun Dependencies**: All `node_modules` and Bun install cache are cached across workflow runs
- **OpenAPI Generator**: The `@openapitools/openapi-generator-cli` tool is cached to prevent network timeout issues
- **Python Dependencies**: AI dependencies are cached for faster error fixing workflows
- **Docker Layers**: Multi-stage builds with layer caching for container builds

### Network Reliability
- **OpenAPI Generator Caching**: Prevents "ENOTFOUND registry.npmjs.org" and similar network errors
- **Dependency Pre-installation**: Tools are pre-installed during caching to ensure availability
- **Retry Logic**: AI-powered build retry system handles transient failures automatically

### Build Speed Improvements
- **Parallel Builds**: Frontend and backend builds run in parallel where possible
- **Incremental Generation**: OpenAPI client generation only updates when backend changes
- **Smart Invalidation**: Cache keys include content hashes for precise invalidation
