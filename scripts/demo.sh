#!/bin/bash

# Demo script for refund negotiation system
# Tests negotiation, payment, crawl, and refund flows

set -e

API_BEARER="${API_BEARER:-dev_token_123}"
BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "=== Refund Negotiation Demo ==="
echo "Base URL: $BASE_URL"
echo "Using bearer token: ${API_BEARER:0:10}..."
echo ""

# Step 1: Negotiate
echo "Step 1: Starting negotiation with HTML snippets..."
NEGOTIATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/negotiate" \
  -H "Authorization: Bearer $API_BEARER" \
  -H "Content-Type: application/json" \
  -d '{
    "htmlSnippets": [
      {
        "url": "https://example.com/article1",
        "html": "<html><body><h1>Tech News</h1><p>Important article with unique content about AI and machine learning innovations.</p><table><tr><td>Data1</td><td>Value1</td></tr></table></body></html>"
      },
      {
        "url": "https://example.com/article2",
        "html": "<html><body><h1>Analysis</h1><p>Detailed analysis of market trends with comprehensive data points.</p><ul><li>Point 1</li><li>Point 2</li><li>Point 3</li></ul></body></html>"
      }
    ],
    "qualityTarget": 0.8,
    "riskFail": 0.1
  }')

echo "$NEGOTIATE_RESPONSE" | python3 -m json.tool || echo "$NEGOTIATE_RESPONSE"
echo ""

THREAD_ID=$(echo "$NEGOTIATE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('threadId', ''))" 2>/dev/null || echo "")

if [ -z "$THREAD_ID" ]; then
  echo "ERROR: Failed to get thread ID from negotiation response"
  exit 1
fi

echo "Thread ID: $THREAD_ID"
WTP=$(echo "$NEGOTIATE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('quote', {}).get('wtp_usdc', 0))" 2>/dev/null || echo "0")
echo "WTP: \$$WTP USDC"
echo ""

# Step 2: Respond (seller offers at WTP)
echo "Step 2: Seller responds with fair offer..."
RESPOND_RESPONSE=$(curl -s -X POST "$BASE_URL/api/respond" \
  -H "Authorization: Bearer $API_BEARER" \
  -H "Content-Type: application/json" \
  -d "{
    \"threadId\": \"$THREAD_ID\",
    \"sellerOffer\": $WTP,
    \"sellerRefund\": 0.5,
    \"sla\": {
      \"latencyMaxMs\": 3000,
      \"qualityMin\": 0.8
    },
    \"t\": 1,
    \"T\": 3
  }")

echo "$RESPOND_RESPONSE" | python3 -m json.tool || echo "$RESPOND_RESPONSE"
echo ""

DECISION=$(echo "$RESPOND_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('decision', ''))" 2>/dev/null || echo "")
echo "Decision: $DECISION"
echo ""

if [ "$DECISION" != "accept" ]; then
  echo "Note: Buyer did not accept. In real flow, would continue negotiation."
  echo "For demo, proceeding with confirmation anyway..."
fi

# Step 3: Confirm payment
echo "Step 3: Confirming payment..."
CONFIRM_RESPONSE=$(curl -s -X POST "$BASE_URL/api/confirm" \
  -H "Authorization: Bearer $API_BEARER" \
  -H "Content-Type: application/json" \
  -d "{
    \"threadId\": \"$THREAD_ID\",
    \"acceptedPrice\": $WTP,
    \"idempotencyKey\": \"demo_$(date +%s)\"
  }")

echo "$CONFIRM_RESPONSE" | python3 -m json.tool || echo "$CONFIRM_RESPONSE"
echo ""

PAYMENT_ID=$(echo "$CONFIRM_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('payment', {}).get('id', ''))" 2>/dev/null || echo "")
echo "Payment ID: $PAYMENT_ID"
echo ""

# Step 4: Crawl (success path)
echo "Step 4: Executing crawl (success path)..."
CRAWL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/crawl" \
  -H "Authorization: Bearer $API_BEARER" \
  -H "Content-Type: application/json" \
  -d "{
    \"threadId\": \"$THREAD_ID\",
    \"forceFail\": false,
    \"simulatedLatencyMs\": 2000,
    \"simulatedQuality\": 0.9
  }")

echo "$CRAWL_RESPONSE" | python3 -m json.tool || echo "$CRAWL_RESPONSE"
echo ""

# Step 5: Repeat with failure to show refund
echo "=== Failure Path (Refund Demo) ==="
echo ""

echo "Step 5a: New negotiation..."
NEGOTIATE2_RESPONSE=$(curl -s -X POST "$BASE_URL/api/negotiate" \
  -H "Authorization: Bearer $API_BEARER" \
  -H "Content-Type: application/json" \
  -d '{
    "htmlSnippets": [
      {
        "url": "https://example.com/article3",
        "html": "<html><body><h1>Simple Page</h1><p>Basic content.</p></body></html>"
      }
    ]
  }')

THREAD_ID2=$(echo "$NEGOTIATE2_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('threadId', ''))" 2>/dev/null || echo "")
WTP2=$(echo "$NEGOTIATE2_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('quote', {}).get('wtp_usdc', 0))" 2>/dev/null || echo "0")

echo "Thread ID: $THREAD_ID2"
echo "WTP: \$$WTP2 USDC"
echo ""

echo "Step 5b: Respond and confirm..."
curl -s -X POST "$BASE_URL/api/respond" \
  -H "Authorization: Bearer $API_BEARER" \
  -H "Content-Type: application/json" \
  -d "{
    \"threadId\": \"$THREAD_ID2\",
    \"sellerOffer\": $WTP2,
    \"sellerRefund\": 0.6,
    \"sla\": { \"latencyMaxMs\": 3000, \"qualityMin\": 0.8 }
  }" > /dev/null

curl -s -X POST "$BASE_URL/api/confirm" \
  -H "Authorization: Bearer $API_BEARER" \
  -H "Content-Type: application/json" \
  -d "{
    \"threadId\": \"$THREAD_ID2\",
    \"acceptedPrice\": $WTP2
  }" > /dev/null

echo "Step 5c: Crawl with forced failure (triggers refund)..."
CRAWL_FAIL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/crawl" \
  -H "Authorization: Bearer $API_BEARER" \
  -H "Content-Type: application/json" \
  -d "{
    \"threadId\": \"$THREAD_ID2\",
    \"forceFail\": true
  }")

echo "$CRAWL_FAIL_RESPONSE" | python3 -m json.tool || echo "$CRAWL_FAIL_RESPONSE"
echo ""

echo "=== Demo Complete ==="
echo ""
echo "View dashboard at: $BASE_URL/dashboard"
echo "View transactions at: $BASE_URL/api/transactions"
echo ""
