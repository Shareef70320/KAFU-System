#!/bin/bash

# Test script to diagnose IDP progress update issue on Render
# Usage: ./test_idp_progress.sh <IDP_ID>
# Example: ./test_idp_progress.sh c9e8949c-5322-40e2-8b4c-c0198091e69e

IDP_ID=$1
RENDER_URL="https://kafu-system-2.onrender.com/api"

if [ -z "$IDP_ID" ]; then
  echo "❌ Error: Please provide an IDP ID"
  echo "Usage: ./test_idp_progress.sh <IDP_ID>"
  echo "Example: ./test_idp_progress.sh c9e8949c-5322-40e2-8b4c-c0198091e69e"
  exit 1
fi

echo "🧪 Testing IDP Progress Update on Render"
echo "=========================================="
echo "IDP ID: $IDP_ID"
echo "Render URL: $RENDER_URL"
echo ""

# Step 1: Test health endpoint
echo "1️⃣  Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "$RENDER_URL/health?ts=$(date +%s)")
echo "Response: $HEALTH_RESPONSE"
VERSION=$(echo $HEALTH_RESPONSE | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
echo "Version detected: $VERSION"
echo ""

if [ "$VERSION" != "v4.7.5" ]; then
  echo "⚠️  WARNING: Version is $VERSION, expected v4.7.5"
  echo "   Render may be serving old code. Please redeploy with 'Clear build cache'"
  echo ""
fi

# Step 2: Test IDP progress update (JSON without attachments)
echo "2️⃣  Testing IDP progress update (JSON only)..."
PROGRESS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PUT "$RENDER_URL/idp/$IDP_ID/progress" \
  -H "Content-Type: application/json" \
  -d "{\"progressPercentage\": 15, \"status\": \"IN_PROGRESS\", \"progressNotes\": \"Test from diagnostic script\"}")

HTTP_CODE=$(echo "$PROGRESS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$PROGRESS_RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Status Code: $HTTP_CODE"
echo "Response Body: $RESPONSE_BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ JSON-only update works! The issue is likely with file attachments."
else
  echo "❌ JSON-only update failed with status $HTTP_CODE"
  echo "   Check Render logs for the exact error"
  echo "   Common issues:"
  echo "   - Database missing progress columns"
  echo "   - Backend running old code version"
  echo "   - IDP ID doesn't exist"
fi

echo ""
echo "=========================================="
echo "📋 Next Steps:"
echo "1. If JSON works but UI fails: Check frontend API call format"
echo "2. If JSON fails: Check Render logs for database/column errors"
echo "3. Run database migration if missing columns:"
echo "   ALTER TABLE idp_entries ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;"
echo "4. Force Render redeploy with 'Clear build cache & deploy'"

