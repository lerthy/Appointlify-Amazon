import { v4 as uuidv4 } from 'uuid';
import { Customer, Appointment, BusinessSettings, Analytics } from '../types';

// Utility to generate dates relative to now
const relativeDate = (dayOffset: number, hours: number, minutes = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export const generateSampleData = () => {
  // Generate service IDs first so we can reference them
  const serviceIds = {
    haircut: uuidv4(),
    manicure: uuidv4(),
    massage: uuidv4(),
    consultation: uuidv4()
  };

  // Generate customer IDs to reference in appointments
  const customerIds = {
    john: uuidv4(),
    jane: uuidv4(),
    bob: uuidv4(),
    alice: uuidv4(),
    david: uuidv4(),
    emma: uuidv4()
  };

  const customers: Customer[] = [
    {
      id: customerIds.john,
      name: 'John Smith',
      phone: '555-123-4567',
      email: 'john@example.com',
      serviceId: serviceIds.haircut,
      joinedAt: new Date(Date.now() - 30 * 60000), // 30 minutes ago
      status: 'waiting',
      estimatedWaitTime: 15,
      notified: true
    },
    {
      id: customerIds.jane,
      name: 'Jane Doe',
      phone: '555-987-6543',
      serviceId: serviceIds.manicure,
      joinedAt: new Date(Date.now() - 15 * 60000), // 15 minutes ago
      status: 'in-progress',
      estimatedWaitTime: 30,
      notified: true
    },
    {
      id: customerIds.bob,
      name: 'Bob Johnson',
      phone: '555-567-8901',
      email: 'bob@example.com',
      serviceId: serviceIds.massage,
      joinedAt: new Date(Date.now() - 5 * 60000), // 5 minutes ago
      status: 'waiting',
      estimatedWaitTime: 45,
      notified: false
    },
    {
      id: customerIds.alice,
      name: 'Alice Williams',
      phone: '555-234-5678',
      serviceId: serviceIds.consultation,
      joinedAt: new Date(Date.now() - 45 * 60000), // 45 minutes ago
      status: 'completed',
      estimatedWaitTime: 20,
      notified: true
    }
  ];

  const appointments: Appointment[] = [
    {
      id: uuidv4(),
      customerId: customerIds.david,
      serviceId: serviceIds.haircut,
      date: relativeDate(1, 14, 30), // Tomorrow, 2:30 PM
      duration: 30,
      status: 'scheduled',
      reminderSent: false
    },
    {
      id: uuidv4(),
      customerId: customerIds.emma,
      serviceId: serviceIds.massage,
      date: relativeDate(0, 16, 0), // Today, 4:00 PM
      duration: 60,
      status: 'confirmed',
      reminderSent: true
    },
    {
      id: uuidv4(),
      customerId: customerIds.john,
      serviceId: serviceIds.consultation,
      date: relativeDate(2, 11, 0), // Day after tomorrow, 11:00 AM
      duration: 45,
      status: 'scheduled',
      reminderSent: false
    }
  ];

  const businessSettings: BusinessSettings = {
    name: 'StyleHub Salon & Spa',
    logo: 'https://images.pexels.com/photos/1029896/pexels-photo-1029896.jpeg?auto=compress&cs=tinysrgb&w=64',
    primaryColor: '#3B82F6', // Blue
    secondaryColor: '#10B981', // Green
    phoneNumber: '555-STYLEHUB',
    email: 'appointments@stylehub.com',
    address: '123 Style Street, Beauty City, BC 12345',
    working_hours: [
      { day: 'Monday', open: '09:00', close: '18:00', isClosed: false },
      { day: 'Tuesday', open: '09:00', close: '18:00', isClosed: false },
      { day: 'Wednesday', open: '09:00', close: '18:00', isClosed: false },
      { day: 'Thursday', open: '09:00', close: '20:00', isClosed: false },
      { day: 'Friday', open: '09:00', close: '20:00', isClosed: false },
      { day: 'Saturday', open: '10:00', close: '16:00', isClosed: false },
      { day: 'Sunday', open: '00:00', close: '00:00', isClosed: true }
    ],
    services: [
      {
        id: serviceIds.haircut,
        name: 'Manuka',
        description: 'Restauranti ma i mire e ma i lire',
        duration: 30,
        color: '#3B82F6', // Blue
        logo: 'https://pbs.twimg.com/profile_images/1269354631773241345/gWOQHDHS_400x400.jpg'
      },
      {
        id: serviceIds.manicure,
        name: 'Ari dent',
        description: 'Aty ku buzqeshja osht ma shume se veq me kesh',
        duration: 45,
        color: '#EC4899', // Pink
        logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQfM4dEQ8XDVxJLOcwFQG3KMssgIfQ8tw9Tyw&s'
      },
      {
        id: serviceIds.massage,
        name: 'Massage Therapy',
        description: 'Relaxing full-body massage',
        duration: 60,
        color: '#8B5CF6', // Purple
        logo: 'https://cdn-icons-png.flaticon.com/512/2921/2921824.png'
      },
      {
        id: serviceIds.consultation,
        name: 'Style Consultation',
        description: 'Personal style and beauty consultation',
        duration: 45,
        color: '#F59E0B', // Amber
        logo: 'https://cdn-icons-png.flaticon.com/512/2921/2921825.png'
      }
    ]
  };

  const analytics: Analytics = {
    averageWaitTime: 25,
    customersServed: 42,
    customersWaiting: 3,
    peakHours: [
      { hour: 11, count: 15 },
      { hour: 12, count: 18 },
      { hour: 16, count: 14 },
      { hour: 17, count: 12 },
      { hour: 9, count: 8 }
    ]
  };

  return { customers, appointments, businessSettings, analytics };
};