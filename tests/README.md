# Test Files Directory

This directory contains all test and debugging scripts for the Appointlify SaaS application.

## Directory Structure

### `/functions/`
Configuration and functionality tests for Netlify serverless functions:
- `test-sms.js` - Tests SMS/Twilio configuration and functionality
- `test-smtp.js` - Tests email SMTP configuration and sends test emails
- `test-twilio-config.js` - Tests Twilio SMS service configuration
- `request-password-reset-*.js` - Various versions/iterations of password reset function (for reference/debugging)

### `/integration/`
Integration tests for external services:
- `test-mcp-integration.js` - Tests MCP (Model Context Protocol) integration with chat function
- `test-openai.js` - Tests OpenAI API connection and credentials

### `/local/`
Local development and debugging scripts:
- `test-local.js` - Local testing script for password reset function debugging

## Usage

### Running Tests
```bash
# Test OpenAI integration
node tests/integration/test-openai.js

# Test MCP integration
node tests/integration/test-mcp-integration.js

# Test local password reset function
node tests/local/test-local.js

# Test SMS configuration (as Netlify function)
# Deploy and access via: https://your-site.netlify.app/.netlify/functions/test-sms

# Test SMTP configuration (as Netlify function)
# Deploy and access via: https://your-site.netlify.app/.netlify/functions/test-smtp
```

### Environment Requirements
Make sure your `.env` file contains the required variables:
- `OPENAI_API_KEY` - For OpenAI integration tests
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` - For SMS tests
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` - For email tests
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` - For database tests

## Note
These are development and debugging tools. They are not part of the main application functionality but are useful for troubleshooting and verifying configurations.