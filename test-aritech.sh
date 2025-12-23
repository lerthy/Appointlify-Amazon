#!/bin/bash

# Test script for aritech subdomain
echo "Testing aritech subdomain endpoint..."
echo ""

# Test the endpoint
echo "Testing: GET /api/business/aritech/info"
curl -v "http://localhost:5001/api/business/aritech/info" \
  -H "Content-Type: application/json" \
  2>&1 | head -50

echo ""
echo ""
echo "Test complete!"
echo ""
echo "To test in browser:"
echo "1. Make sure backend is running on port 5001"
echo "2. Navigate to: http://localhost:3000/book/aritech"
echo "3. Check browser console for any errors"

