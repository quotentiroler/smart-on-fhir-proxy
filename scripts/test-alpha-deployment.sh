#!/bin/bash

# Test script for Alpha deployment health checks
# This script validates that deployed alpha instances are working correctly

set -e

echo "🧪 Testing Alpha Deployment Health Checks"
echo "=========================================="

# Configuration
ALPHA_BACKEND_URL="${1:-https://proxy-smart-alpha.fly.dev}"
ALPHA_KEYCLOAK_URL="${2:-https://proxy-smart-alpha-auth.fly.dev}"
TIMEOUT_CONNECT=10
TIMEOUT_MAX=15

echo "🎯 Target URLs:"
echo "   Backend: $ALPHA_BACKEND_URL"
echo "   Keycloak: $ALPHA_KEYCLOAK_URL"
echo ""

# Function to test endpoint with proper error handling
test_endpoint() {
    local url="$1"
    local name="$2"
    local expected_status="${3:-200}"
    
    echo "🔍 Testing $name..."
    
    if response=$(curl -s -w "HTTPSTATUS:%{http_code}" --connect-timeout $TIMEOUT_CONNECT --max-time $TIMEOUT_MAX "$url" 2>/dev/null); then
        status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
        body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
        
        if [[ "$status" == "$expected_status" ]]; then
            echo "   ✅ $name: HTTP $status (OK)"
            if [[ "$body" == *"healthy"* ]]; then
                echo "   ✅ Response contains 'healthy' status"
            fi
        else
            echo "   ⚠️  $name: HTTP $status (Expected $expected_status)"
            return 1
        fi
    else
        echo "   ❌ $name: Connection failed"
        return 1
    fi
}

# Test basic health check (should always work if app is deployed)
echo "📋 Testing Basic Health Checks"
echo "------------------------------"

if test_endpoint "$ALPHA_BACKEND_URL/health" "Backend Basic Health"; then
    BACKEND_HEALTHY=true
else
    BACKEND_HEALTHY=false
fi

# Test detailed health check (may return 503 if external services are down)
echo ""
echo "📋 Testing Detailed Health Checks"
echo "---------------------------------"

if test_endpoint "$ALPHA_BACKEND_URL/health/detailed" "Backend Detailed Health" "200"; then
    echo "   ✅ All external services healthy"
elif test_endpoint "$ALPHA_BACKEND_URL/health/detailed" "Backend Detailed Health" "503"; then
    echo "   ⚠️  Some external services unavailable (expected for demo/testing)"
else
    echo "   ❌ Unexpected response from detailed health check"
fi

# Test Keycloak availability
echo ""
echo "📋 Testing Keycloak Services"
echo "----------------------------"

if test_endpoint "$ALPHA_KEYCLOAK_URL" "Keycloak Root"; then
    KEYCLOAK_HEALTHY=true
else
    KEYCLOAK_HEALTHY=false
fi

# Test OAuth discovery endpoints
if test_endpoint "$ALPHA_KEYCLOAK_URL/realms/proxy-smart/.well-known/openid_configuration" "OAuth Discovery (proxy-smart realm)"; then
    echo "   ✅ SMART realm properly configured"
elif test_endpoint "$ALPHA_KEYCLOAK_URL/realms/master/.well-known/openid_configuration" "OAuth Discovery (master realm)"; then
    echo "   ⚠️  Master realm accessible, proxy-smart realm may need configuration"
else
    echo "   ❌ OAuth discovery not available"
fi

# Test FHIR proxy endpoints
echo ""
echo "📋 Testing FHIR Proxy Endpoints"
echo "-------------------------------"

FHIR_PROXY_URL="$ALPHA_BACKEND_URL/proxy-smart-backend/hapi-fhir-server/R4"
if test_endpoint "$FHIR_PROXY_URL/metadata" "FHIR Metadata" "200"; then
    echo "   ✅ FHIR proxy working"
else
    echo "   ⚠️  FHIR proxy may require authentication"
fi

# Summary
echo ""
echo "📊 Deployment Test Summary"
echo "=========================="

if [[ "$BACKEND_HEALTHY" == true ]]; then
    echo "✅ Backend deployment: HEALTHY"
else
    echo "❌ Backend deployment: UNHEALTHY"
fi

if [[ "$KEYCLOAK_HEALTHY" == true ]]; then
    echo "✅ Keycloak deployment: HEALTHY"
else
    echo "❌ Keycloak deployment: UNHEALTHY"
fi

echo ""
if [[ "$BACKEND_HEALTHY" == true && "$KEYCLOAK_HEALTHY" == true ]]; then
    echo "🎉 Alpha deployment is working correctly!"
    echo ""
    echo "📍 Available endpoints:"
    echo "   • Application: $ALPHA_BACKEND_URL"
    echo "   • Health Check: $ALPHA_BACKEND_URL/health"
    echo "   • API Docs: $ALPHA_BACKEND_URL/swagger"
    echo "   • FHIR Proxy: $FHIR_PROXY_URL"
    echo "   • Keycloak: $ALPHA_KEYCLOAK_URL"
    echo "   • OAuth Discovery: $ALPHA_KEYCLOAK_URL/realms/proxy-smart/.well-known/openid_configuration"
    exit 0
else
    echo "❌ Alpha deployment has issues that need to be resolved"
    exit 1
fi