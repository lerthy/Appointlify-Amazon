import React from 'react';
import { Clock, Users, Calendar, Activity, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { useApp } from '../../context/AppContext';

const Analytics: React.FC = () => {
  const { analytics, customers, appointments, services } = useApp();
  
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
    
    // Count appointments by service
    appointments.forEach(appointment => {
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
    
    // Count appointments by day of week
    appointments.forEach(appointment => {
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
  
  // Calculate hourly distribution
  const calculateHourlyDistribution = () => {
    // Create hourly buckets
    const hourCounts = Array(24).fill(0);
    
    // Count appointments by hour
    appointments.forEach(appointment => {
      const date = new Date(appointment.date);
      const hour = date.getHours();
      hourCounts[hour]++;
    });
    
    // Format hours with AM/PM
    return hourCounts.map((count, hour) => ({
      hour,
      hourFormatted: new Date(2000, 0, 1, hour).toLocaleTimeString('en-US', {
        hour: 'numeric',
        hour12: true
      }),
      count
    })).sort((a, b) => b.count - a.count);
  };
  
  // Calculate completion rate
  const calculateCompletionRate = () => {
    const completedAppointments = appointments.filter(a => a.status === 'completed').length;
    const totalAppointments = appointments.length;
    return totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0;
  };

  const serviceDistribution = calculateServiceDistribution();
  const dailyDistribution = calculateDailyDistribution();
  const hourlyDistribution = calculateHourlyDistribution().filter(h => h.count > 0).slice(0, 5);

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
                        {new Date(2000, 0, 1, hour.hour).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          hour12: true
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
    </div>
  );
};

export default Analytics;// Analytics
// Analytics
// Analytics
