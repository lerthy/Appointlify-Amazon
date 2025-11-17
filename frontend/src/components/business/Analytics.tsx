import React, { useState } from 'react';
import { Users, Calendar, CheckCircle, PieChart as PieIcon, BarChart2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { useApp } from '../../context/AppContext';

type ChartMode = 'pie' | 'bar';

const Analytics: React.FC = () => {
  const { analytics, appointments, services, employees } = useApp();
  const [serviceChartMode, setServiceChartMode] = useState<ChartMode>('pie');
  const [dayChartMode, setDayChartMode] = useState<ChartMode>('pie');
  const [employeeChartMode, setEmployeeChartMode] = useState<ChartMode>('pie');
  
  // Only count active (scheduled/confirmed) and future appointments
  const activeStatuses = ['scheduled', 'confirmed'];
  const now = new Date();
  const activeAppointments = appointments.filter(a => {
    const appointmentDate = new Date(a.date);
    return activeStatuses.includes(a.status) && appointmentDate >= now;
  });
  
  // Color palette for charts
  const chartColors = [
    '#3B82F6', // blue
    '#10B981', // emerald
    '#F97316', // orange
    '#EF4444', // red
    '#8B5CF6', // violet
    '#F59E0B', // amber
    '#14B8A6', // teal
    '#6366F1', // indigo
  ];

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
    const distribution = Object.entries(serviceCount).map(([id, count], index) => ({
      id,
      name: serviceNames[id],
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      color: chartColors[index % chartColors.length]
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
  
  // Calculate hourly distribution
  const calculateHourlyDistribution = () => {
    // Create hourly buckets
    const hourCounts = Array(24).fill(0);
    
    // Count active appointments by hour
    activeAppointments.forEach(appointment => {
      const date = new Date(appointment.date);
      const hour = date.getHours();
      hourCounts[hour]++;
    });
    
    // Format hours in 24h
    return hourCounts.map((count, hour) => ({
      hour,
      hourFormatted: new Date(2000, 0, 1, hour).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        hour12: false
      }),
      count
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

  // Employee-related analytics
  const employeeCounts = () => {
    if (!employees || !Array.isArray(employees)) return [];

    const counts: Record<string, number> = {};
    const names: Record<string, string> = {};

    employees.forEach((emp) => {
      counts[emp.id] = 0;
      names[emp.id] = emp.name;
    });

    appointments.forEach((appointment) => {
      if (counts[appointment.employee_id] !== undefined) {
        counts[appointment.employee_id]++;
      }
    });

    const total = Object.values(counts).reduce((sum, c) => sum + c, 0);

    return Object.entries(counts)
      .map(([id, count]) => ({
        id,
        name: names[id],
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
  };

  const appointmentsPerEmployee = employeeCounts();

  interface HistogramDatum {
    label: string;
    value: number;
    color?: string;
  }

  const Histogram: React.FC<{
    data: HistogramDatum[];
    maxHeight?: number;
    showValue?: boolean;
  }> = ({ data, maxHeight = 140, showValue = true }) => {
    if (!data.length) {
      return (
        <div className="flex items-center justify-center h-24 text-xs text-gray-400">
          No data
        </div>
      );
    }

    const max = Math.max(...data.map((d) => d.value), 1);

    return (
      <div className="w-full overflow-x-auto">
        <div
          className="flex items-end gap-0.5"
          style={{ height: maxHeight }}
        >
          {data.map((d) => {
            const heightPercent = d.value === 0 ? 4 : Math.max((d.value / max) * 100, 8);
            return (
              <div
                key={d.label}
                className="flex flex-col items-center flex-1 h-full min-w-[2rem]"
              >
                {showValue && (
                  <span className="text-[10px] text-gray-600 mb-1">
                    {d.value}
                  </span>
                )}
                <div className="w-full max-w-[28px] flex-1 bg-gray-100 rounded-t-lg overflow-hidden flex items-end">
                  <div
                    className="w-full rounded-t-lg"
                    style={{
                      height: `${heightPercent}%`,
                      backgroundColor: d.color || '#3B82F6',
                    }}
                  />
                </div>
                <span className="mt-1 text-[10px] text-gray-600 truncate text-center w-full">
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Performance Metrics & Employee Stats */}
        <div className="space-y-6">
          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium">Performance Metrics</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Customers Served */}
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg sm:block sm:p-4">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mr-2" />
                    <h4 className="text-xs sm:text-sm font-medium text-gray-500">Customers Served</h4>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold sm:mt-2">{analytics.customersServed}</p>
                </div>
                
                {/* Total Appointments */}
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg sm:block sm:p-4">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 mr-2" />
                    <h4 className="text-xs sm:text-sm font-medium text-gray-500">Total Appointments</h4>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold sm:mt-2">{appointments.length}</p>
                </div>
                
                {/* Completion Rate */}
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg sm:block sm:p-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mr-2" />
                    <h4 className="text-xs sm:text-sm font-medium text-gray-500">Completion Rate</h4>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold sm:mt-2">{calculateCompletionRate()}%</p>
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

          {/* Employee Stats */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="text-lg font-medium">Employee Statistics</h3>
              <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setEmployeeChartMode('pie')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors ${
                    employeeChartMode === 'pie'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <PieIcon className="h-3.5 w-3.5" />
                  Pie
                </button>
                <button
                  type="button"
                  onClick={() => setEmployeeChartMode('bar')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors ${
                    employeeChartMode === 'bar'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  Bars
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Total Employees */}
              <div className="mb-4">
                <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Total Employees</p>
                    <p className="text-2xl font-bold">{employees?.length || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-indigo-500" />
                </div>
              </div>

              {/* Appointments per Employee Chart */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">
                  Appointments per Employee
                </h4>
                {employeeChartMode === 'pie' ? (
                  appointmentsPerEmployee.length > 0 &&
                  appointmentsPerEmployee.some((e) => e.count > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={appointmentsPerEmployee
                            .filter((e) => e.count > 0)
                            .map((emp) => ({
                              name: emp.name,
                              value: emp.count,
                            }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`
                          }
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {appointmentsPerEmployee
                            .filter((e) => e.count > 0)
                            .map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={chartColors[index % chartColors.length]}
                              />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
                      No employee data available
                    </div>
                  )
                ) : (
                  <Histogram
                    data={appointmentsPerEmployee.map((emp, index) => ({
                      label: emp.name,
                      value: emp.count,
                      color: chartColors[index % chartColors.length],
                    }))}
                    maxHeight={200}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column: Service Distribution & Schedule Insights */}
        <div className="space-y-6">
          {/* Service Distribution */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="text-lg font-medium">Service Distribution</h3>
              <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setServiceChartMode('pie')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors ${
                    serviceChartMode === 'pie'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <PieIcon className="h-3.5 w-3.5" />
                  Pie
                </button>
                <button
                  type="button"
                  onClick={() => setServiceChartMode('bar')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors ${
                    serviceChartMode === 'bar'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  Bars
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {serviceChartMode === 'pie' ? (
                serviceDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={serviceDistribution.map((s) => ({
                          name: s.name,
                          value: s.count,
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {serviceDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
                    No service data available
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  <Histogram
                    data={serviceDistribution.map((s) => ({
                      label: s.name,
                      value: s.count,
                      color: s.color,
                    }))}
                    maxHeight={150}
                  />
                  <div className="flex flex-wrap gap-3 justify-center text-[11px] text-gray-500">
                    {serviceDistribution.map((service) => (
                      <div key={service.id} className="flex items-center gap-1">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: service.color }}
                        />
                        <span>{service.name}</span>
                        <span className="font-semibold text-gray-700">
                          ({service.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Popular Days */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="text-lg font-medium">Popular Days</h3>
              <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDayChartMode('pie')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors ${
                    dayChartMode === 'pie'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <PieIcon className="h-3.5 w-3.5" />
                  Pie
                </button>
                <button
                  type="button"
                  onClick={() => setDayChartMode('bar')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors ${
                    dayChartMode === 'bar'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  Bars
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div>
                {dayChartMode === 'pie' ? (
                  dailyDistribution.length > 0 && dailyDistribution.some(d => d.count > 0) ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={dailyDistribution
                            .filter((d) => d.count > 0)
                            .map((d) => ({
                              name: d.day,
                              value: d.count,
                            }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`
                          }
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {dailyDistribution
                            .filter((d) => d.count > 0)
                            .map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={chartColors[index % chartColors.length]}
                              />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">
                      No appointment data for days
                    </div>
                  )
                ) : (
                  <Histogram
                    data={dailyDistribution.map((day, index) => ({
                      label: day.day.slice(0, 3),
                      value: day.count,
                      color: chartColors[index % chartColors.length],
                    }))}
                    maxHeight={130}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Popular Hours */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium">Popular Hours</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {hourlyDistribution.map((hour) => (
                  <div key={hour.hour} className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium">{hour.hourFormatted}</p>
                    <p className="text-xl font-bold">{hour.count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
