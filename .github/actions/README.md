# GitHub Actions for SMART-on-FHIR Proxy Testing

This directory contains reusable GitHub Actions for comprehensive testing of the SMART-on-FHIR Proxy application.

## Actions Overview

### 1. `setup-docker-inferno/`
Sets up Docker environment and prepares Inferno ONC Program Edition testing infrastructure.

**Inputs:**
- `test_stage`: Testing stage (alpha, beta, production)
- `fhir_server_url`: FHIR server URL for testing
- `keycloak_url`: Keycloak URL for OAuth testing
- `inferno_version`: Inferno Docker image version (default: latest)

**Outputs:**
- `inferno_container_id`: Container ID of started Inferno instance
- `test_config_path`: Path to generated test configuration

### 2. `run-inferno-tests/`
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

### 3. `comprehensive-testing/`
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
