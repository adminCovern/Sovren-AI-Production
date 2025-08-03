#!/bin/bash

# SOVREN AI PRODUCTION TESTING & VALIDATION SUITE
# Comprehensive testing for production deployment

set -e

# Configuration
BASE_URL="https://sovren.ai"
API_URL="$BASE_URL/api"
TEST_EMAIL="test@sovren.ai"
TEST_PASSWORD="TestPassword123!"
LOAD_TEST_USERS=100
LOAD_TEST_DURATION=300 # 5 minutes

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() { echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"; }
info() { echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO: $1${NC}"; }

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Test function wrapper
run_test() {
    local test_name="$1"
    local test_function="$2"
    
    info "Running test: $test_name"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if $test_function; then
        log "✅ PASSED: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        error "❌ FAILED: $test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    echo ""
}

# Health check test
test_health_check() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
    [[ "$response" == "200" ]]
}

# SSL certificate test
test_ssl_certificate() {
    local ssl_info=$(echo | openssl s_client -servername sovren.ai -connect sovren.ai:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
    [[ -n "$ssl_info" ]]
}

# API authentication test
test_api_authentication() {
    # Test without auth - should fail
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/tts/synthesize")
    [[ "$response" == "401" ]]
}

# Registration test
test_user_registration() {
    local response=$(curl -s -X POST "$API_URL/onboarding/register" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "'$TEST_EMAIL'",
            "name": "Test User",
            "company": "Test Company",
            "tier": "SMB",
            "industry": "technology",
            "companySize": "small",
            "geography": "north_america",
            "preferences": {
                "theme": "dark",
                "notifications": true,
                "autoExecutiveSummoning": true,
                "voiceEnabled": true
            }
        }' \
        -w "%{http_code}")
    
    local http_code=$(echo "$response" | tail -n1)
    [[ "$http_code" == "200" || "$http_code" == "409" ]] # 409 if user exists
}

# Login test
test_user_login() {
    local response=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "'$TEST_EMAIL'",
            "password": "'$TEST_PASSWORD'"
        }')
    
    echo "$response" | grep -q '"success":true'
}

# TTS synthesis test
test_tts_synthesis() {
    # First login to get token
    local login_response=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email": "'$TEST_EMAIL'", "password": "'$TEST_PASSWORD'"}')
    
    local token=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [[ -n "$token" ]]; then
        local tts_response=$(curl -s -X POST "$API_URL/tts/synthesize" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -d '{
                "text": "Hello, this is a test of the SOVREN AI voice synthesis system.",
                "voiceId": "sovren-ai-neural",
                "priority": "high",
                "format": "wav"
            }')
        
        echo "$tts_response" | grep -q '"success":true'
    else
        return 1
    fi
}

# Database connectivity test
test_database_connectivity() {
    # Test through API health endpoint that checks DB
    local response=$(curl -s "$API_URL/health/database")
    echo "$response" | grep -q '"connected":true'
}

# Performance test - response times
test_response_times() {
    local start_time=$(date +%s%N)
    curl -s "$BASE_URL" > /dev/null
    local end_time=$(date +%s%N)
    
    local response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    # Response time should be under 2 seconds (2000ms)
    [[ $response_time -lt 2000 ]]
}

# Security headers test
test_security_headers() {
    local headers=$(curl -s -I "$BASE_URL")
    
    echo "$headers" | grep -q "Strict-Transport-Security" && \
    echo "$headers" | grep -q "X-Frame-Options" && \
    echo "$headers" | grep -q "X-Content-Type-Options" && \
    echo "$headers" | grep -q "Content-Security-Policy"
}

# Rate limiting test
test_rate_limiting() {
    local success_count=0
    local rate_limited=false
    
    # Make rapid requests to trigger rate limiting
    for i in {1..20}; do
        local response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/auth/login" \
            -X POST -H "Content-Type: application/json" \
            -d '{"email":"test@test.com","password":"test"}')
        
        if [[ "$response" == "429" ]]; then
            rate_limited=true
            break
        fi
        
        sleep 0.1
    done
    
    $rate_limited
}

# Load test with Apache Bench
test_load_performance() {
    if command -v ab &> /dev/null; then
        local ab_output=$(ab -n 100 -c 10 "$BASE_URL/" 2>/dev/null)
        local requests_per_second=$(echo "$ab_output" | grep "Requests per second" | awk '{print $4}')
        
        # Should handle at least 10 requests per second
        [[ $(echo "$requests_per_second > 10" | bc -l) -eq 1 ]]
    else
        warn "Apache Bench (ab) not installed, skipping load test"
        return 0
    fi
}

# Memory usage test
test_memory_usage() {
    local memory_usage=$(pm2 show sovren-ai-production | grep "memory usage" | awk '{print $4}' | sed 's/M//')
    
    # Memory usage should be under 1GB (1000MB)
    [[ $(echo "$memory_usage < 1000" | bc -l) -eq 1 ]]
}

# CPU usage test
test_cpu_usage() {
    local cpu_usage=$(pm2 show sovren-ai-production | grep "cpu usage" | awk '{print $4}' | sed 's/%//')
    
    # CPU usage should be under 80%
    [[ $(echo "$cpu_usage < 80" | bc -l) -eq 1 ]]
}

# Disk space test
test_disk_space() {
    local disk_usage=$(df /var/www/sovren-ai | tail -1 | awk '{print $5}' | sed 's/%//')
    
    # Disk usage should be under 90%
    [[ $disk_usage -lt 90 ]]
}

# Log file test
test_log_files() {
    [[ -f "/var/log/sovren-ai/combined.log" ]] && \
    [[ -f "/var/log/sovren-ai/error.log" ]] && \
    [[ -f "/var/log/nginx/sovren-access.log" ]]
}

# Backup system test
test_backup_system() {
    if [[ -f "/usr/local/bin/sovren-backup.sh" ]]; then
        # Test backup script exists and is executable
        [[ -x "/usr/local/bin/sovren-backup.sh" ]]
    else
        return 1
    fi
}

# Shadow Board initialization test
test_shadow_board_initialization() {
    # Test through registration API which initializes Shadow Board
    local response=$(curl -s -X POST "$API_URL/onboarding/register" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "shadowboard-test@sovren.ai",
            "name": "Shadow Board Test",
            "company": "Test Company",
            "tier": "SMB",
            "industry": "technology",
            "companySize": "small",
            "geography": "north_america",
            "preferences": {"theme": "dark", "notifications": true, "autoExecutiveSummoning": true, "voiceEnabled": true}
        }')
    
    echo "$response" | grep -q '"shadowBoard"'
}

# Main test execution
main() {
    log "🚀 Starting SOVREN AI Production Test Suite"
    log "Target: $BASE_URL"
    echo ""
    
    # Basic connectivity tests
    run_test "Health Check" test_health_check
    run_test "SSL Certificate" test_ssl_certificate
    run_test "Security Headers" test_security_headers
    
    # Authentication tests
    run_test "API Authentication" test_api_authentication
    run_test "User Registration" test_user_registration
    run_test "User Login" test_user_login
    
    # Core functionality tests
    run_test "TTS Synthesis" test_tts_synthesis
    run_test "Database Connectivity" test_database_connectivity
    run_test "Shadow Board Initialization" test_shadow_board_initialization
    
    # Performance tests
    run_test "Response Times" test_response_times
    run_test "Load Performance" test_load_performance
    run_test "Memory Usage" test_memory_usage
    run_test "CPU Usage" test_cpu_usage
    run_test "Disk Space" test_disk_space
    
    # Security tests
    run_test "Rate Limiting" test_rate_limiting
    
    # System tests
    run_test "Log Files" test_log_files
    run_test "Backup System" test_backup_system
    
    # Results summary
    echo ""
    log "🏁 Test Suite Complete"
    log "Tests Passed: $TESTS_PASSED"
    error "Tests Failed: $TESTS_FAILED"
    log "Total Tests: $TESTS_TOTAL"
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        log "🎉 ALL TESTS PASSED - PRODUCTION READY!"
        exit 0
    else
        error "❌ SOME TESTS FAILED - REVIEW REQUIRED"
        exit 1
    fi
}

# Run main function
main "$@"
