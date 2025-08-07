# Alpha Deployment Health Check Fixes

## Problem Summary

The alpha deployment pipeline was getting stuck during health checks on Fly.io with the error:
```
> Waiting for 5683944c0464e8 [app] to become healthy: 0/1
Error: The operation was canceled.
```

## Root Cause Analysis

1. **Health endpoint blocking on external services**: The `/health` endpoint required all configured FHIR servers to be accessible, causing 503 responses when external services were slow/unavailable.

2. **No timeout on external API calls**: FHIR server metadata requests could hang indefinitely if the external server was unreachable.

3. **Aggressive timeout settings**: Fly.io health check had only 10s grace period and 5s timeout, insufficient for container startup.

## Solutions Implemented

### 1. Resilient Health Check Endpoints

**Before**: Single `/health` endpoint that failed if external FHIR servers were down
```typescript
// Old: Returns 503 if no FHIR servers are healthy
if (healthyServers.length === 0) {
  set.status = 503
  return { status: 'unhealthy', error: 'No healthy FHIR servers available' }
}
```

**After**: Separated into basic and detailed health checks
```typescript
// New: Basic health always returns 200 if app is running
.get('/health', async () => {
  return {
    status: 'healthy' as const,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: { used: ..., total: ... }
  }
})

// Detailed health still checks external services
.get('/health/detailed', async ({ set }) => {
  // Comprehensive checks including FHIR servers
})
```

### 2. Added Timeouts to External API Calls

**Before**: No timeout, could hang indefinitely
```typescript
const response = await fetch(metadataUrl, {
  headers: { 'Accept': 'application/fhir+json, application/json' }
})
```

**After**: 10-second timeout with AbortController
```typescript
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 10000)

const response = await fetch(metadataUrl, {
  headers: { 'Accept': 'application/fhir+json, application/json' },
  signal: controller.signal
})

clearTimeout(timeoutId)
```

### 3. Improved Fly.io Configuration

**Before**: Aggressive timeouts
```toml
[[services.http_checks]]
  interval = "10s"
  timeout = "5s"
  grace_period = "10s"
  method = "GET"
  path = "/health"
```

**After**: More forgiving timeouts
```toml
[[services.http_checks]]
  interval = "15s"
  timeout = "10s"
  grace_period = "60s"
  method = "GET"
  path = "/health"
```

### 4. Enhanced Deployment and Testing Timeouts

- Increased deployment wait timeout from 5 minutes to 10 minutes
- Added connection timeouts to all curl commands (10s connect, 15s max)
- Increased testing readiness wait from 30 to 60 attempts

## Testing the Fixes

### Local Testing

1. **Start the backend with a slow FHIR server**:
   ```bash
   cd backend
   BASE_URL=http://localhost:8445 PORT=8445 FHIR_SERVER_BASE=https://httpbin.org/delay/10 bun run dev
   ```

2. **Test basic health endpoint** (should respond quickly with 200):
   ```bash
   curl -w "Status: %{http_code}\nTime: %{time_total}s\n" http://localhost:8445/health
   ```

3. **Test detailed health endpoint** (may return 503 but won't hang):
   ```bash
   curl -w "Status: %{http_code}\nTime: %{time_total}s\n" http://localhost:8445/health/detailed
   ```

### Alpha Deployment Testing

Use the provided test script to validate a deployed alpha environment:

```bash
./scripts/test-alpha-deployment.sh
```

Or test specific URLs:
```bash
./scripts/test-alpha-deployment.sh https://proxy-smart-alpha.fly.dev https://proxy-smart-alpha-auth.fly.dev
```

## Expected Behavior After Fixes

1. **Basic health endpoint** (`/health`):
   - Always returns 200 if the application is running
   - Responds in milliseconds
   - Used by Fly.io for deployment health checks

2. **Detailed health endpoint** (`/health/detailed`):
   - Returns 200 if all external services are healthy
   - Returns 503 if external services are down (but app is still running)
   - Used for comprehensive monitoring

3. **Deployment process**:
   - Fly.io health checks should pass within 60 seconds
   - No more infinite hanging on external service calls
   - Proper timeout handling throughout the pipeline

4. **Testing strategy**:
   - Robust connection handling with timeouts
   - Graceful handling of external service unavailability
   - Clear reporting of deployment status

## Verification Checklist

- [ ] Backend compiles without errors (`bun run build`)
- [ ] Backend linting passes (`bun run lint`)
- [ ] Basic health endpoint returns 200 immediately
- [ ] Detailed health endpoint handles timeouts properly
- [ ] Alpha deployment completes without hanging
- [ ] Testing strategy successfully validates deployed apps
- [ ] Connection can be established to deployed Fly.io services

## Files Modified

1. `backend/src/lib/fhir-utils.ts` - Added timeout to FHIR metadata fetching
2. `backend/src/routes/info.ts` - Split health endpoints, removed external service dependency from basic health
3. `.github/workflows/deployment-strategy.yml` - Improved timeouts and health check configuration
4. `.github/workflows/testing-strategy.yml` - Enhanced timeout handling in tests
5. `scripts/test-alpha-deployment.sh` - New script for validating deployed alpha instances

The fixes ensure that infrastructure health checks (used by Fly.io) are separated from application-level health monitoring, preventing deployment failures due to external service availability while maintaining comprehensive monitoring capabilities.