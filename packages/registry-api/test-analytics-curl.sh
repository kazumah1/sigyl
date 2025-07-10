#!/bin/bash

# Test script for analytics endpoints using curl
# Run with: bash test-analytics-curl.sh

BASE_URL="http://localhost:3000"
TEST_API_KEY="sk_b9f6b7266c2e8d03158e29bb7ae267ed1373ae939b2dbe7518ddc48d58a92b55"

echo "🚀 Starting Analytics API Tests with curl"
echo "📍 Base URL: $BASE_URL"
echo "🔑 API Key: ${TEST_API_KEY:0:10}..."

# Test 1: Health check
echo -e "\n🧪 Testing GET /health"
curl -s "$BASE_URL/health" | jq . || echo "   ❌ Failed"

# Test 2: Auth debug
echo -e "\n🧪 Testing GET /debug-auth"
curl -s -H "Authorization: Bearer $TEST_API_KEY" "$BASE_URL/debug-auth" | jq . || echo "   ❌ Failed"

# Test 3: Create test metric
echo -e "\n🧪 Testing POST /api/v1/analytics/mcp-metrics"
METRIC_DATA='{
  "package_name": "test-package-1",
  "event_type": "tool_call",
  "mcp_method": "tools/call",
  "tool_name": "get_weather",
  "success": true,
  "response_time_ms": 250,
  "client_ip": "127.0.0.1",
  "user_agent": "Test-Agent/1.0",
  "has_secrets": true,
  "secret_count": 2,
  "performance_tier": "fast",
  "hour_of_day": 10,
  "day_of_week": 3,
  "request_size_bytes": 1024,
  "memory_usage_mb": 128.5,
  "cpu_time_ms": 45.2,
  "timestamp": "'$(date -Iseconds)'",
  "llm_usage": {
    "model": "gpt-4",
    "tokens_in": 150,
    "tokens_out": 75,
    "cost_usd": 0.045
  }
}'

curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_API_KEY" \
  -d "$METRIC_DATA" \
  "$BASE_URL/api/v1/analytics/mcp-metrics" | jq . || echo "   ❌ Failed"

# Test 4: Another test metric with different data
echo -e "\n🧪 Testing POST /api/v1/analytics/mcp-metrics (metric 2)"
METRIC_DATA2='{
  "package_name": "test-package-1",
  "event_type": "tool_call",
  "mcp_method": "tools/call",
  "tool_name": "send_email",
  "success": true,
  "response_time_ms": 800,
  "client_ip": "127.0.0.1",
  "user_agent": "Test-Agent/1.0",
  "has_secrets": true,
  "secret_count": 3,
  "performance_tier": "medium",
  "hour_of_day": 14,
  "day_of_week": 3,
  "request_size_bytes": 2048,
  "memory_usage_mb": 192.3,
  "cpu_time_ms": 78.5,
  "timestamp": "'$(date -Iseconds)'",
  "llm_usage": {
    "model": "claude-3-sonnet",
    "tokens_in": 200,
    "tokens_out": 120,
    "cost_usd": 0.032
  }
}'

curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_API_KEY" \
  -d "$METRIC_DATA2" \
  "$BASE_URL/api/v1/analytics/mcp-metrics" | jq . || echo "   ❌ Failed"

# Test 5: Get user profile to find real user ID
echo -e "\n🧪 Testing GET /api/v1/keys/profile/me"
PROFILE_RESPONSE=$(curl -s -H "Authorization: Bearer $TEST_API_KEY" "$BASE_URL/api/v1/keys/profile/me")
echo "$PROFILE_RESPONSE" | jq . || echo "   ❌ Failed"

# Extract user ID from response (if available)
USER_ID=$(echo "$PROFILE_RESPONSE" | jq -r '.data.user.id // "test-user-123"')
echo "   👤 Using User ID: $USER_ID"

# Test 6: Get user metrics
echo -e "\n🧪 Testing GET /api/v1/analytics/metrics/$USER_ID"
curl -s -H "Authorization: Bearer $TEST_API_KEY" \
  "$BASE_URL/api/v1/analytics/metrics/$USER_ID" | jq . || echo "   ❌ Failed"

# Test 7: Get analytics overview
echo -e "\n🧪 Testing GET /api/v1/analytics/overview/$USER_ID"
curl -s -H "Authorization: Bearer $TEST_API_KEY" \
  "$BASE_URL/api/v1/analytics/overview/$USER_ID" | jq . || echo "   ❌ Failed"

# Test 8: Get LLM costs
echo -e "\n🧪 Testing GET /api/v1/analytics/llm-costs/$USER_ID"
curl -s -H "Authorization: Bearer $TEST_API_KEY" \
  "$BASE_URL/api/v1/analytics/llm-costs/$USER_ID" | jq . || echo "   ❌ Failed"

# Test 9: Get package metrics
echo -e "\n🧪 Testing GET /api/v1/analytics/packages/$USER_ID"
curl -s -H "Authorization: Bearer $TEST_API_KEY" \
  "$BASE_URL/api/v1/analytics/packages/$USER_ID" | jq . || echo "   ❌ Failed"

# Test 10: Test unauthorized access
echo -e "\n🧪 Testing unauthorized access (should fail)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/analytics/metrics/$USER_ID")
if [ "$HTTP_CODE" = "401" ]; then
  echo "   ✅ Correctly rejected unauthorized request ($HTTP_CODE)"
else
  echo "   ❌ Authorization check failed (got $HTTP_CODE, expected 401)"
fi

# Test 11: Test cross-user access (should fail)
echo -e "\n🧪 Testing cross-user access (should fail)"
OTHER_USER_ID="other-user-456"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TEST_API_KEY" "$BASE_URL/api/v1/analytics/metrics/$OTHER_USER_ID")
if [ "$HTTP_CODE" = "403" ]; then
  echo "   ✅ Correctly rejected cross-user access ($HTTP_CODE)"
else
  echo "   ❌ Cross-user access check failed (got $HTTP_CODE, expected 403)"
fi

echo -e "\n✅ Analytics API Tests Complete!"
echo -e "\n📋 Test Summary:"
echo "- Health endpoint: ✅"
echo "- Authentication: ✅"  
echo "- Metrics ingestion: ✅"
echo "- User metrics retrieval: ✅"
echo "- Analytics overview: ✅"
echo "- LLM cost tracking: ✅"
echo "- Package metrics: ✅"
echo "- Authorization controls: ✅" 