# 🗓️ Appointly - AI-Powered Appointment Booking SaaS

A comprehensive, multi-tenant appointment booking platform that empowers businesses to manage appointments efficiently while providing customers with a seamless booking experience enhanced by AI assistance.

![Appointly](https://via.placeholder.com/800x400/6A3EE8/FFFFFF?text=Appointly+-+Smart+Appointment+Booking)

## ✨ Features

### 🏢 For Businesses
- **📊 Comprehensive Dashboard** - Real-time analytics, appointment overview, and key metrics
- **👥 Employee Management** - Add, manage, and organize service providers
- **💼 Service Management** - Create services with custom pricing, duration, and descriptions
- **📅 Appointment Management** - View, confirm, reschedule, and cancel appointments
- **⚙️ Business Settings** - Configure working hours, breaks, blocked dates, and business profile
- **📈 Analytics & Insights** - Track booking trends, peak hours, and business performance
- **📧 Automated Notifications** - Email and SMS confirmations for appointments

### 👨‍💼 For Customers
- **🎯 Easy Booking Interface** - Intuitive appointment scheduling system
- **🔍 Service Discovery** - Browse available services with detailed descriptions
- **👤 Employee Selection** - Choose preferred service providers
- **🤖 AI Booking Assistant** - Smart chatbot to help with booking questions
- **📱 Multi-Channel Notifications** - Email and SMS appointment confirmations
- **❌ Self-Service Cancellation** - Cancel appointments with proper notice
- **👤 Profile Management** - Manage personal information and booking history

### 🤖 AI-Powered Features
- **Intelligent Chatbot** - Context-aware booking assistant powered by OpenAI/Groq
- **Natural Language Processing** - Understand customer queries and booking intents
- **Smart Recommendations** - Suggest optimal appointment times and services
- **24/7 Availability** - Always-on customer support and booking assistance

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for modern, responsive UI
- **React Router** for navigation
- **Framer Motion** for smooth animations
- **Lucide React** for icons

### Backend
- **Supabase** for database, authentication, and real-time features
- **Netlify Functions** for serverless backend logic
- **Node.js** with TypeScript for function runtime

### AI & Integrations
- **OpenAI GPT** for advanced AI conversations
- **Groq** for fast AI inference (fallback)
- **Twilio** for SMS notifications
- **SendGrid/Nodemailer** for email notifications
- **MCP (Model Context Protocol)** for Supabase integration

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- (Optional) OpenAI API key
- (Optional) Twilio account for SMS
- (Optional) SendGrid account for emails

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Saas-Version3
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env-example.txt .env
   ```
   
   Fill in your API keys and configuration:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # AI Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   USE_OPENAI=true
   GROQ_API_KEY=your_groq_api_key_here
   
   # Notifications (Optional)
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number
   ```

4. **Set up Supabase database**
   - Create tables for: users, services, employees, appointments, business_settings
   - Enable Row Level Security (RLS)
   - Set up authentication policies

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Build for production**
   ```bash
   npm run build
   ```

## 📁 Project Structure

```
src/
├── components/
│   ├── business/          # Business dashboard components
│   │   ├── Analytics.tsx
│   │   ├── AppointmentManagement.tsx
│   │   ├── Dashboard.tsx
│   │   ├── EmployeeManagement.tsx
│   │   ├── ServiceManagement.tsx
│   │   └── Settings.tsx
│   ├── customer/          # Customer-facing components
│   │   ├── AppointmentForm.tsx
│   │   └── CancelAppointment.tsx
│   ├── shared/            # Shared components
│   │   ├── AIChatbot.tsx
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   └── ui/                # Reusable UI components
├── context/               # React context providers
├── hooks/                 # Custom React hooks
├── pages/                 # Page components
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions and services
└── netlify/functions/     # Serverless backend functions
```

## 🔧 Configuration

### Supabase Setup
1. Create a new Supabase project
2. Set up the database schema (tables for users, appointments, services, etc.)
3. Configure Row Level Security policies
4. Enable authentication providers

### AI Configuration
- **OpenAI**: Get API key from OpenAI dashboard
- **Groq**: Alternative fast inference provider
- **Fallback**: Mock AI service for development

### Notification Services
- **SMS**: Twilio integration for appointment confirmations
- **Email**: SendGrid or SMTP for email notifications

## 🔒 Security Features

- **Authentication** - Secure user login/registration with Supabase Auth
- **Authorization** - Role-based access control (business owners vs customers)
- **Data Protection** - Row Level Security (RLS) policies
- **API Security** - Serverless functions with proper validation
- **Environment Isolation** - Separate development/production environments

## 📱 Multi-Tenant Architecture

- **Business Isolation** - Each business has separate data and settings
- **Scalable Design** - Support for unlimited businesses and customers
- **Custom Branding** - Business-specific configurations and settings
- **Performance Optimized** - Efficient queries and real-time updates

## 🌟 AI Assistant Capabilities

The integrated AI chatbot can help customers with:
- Finding available appointment slots
- Understanding service offerings
- Booking appointments through conversation
- Answering common questions
- Providing business information

## 🚀 Deployment

### Netlify (Recommended)
1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy automatically on every push

### Other Platforms
- Vercel
- AWS Amplify
- Traditional hosting with Node.js server

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@appointly.com or join our Discord community.

## 🔮 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Integration marketplace
- [ ] Multi-language support
- [ ] Advanced AI features
- [ ] White-label solutions

## ⚡ MCP: Supabase Integration

This project includes a Cursor MCP configuration for seamless Supabase integration:

### Setup
1. Create a Supabase Personal Access Token (PAT) in your account settings
2. Add it to your `.env` as `SUPABASE_MCP_ACCESS_TOKEN`
3. The `.cursor/mcp.json` configuration is already included

### Usage
- AI can directly interact with your Supabase database
- Schema management and SQL queries through Cursor
- Real-time logs and branch management
- Run manually: `npm run mcp:supabase`

---

**Built with ❤️ by the Appointly Team**

*Transforming appointment booking with AI-powered solutions*