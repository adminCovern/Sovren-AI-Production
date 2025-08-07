#!/bin/bash

# SOVREN-AI Production Validation Script
# IMMEDIATE DEPLOYMENT - Complete system validation
# NO PLACEHOLDERS - Full production testing

set -e

echo "🔍 SOVREN-AI Production Validation Starting..."
echo "⚡ Multi-Agent Deployment - Final Validation"
echo "============================================="

# Configuration
BASE_URL="https://sovrenai.app"
LOCAL_URL="http://localhost:3000"
TEST_EMAIL="test@sovrenai.app"
TIMEOUT=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Function to run test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -n "🧪 Testing $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        FAILED_TESTS+=("$test_name")
        return 1
    fi
}

# Function to test HTTP endpoint
test_endpoint() {
    local endpoint="$1"
    local expected_status="$2"
    local url="$LOCAL_URL$endpoint"
    
    local status=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url")
    [ "$status" = "$expected_status" ]
}

# Function to test JSON response
test_json_endpoint() {
    local endpoint="$1"
    local expected_field="$2"
    local url="$LOCAL_URL$endpoint"
    
    local response=$(curl -s --max-time $TIMEOUT "$url")
    echo "$response" | jq -e ".$expected_field" > /dev/null 2>&1
}

echo "🏥 1. Health Check Tests"
echo "========================"

run_test "Basic Health Check" "test_endpoint '/api/health' '200'"
run_test "Health Check JSON Response" "test_json_endpoint '/api/health' 'healthy'"
run_test "Database Health" "test_json_endpoint '/api/health' 'checks.database.healthy'"
run_test "Redis Health" "test_json_endpoint '/api/health' 'checks.redis.healthy'"

echo ""
echo "🔐 2. Authentication Tests"
echo "=========================="

run_test "Auth Login Endpoint" "test_endpoint '/api/auth/login' '400'"
run_test "Auth Validate Endpoint" "test_endpoint '/api/auth/validate' '401'"

echo ""
echo "🎭 3. Shadow Board API Tests"
echo "============================"

run_test "Shadow Board Status" "test_endpoint '/api/shadowboard' '401'"
run_test "Shadow Board Integration" "test_endpoint '/api/shadowboard/integration' '400'"
run_test "Shadow Board Capabilities" "test_endpoint '/api/shadowboard/capabilities' '401'"
run_test "Shadow Board Metrics" "test_endpoint '/api/shadowboard/metrics' '401'"

echo ""
echo "💳 4. Payment System Tests"
echo "=========================="

run_test "Stripe Payment Endpoint" "test_endpoint '/api/payments/stripe' '401'"

echo ""
echo "📞 5. Phone System Tests"
echo "========================"

run_test "Phone System Endpoint" "test_endpoint '/api/phone' '401'"

echo ""
echo "🎤 6. Voice Synthesis Tests"
echo "==========================="

run_test "Voice Synthesis Endpoint" "test_endpoint '/api/voice/synthesize' '401'"
run_test "TTS Synthesis Endpoint" "test_endpoint '/api/tts/synthesize' '401'"

echo ""
echo "👥 7. User Onboarding Tests"
echo "==========================="

run_test "User Registration" "test_endpoint '/api/onboarding/register' '400'"
run_test "Onboarding Complete" "test_endpoint '/api/onboarding/complete' '401'"

echo ""
echo "📊 8. Monitoring Tests"
echo "======================"

# Test Prometheus metrics
if curl -s --max-time $TIMEOUT "http://localhost:9090/-/healthy" > /dev/null 2>&1; then
    run_test "Prometheus Health" "true"
else
    run_test "Prometheus Health" "false"
fi

# Test Grafana
if curl -s --max-time $TIMEOUT "http://localhost:3001/api/health" > /dev/null 2>&1; then
    run_test "Grafana Health" "true"
else
    run_test "Grafana Health" "false"
fi

echo ""
echo "🗄️ 9. Database Tests"
echo "===================="

# Test PostgreSQL connection
if docker exec sovren-postgres pg_isready -U sovren_app -d sovren_ai_production > /dev/null 2>&1; then
    run_test "PostgreSQL Connection" "true"
else
    run_test "PostgreSQL Connection" "false"
fi

# Test Redis connection
if docker exec sovren-redis redis-cli ping | grep -q "PONG"; then
    run_test "Redis Connection" "true"
else
    run_test "Redis Connection" "false"
fi

echo ""
echo "🐳 10. Docker Container Tests"
echo "============================="

# Check if all containers are running
containers=("sovren-app" "postgres" "redis" "nginx" "prometheus" "grafana")
for container in "${containers[@]}"; do
    if docker ps | grep -q "$container"; then
        run_test "$container Container" "true"
    else
        run_test "$container Container" "false"
    fi
done

echo ""
echo "🔒 11. SSL/HTTPS Tests"
echo "======================"

# Test SSL certificate
if [ -f "./docker/ssl/sovrenai.app.crt" ]; then
    run_test "SSL Certificate Exists" "true"
    
    # Validate certificate
    if openssl x509 -in "./docker/ssl/sovrenai.app.crt" -text -noout | grep -q "sovrenai.app"; then
        run_test "SSL Certificate Valid" "true"
    else
        run_test "SSL Certificate Valid" "false"
    fi
else
    run_test "SSL Certificate Exists" "false"
    run_test "SSL Certificate Valid" "false"
fi

echo ""
echo "🌐 12. Load Balancer Tests"
echo "=========================="

# Test NGINX status
if curl -s --max-time $TIMEOUT "http://localhost/health" > /dev/null 2>&1; then
    run_test "NGINX Load Balancer" "true"
else
    run_test "NGINX Load Balancer" "false"
fi

echo ""
echo "📈 13. Performance Tests"
echo "========================"

# Test response times
response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time $TIMEOUT "$LOCAL_URL/api/health")
if (( $(echo "$response_time < 2.0" | bc -l) )); then
    run_test "Response Time < 2s" "true"
else
    run_test "Response Time < 2s" "false"
fi

echo ""
echo "🔍 14. Security Tests"
echo "===================="

# Test security headers
if curl -s -I --max-time $TIMEOUT "$LOCAL_URL" | grep -q "X-Frame-Options"; then
    run_test "Security Headers" "true"
else
    run_test "Security Headers" "false"
fi

echo ""
echo "📋 VALIDATION SUMMARY"
echo "====================="
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    log_success "🎉 ALL TESTS PASSED - PRODUCTION READY!"
    log_success "⚡ SOVREN-AI Shadow Board is fully operational!"
    echo ""
    echo "🚀 Production URLs:"
    echo "==================="
    echo "🌐 Main Application: https://sovrenai.app"
    echo "📊 Monitoring: http://localhost:3001"
    echo "📈 Metrics: http://localhost:9090"
    echo "🔍 Logs: http://localhost:5601"
    echo ""
    echo "🔥 COMPETITIVE ADVANTAGE ACHIEVED!"
    echo "⚡ 2-Hour Production Deployment SUCCESSFUL!"
    exit 0
else
    log_error "❌ $TESTS_FAILED TESTS FAILED"
    echo ""
    echo "Failed Tests:"
    for test in "${FAILED_TESTS[@]}"; do
        echo "  - $test"
    done
    echo ""
    log_warning "⚠️ Production deployment needs attention"
    exit 1
fi
