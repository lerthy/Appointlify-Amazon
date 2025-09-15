# Appointment Management System
A comprehensive SaaS application for managing appointments.
## Features

## MCP: Supabase Integration

This project includes a Cursor MCP configuration to let the AI connect to your Supabase account securely via the official Supabase MCP server.

### Setup

1. Create a Supabase Personal Access Token (PAT) in your account settings.
2. Add it to your `.env` as `SUPABASE_MCP_ACCESS_TOKEN` (an example entry is in `env-example.txt`).
3. Ensure the `.cursor/mcp.json` is present (already added in this repo). Cursor will auto-detect it.

### Usage

- From Cursor, the AI can attach the `supabase` MCP server and call its tools (schema management, SQL queries, logs, branches). No extra local server is required; it runs via `npx` over stdio.
- You can also run it manually if needed:

```bash
npm run mcp:supabase
```

The server will read `SUPABASE_MCP_ACCESS_TOKEN` from your environment.

### For Businesses
- Employee Management: Add and manage service providers
- Service Management: Create and configure services with pricing
- Appointment Management: View, confirm, cancel, and manage appointments
- Business Settings: Configure working hours, breaks, and blocked dates
- Analytics: Track appointment statistics and peak hours

### For Customers
- Easy Booking: Simple appointment booking interface
- Service Selection: Choose from available services
- Employee Selection: Select preferred service provider
- Email & SMS Notifications: Receive booking confirmations
- Cancellation: Cancel appointments with proper notice
