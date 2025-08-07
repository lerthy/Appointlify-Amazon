# SaaS Version 3 - Project Structure & Architecture

## 📁 Project Structure

```
Saas-Version3/
├── 📁 src/                          # Main React application
│   ├── 📁 components/               # Reusable UI components
│   │   ├── 📁 business/            # Business dashboard components
│   │   ├── 📁 customer/            # Customer-facing components
│   │   ├── 📁 shared/              # Shared layout components
│   │   └── 📁 ui/                  # Base UI components (buttons, inputs, etc.)
│   ├── 📁 context/                 # React Context for state management
│   ├── 📁 pages/                   # Main page components
│   ├── 📁 types/                   # TypeScript type definitions
│   ├── 📁 utils/                   # Utility functions and services
│   ├── App.tsx                     # Main app component with routing
│   └── main.tsx                    # Application entry point
├── 📁 netlify/                     # Serverless functions for SMS
│   └── 📁 functions/
├── 📄 database_setup.sql           # Database schema
├── 📄 package.json                 # Dependencies and scripts
└── 📄 vite.config.ts              # Build configuration
```

## 🔄 Data Flow

```
User Action → Component → Context → Supabase → Real-time Update → UI Update
```

## 🎯 Component Architecture

### Business Dashboard (`src/components/business/`)
- **Dashboard.tsx** - Main business interface with tabs
- **AppointmentManagement.tsx** - View/manage appointments
- **EmployeeManagement.tsx** - Add/edit employees
- **ServiceManagement.tsx** - Configure services
- **Analytics.tsx** - Business insights
- **Settings.tsx** - Business configuration

### Customer Interface (`src/components/customer/`)
- **AppointmentForm.tsx** - Main booking form
- **CancelAppointment.tsx** - Appointment cancellation

### Shared Components (`src/components/shared/`)
- **Header.tsx** - Navigation header
- **Footer.tsx** - Site footer
- **SplitAuthLayout.tsx** - Authentication layout

### UI Components (`src/components/ui/`)
- **Button.tsx** - Reusable button component
- **Input.tsx** - Form input component
- **Card.tsx** - Card layout component
- **Select.tsx** - Dropdown component
- **Tabs.tsx** - Tab navigation

## 🔐 Authentication & Security

### Authentication Flow
1. Simple localStorage-based auth (for demo purposes)
2. User data stored in browser localStorage
3. No password hashing in frontend (would need backend auth)
4. Business ID used to filter data

### Data Security
- Supabase Row Level Security (RLS) should be configured
- Business data filtered by `business_id`
- Environment variables for sensitive data

## 📱 SMS Integration

### SMS Flow
```
Appointment Created → sendSMS() → Netlify Function → Twilio API → SMS Sent
```

### Netlify Functions
- **send-sms.js** - Handles SMS sending via Twilio
- **test-sms.js** - Tests SMS configuration 