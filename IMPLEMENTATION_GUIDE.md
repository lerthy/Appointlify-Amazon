# Implementation Guide - Step by Step

## Phase 1: Backend Restructure (Week 1-2)

### 1.1 Restructure Express Server

Create a proper MVC structure:

```javascript
// server/src/app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import appointmentRoutes from './routes/appointments.js';
import businessRoutes from './routes/business.js';
import notificationRoutes from './routes/notifications.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(requestLogger);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version 
  });
});

// API routes
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/business', businessRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Error handling
app.use(errorHandler);

export default app;
```

### 1.2 Create Service Layer

```javascript
// server/src/services/appointmentService.js
import { supabase } from '../config/supabase.js';
import { sendAppointmentConfirmation } from './notificationService.js';

export class AppointmentService {
  async createAppointment(appointmentData) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select()
        .single();

      if (error) throw error;

      // Send confirmation
      await sendAppointmentConfirmation({
        to_name: appointmentData.name,
        to_email: appointmentData.email,
        appointment_date: appointmentData.date,
        appointment_time: appointmentData.time,
        business_name: appointmentData.business_name,
        cancel_link: `${process.env.FRONTEND_URL}/cancel/${data.id}`
      });

      return data;
    } catch (error) {
      throw new Error(`Failed to create appointment: ${error.message}`);
    }
  }

  async getAvailableSlots(businessId, date) {
    try {
      // Get business settings
      const { data: settings } = await supabase
        .from('business_settings')
        .select('working_hours, appointment_duration')
        .eq('business_id', businessId)
        .single();

      // Get existing appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select('date, duration')
        .eq('business_id', businessId)
        .gte('date', new Date(date).toISOString())
        .lt('date', new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString());

      // Calculate available slots
      return this.calculateAvailableSlots(settings, appointments, date);
    } catch (error) {
      throw new Error(`Failed to get available slots: ${error.message}`);
    }
  }

  calculateAvailableSlots(settings, appointments, date) {
    // Implementation for calculating available time slots
    // based on working hours and existing appointments
  }
}
```

### 1.3 Add Error Handling Middleware

```javascript
// server/src/middleware/errorHandler.js
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let statusCode = 500;
  let message = 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource not found';
  } else if (err.code === '23505') { // PostgreSQL unique constraint
    statusCode = 409;
    message = 'Resource already exists';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: statusCode,
      timestamp: new Date().toISOString()
    }
  });
};
```

## Phase 2: Real-time Features (Week 3)

### 2.1 Implement Real-time Subscriptions

```typescript
// src/hooks/useRealtime.ts
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export const useRealtimeAppointments = (businessId: string) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    fetchAppointments();

    // Real-time subscription
    const subscription = supabase
      .channel('appointments')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'appointments',
          filter: `business_id=eq.${businessId}`
        },
        (payload) => {
          console.log('Real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setAppointments(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setAppointments(prev => 
              prev.map(apt => apt.id === payload.new.id ? payload.new : apt)
            );
          } else if (payload.eventType === 'DELETE') {
            setAppointments(prev => 
              prev.filter(apt => apt.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [businessId]);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('business_id', businessId)
        .order('date', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  return { appointments, loading, refetch: fetchAppointments };
};
```

### 2.2 Add Loading States and Error Boundaries

```typescript
// src/components/ui/LoadingSpinner.tsx
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text = 'Loading...' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className={`animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 ${sizeClasses[size]}`} />
      {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
    </div>
  );
};
```

```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-4">
            We're sorry, but something unexpected happened.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Phase 3: AI Integration (Week 4-5)

### 3.1 Create AI Service

```javascript
// server/src/services/aiService.js
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class AIService {
  async generateAppointmentSuggestions(businessId, customerPreferences) {
    try {
      const prompt = `Based on the following business data and customer preferences, suggest optimal appointment times:

Business ID: ${businessId}
Customer Preferences: ${JSON.stringify(customerPreferences)}

Please suggest 3-5 optimal appointment times that would work well for both the business and customer.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('AI suggestion error:', error);
      return null;
    }
  }

  async predictDemand(businessId, dateRange) {
    try {
      // Get historical appointment data
      const { data: appointments } = await supabase
        .from('appointments')
        .select('date, status')
        .eq('business_id', businessId)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);

      // Analyze patterns and predict demand
      const demandPrediction = this.analyzeDemandPatterns(appointments);
      
      return demandPrediction;
    } catch (error) {
      console.error('Demand prediction error:', error);
      return null;
    }
  }

  analyzeDemandPatterns(appointments) {
    // Implementation for analyzing appointment patterns
    // and predicting future demand
  }
}
```

### 3.2 Add AI Suggestions to Frontend

```typescript
// src/components/business/AISuggestions.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';

interface AISuggestion {
  id: string;
  type: 'demand_prediction' | 'appointment_suggestion' | 'optimization';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
}

export const AISuggestions: React.FC<{ businessId: string }> = ({ businessId }) => {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAISuggestions();
  }, [businessId]);

  const fetchAISuggestions = async () => {
    try {
      const response = await fetch(`/api/v1/ai/suggestions/${businessId}`);
      const data = await response.json();
      setSuggestions(data.suggestions);
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading AI suggestions...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">AI Insights</h3>
      {suggestions.map((suggestion) => (
        <Card key={suggestion.id} className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium">{suggestion.title}</h4>
              <p className="text-sm text-gray-600 mt-1">
                {suggestion.description}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500">
                {Math.round(suggestion.confidence * 100)}% confidence
              </span>
            </div>
          </div>
          {suggestion.actionable && (
            <button className="mt-2 text-sm text-blue-600 hover:text-blue-800">
              View Details
            </button>
          )}
        </Card>
      ))}
    </div>
  );
};
```

## Phase 4: Enhanced Notifications (Week 6)

### 4.1 Create Notification Template System

```typescript
// src/utils/notificationTemplates.ts
export interface NotificationTemplate {
  id: string;
  type: 'email' | 'sms' | 'push';
  name: string;
  subject?: string;
  content: string;
  variables: string[];
}

export const notificationTemplates: NotificationTemplate[] = [
  {
    id: 'appointment_confirmation',
    type: 'email',
    name: 'Appointment Confirmation',
    subject: 'Your appointment has been confirmed',
    content: `
      Hi {{customer_name}},
      
      Your appointment with {{business_name}} has been confirmed for {{appointment_date}} at {{appointment_time}}.
      
      Service: {{service_name}}
      Duration: {{duration}} minutes
      
      If you need to cancel or reschedule, please click here: {{cancel_link}}
      
      We look forward to seeing you!
    `,
    variables: ['customer_name', 'business_name', 'appointment_date', 'appointment_time', 'service_name', 'duration', 'cancel_link']
  },
  {
    id: 'appointment_reminder',
    type: 'sms',
    name: 'Appointment Reminder',
    content: `Hi {{customer_name}}, this is a reminder for your appointment with {{business_name}} tomorrow at {{appointment_time}}. Call {{phone}} to reschedule.`,
    variables: ['customer_name', 'business_name', 'appointment_time', 'phone']
  }
];

export const renderTemplate = (template: NotificationTemplate, variables: Record<string, string>): string => {
  let content = template.content;
  
  template.variables.forEach(variable => {
    const value = variables[variable] || '';
    content = content.replace(new RegExp(`{{${variable}}}`, 'g'), value);
  });
  
  return content;
};
```

### 4.2 Enhanced Notification Service

```typescript
// src/utils/enhancedNotificationService.ts
import { sendAppointmentConfirmation } from './emailService';
import { sendSMS } from './smsService';
import { notificationTemplates, renderTemplate } from './notificationTemplates';

interface NotificationRequest {
  type: 'email' | 'sms' | 'push';
  templateId: string;
  variables: Record<string, string>;
  recipient: {
    email?: string;
    phone?: string;
    name: string;
  };
  scheduledFor?: Date;
}

export class EnhancedNotificationService {
  async sendNotification(request: NotificationRequest): Promise<boolean> {
    try {
      const template = notificationTemplates.find(t => t.id === request.templateId);
      if (!template) {
        throw new Error(`Template ${request.templateId} not found`);
      }

      const content = renderTemplate(template, request.variables);

      switch (request.type) {
        case 'email':
          return await this.sendEmail(request.recipient.email!, content, template.subject);
        case 'sms':
          return await this.sendSMS(request.recipient.phone!, content);
        case 'push':
          return await this.sendPushNotification(request.recipient, content);
        default:
          throw new Error(`Unsupported notification type: ${request.type}`);
      }
    } catch (error) {
      console.error('Notification error:', error);
      return false;
    }
  }

  private async sendEmail(email: string, content: string, subject?: string): Promise<boolean> {
    // Implementation using EmailJS or SendGrid
    return true;
  }

  private async sendSMS(phone: string, content: string): Promise<boolean> {
    return await sendSMS({ to: phone, message: content });
  }

  private async sendPushNotification(recipient: any, content: string): Promise<boolean> {
    // Implementation for push notifications
    return true;
  }

  async scheduleNotification(request: NotificationRequest): Promise<string> {
    // Implementation for scheduling notifications
    const scheduledId = `scheduled_${Date.now()}`;
    // Store in database for later processing
    return scheduledId;
  }
}
```

## Phase 5: Analytics & Monitoring (Week 7-8)

### 5.1 Create Analytics Service

```typescript
// src/utils/analyticsService.ts
import { supabase } from './supabaseClient';

export interface AnalyticsEvent {
  event_type: string;
  business_id?: string;
  user_id?: string;
  event_data: Record<string, any>;
  timestamp: Date;
}

export class AnalyticsService {
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      await supabase
        .from('analytics')
        .insert([{
          business_id: event.business_id,
          event_type: event.event_type,
          event_data: event.event_data,
          created_at: event.timestamp.toISOString()
        }]);
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  async getBusinessAnalytics(businessId: string, dateRange: { start: Date; end: Date }) {
    try {
      const { data, error } = await supabase
        .from('analytics')
        .select('*')
        .eq('business_id', businessId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      if (error) throw error;

      return this.processAnalyticsData(data);
    } catch (error) {
      console.error('Analytics fetch error:', error);
      return null;
    }
  }

  private processAnalyticsData(data: any[]) {
    // Process and aggregate analytics data
    const processed = {
      total_appointments: 0,
      completed_appointments: 0,
      cancelled_appointments: 0,
      revenue: 0,
      popular_services: [],
      peak_hours: [],
      customer_retention_rate: 0
    };

    // Implementation for processing analytics data
    return processed;
  }
}

// Usage example
export const analytics = new AnalyticsService();
```

### 5.2 Add Performance Monitoring

```typescript
// src/utils/performanceMonitor.ts
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  startTimer(operation: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(operation, duration);
    };
  }

  recordMetric(operation: string, value: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(value);
  }

  getAverageTime(operation: string): number {
    const values = this.metrics.get(operation);
    if (!values || values.length === 0) return 0;
    
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  getMetrics(): Record<string, { avg: number; count: number }> {
    const result: Record<string, { avg: number; count: number }> = {};
    
    this.metrics.forEach((values, operation) => {
      result[operation] = {
        avg: this.getAverageTime(operation),
        count: values.length
      };
    });
    
    return result;
  }
}

export const performanceMonitor = new PerformanceMonitor();
```

This implementation guide provides concrete code examples for each phase of the improvement plan. Each phase builds upon the previous one, creating a robust and scalable appointment booking system. 