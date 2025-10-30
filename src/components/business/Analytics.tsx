import React, { useState } from 'react';
import { Users, Calendar, CheckCircle, MessageCircle } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { useApp } from '../../context/AppContext';

const Analytics: React.FC = () => {
  const { analytics, appointments, services, businessId } = useApp();
  
  // AI Chat state
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  
  // Only count active (scheduled/confirmed) and future appointments
  const activeStatuses = ['scheduled', 'confirmed'];
  const now = new Date();
  const activeAppointments = appointments.filter(a => {
    const appointmentDate = new Date(a.date);
    return activeStatuses.includes(a.status) && appointmentDate >= now;
  });
  
  // Calculate service distribution
  const calculateServiceDistribution = () => {
    const serviceCount: Record<string, number> = {};
    const serviceNames: Record<string, string> = {};
    
    if (!services || !Array.isArray(services)) {
      return [];
    }
    
    // Initialize counters for each service
    services.forEach(service => {
      serviceCount[service.id] = 0;
      serviceNames[service.id] = service.name;
    });
    
    // Count active appointments by service
    activeAppointments.forEach(appointment => {
      if (serviceCount[appointment.service_id] !== undefined) {
        serviceCount[appointment.service_id]++;
      }
    });
    
    // Calculate percentages
    const total = Object.values(serviceCount).reduce((sum, count) => sum + count, 0);
    const distribution = Object.entries(serviceCount).map(([id, count]) => ({
      id,
      name: serviceNames[id],
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      color: '#3B82F6' // Default color since services don't have color in new schema
    }));
    
    return distribution.sort((a, b) => b.count - a.count);
  };
  
  // Calculate daily distribution
  const calculateDailyDistribution = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = Array(7).fill(0);
    
    // Count active appointments by day of week
    activeAppointments.forEach(appointment => {
      const date = new Date(appointment.date);
      const dayIndex = date.getDay();
      dayCounts[dayIndex]++;
    });
    
    // Return formatted data
    return days.map((day, index) => ({
      day,
      count: dayCounts[index],
      dayIndex: index
    })).sort((a, b) => b.count - a.count);
  };
  
  // Calculate hourly distribution - USE SAME DATA AS PEAK HOURS for consistency
  const calculateHourlyDistribution = () => {
    // Use analytics.peakHours data (same as Peak Hours chart) instead of activeAppointments
    return analytics.peakHours.map(hour => ({
      hour: hour.hour,
      hourFormatted: new Date(2000, 0, 1, hour.hour).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        hour12: false
      }),
      count: hour.count
    })).sort((a, b) => b.count - a.count);
  };
  
  // Calculate completion rate (for all appointments, not just active ones)
  const calculateCompletionRate = () => {
    const completedAppointments = appointments.filter(a => a.status === 'completed').length;
    const totalPastAppointments = appointments.filter(a => {
      const appointmentDate = new Date(a.date);
      return appointmentDate < now && a.status !== 'cancelled';
    }).length;
    return totalPastAppointments > 0 ? Math.round((completedAppointments / totalPastAppointments) * 100) : 0;
  };

  const serviceDistribution = calculateServiceDistribution();
  const dailyDistribution = calculateDailyDistribution();
  const hourlyDistribution = calculateHourlyDistribution().filter(h => h.count > 0).slice(0, 5);

  // Add sample appointments for testing
  const addSampleAppointments = async () => {
    if (!businessId) {
      setError("No business ID found");
      return;
    }

    try {
      const { supabase } = await import('../../utils/supabaseClient');
      
      // Get a service ID
      const { data: serviceData } = await supabase
        .from('services')
        .select('id')
        .eq('business_id', businessId)
        .limit(1);
      
      if (!serviceData || serviceData.length === 0) {
        setError("No services found. Please add services first.");
        return;
      }

      const serviceId = serviceData[0].id;
      
      // Create sample appointments
      const sampleAppointments = [
        {
          customer_id: 'sample-customer-1',
          service_id: serviceId,
          business_id: businessId,
          employee_id: businessId, // Use business_id as employee_id for simplicity
          name: 'John Doe',
          phone: '555-0123',
          email: 'john@example.com',
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          duration: 60,
          status: 'scheduled',
          reminder_sent: false,
          notes: 'Sample appointment'
        },
        {
          customer_id: 'sample-customer-2',
          service_id: serviceId,
          business_id: businessId,
          employee_id: businessId,
          name: 'Jane Smith',
          phone: '555-0124',
          email: 'jane@example.com',
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
          duration: 45,
          status: 'confirmed',
          reminder_sent: true,
          notes: 'Sample appointment 2'
        },
        {
          customer_id: 'sample-customer-3',
          service_id: serviceId,
          business_id: businessId,
          employee_id: businessId,
          name: 'Bob Johnson',
          phone: '555-0125',
          email: 'bob@example.com',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
          duration: 30,
          status: 'completed',
          reminder_sent: true,
          notes: 'Sample completed appointment'
        }
      ];

      const { error } = await supabase
        .from('appointments')
        .insert(sampleAppointments);

      if (error) throw error;
      
      // Refresh the page data
      window.location.reload();
    } catch (err: any) {
      setError(`Failed to add sample appointments: ${err.message}`);
    }
  };

  // AI Chat handler
  const handleAIChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setAnswer("");

    try {
      const res = await fetch("/.netlify/functions/groq-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, businessId }),
      });
      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(text || "Non-JSON response");
      }
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setAnswer(data?.answer || "");
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Main Analytics */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Performance Metrics</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
             
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Users className="h-5 w-5 text-green-500 mr-2" />
                  <h4 className="text-sm font-medium text-gray-500">Customers Served</h4>
                </div>
                <p className="text-2xl font-bold">{analytics.customersServed}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Calendar className="h-5 w-5 text-purple-500 mr-2" />
                  <h4 className="text-sm font-medium text-gray-500">Total Appointments</h4>
                </div>
                <p className="text-2xl font-bold">{appointments.length}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <CheckCircle className="h-5 w-5 text-blue-500 mr-2" />
                  <h4 className="text-sm font-medium text-gray-500">Completion Rate</h4>
                </div>
                <p className="text-2xl font-bold">{calculateCompletionRate()}%</p>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Peak Hours</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  {analytics.peakHours.slice(0, 5).map((hour, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">
                        {new Date(2000, 0, 1, hour.hour).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          hour12: false
                        })}
                      </span>
                      <div className="w-2/3 bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full" 
                          style={{ width: `${(hour.count / analytics.peakHours[0].count) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{hour.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Service Distribution */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Service Distribution</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {serviceDistribution.map(service => (
                <div key={service.id}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{service.name}</span>
                    <span className="text-sm text-gray-500">{service.count} ({service.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="h-2.5 rounded-full" 
                      style={{ 
                        width: `${service.percentage}%`,
                        backgroundColor: service.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Popular Days</h4>
              <div className="grid grid-cols-2 gap-2">
                {dailyDistribution.slice(0, 4).map(day => (
                  <div key={day.day} className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium">{day.day}</p>
                    <p className="text-xl font-bold">{day.count}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Popular Hours</h4>
              <div className="grid grid-cols-2 gap-2">
                {hourlyDistribution.map(hour => (
                  <div key={hour.hour} className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium">{hour.hourFormatted}</p>
                    <p className="text-xl font-bold">{hour.count}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* AI Business Chat Section */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <MessageCircle className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-medium">AI Business Insights</h3>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAIChat} className="flex gap-2 mb-4">
              <input
                className="flex-1 border rounded px-3 py-2"
                placeholder="Ask something like: What are my popular days?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
                disabled={loading || !question.trim()}
              >
                {loading ? 'Asking…' : 'Ask'}
              </button>
            </form>

            {error && (
              <div className="text-red-600 mb-2 text-sm">{error}</div>
            )}

            <div className="border rounded p-3 min-h-[120px] whitespace-pre-wrap bg-gray-50">
              {answer || (loading ? 'Thinking…' : 'Ask a question about your business data and get AI-powered insights.')}
            </div>
            
            {/* Debug info and sample data button */}
            <div className="mt-2 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Debug: {appointments.length} appointments, {services.length} services, Business ID: {businessId || 'none'}
              </div>
              {appointments.length === 0 && (
                <button
                  onClick={addSampleAppointments}
                  className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                >
                  Add Sample Data
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
