import React, { useState } from 'react';
import { Users, Plus, Edit, Trash2, Clock, User, Mail, Phone, Briefcase } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Card, CardHeader, CardContent } from '../ui/Card';
import ImageUpload from '../ui/ImageUpload';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import AlertDialog from '../ui/AlertDialog';
import { deleteFromStorage } from '../../utils/storageService';

interface EmployeeFormData {
  name: string;
  email: string;
  phone: string;
  role: string;
  image_url?: string;
  working_hours: Array<{
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
  }>;
}

const EmployeeManagement: React.FC = () => {
  const { employees, addEmployee, updateEmployee, deleteEmployee, businessId } = useApp();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<string | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: '',
    email: '',
    phone: '',
    role: '',
    image_url: '',
    working_hours: [
      { day: 'Monday', open: '09:00', close: '17:00', isClosed: false },
      { day: 'Tuesday', open: '09:00', close: '17:00', isClosed: false },
      { day: 'Wednesday', open: '09:00', close: '17:00', isClosed: false },
      { day: 'Thursday', open: '09:00', close: '17:00', isClosed: false },
      { day: 'Friday', open: '09:00', close: '17:00', isClosed: false },
      { day: 'Saturday', open: '10:00', close: '15:00', isClosed: false },
      { day: 'Sunday', open: '00:00', close: '00:00', isClosed: true }
    ]
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleWorkingHoursChange = (day: string, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      working_hours: prev.working_hours.map(wh => 
        wh.day === day ? { ...wh, [field]: value } : wh
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.phone || !formData.role) {
      showNotification('Please fill in all required fields.', 'error');
      return;
    }

    try {
      if (editingEmployee) {
        // Find the current employee to check if they have an old image
        const currentEmployee = employees.find(emp => emp.id === editingEmployee);
        const oldImageUrl = currentEmployee?.image_url;
        

        
        // Update existing employee
        await updateEmployee(editingEmployee, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          image_url: formData.image_url || undefined
        });
        
        // Delete old image if it exists and is different from the new one
        if (oldImageUrl && oldImageUrl !== formData.image_url) {
          try {
            const path = extractStoragePath(oldImageUrl);
            if (path) {
              await deleteFromStorage('employee-images', path);
            }
          } catch (error) {
            console.error('Error deleting old employee image:', error);
            // Don't fail the update if image deletion fails
          }
        }
        
        showNotification('Employee updated successfully!', 'success');
        setEditingEmployee(null);
      } else {
        // Ensure business is resolved before creating employee
        if (!businessId) {
          showNotification('Business is still loading. Please try again in a moment.', 'error');
          return;
        }
        // Add new employee (payload filtered in context to match DTO)
        await addEmployee({
          business_id: businessId,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          image_url: formData.image_url || undefined
        });
        showNotification('Employee added successfully!', 'success');
      }

      resetForm();
      setIsAddingEmployee(false);
    } catch (error) {
      console.error('Error saving employee:', error);
      showNotification('Failed to save employee. Please try again.', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: '',
      image_url: '',
      working_hours: [
        { day: 'Monday', open: '09:00', close: '17:00', isClosed: false },
        { day: 'Tuesday', open: '09:00', close: '17:00', isClosed: false },
        { day: 'Wednesday', open: '09:00', close: '17:00', isClosed: false },
        { day: 'Thursday', open: '09:00', close: '17:00', isClosed: false },
        { day: 'Friday', open: '09:00', close: '17:00', isClosed: false },
        { day: 'Saturday', open: '10:00', close: '15:00', isClosed: false },
        { day: 'Sunday', open: '00:00', close: '00:00', isClosed: true }
      ]
    });
  };

  const handleEditEmployee = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee) {
      setFormData({
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        role: employee.role,
        image_url: employee.image_url || '',
        working_hours: [
          { day: 'Monday', open: '09:00', close: '17:00', isClosed: false },
          { day: 'Tuesday', open: '09:00', close: '17:00', isClosed: false },
          { day: 'Wednesday', open: '09:00', close: '17:00', isClosed: false },
          { day: 'Thursday', open: '09:00', close: '17:00', isClosed: false },
          { day: 'Friday', open: '09:00', close: '17:00', isClosed: false },
          { day: 'Saturday', open: '10:00', close: '15:00', isClosed: false },
          { day: 'Sunday', open: '00:00', close: '00:00', isClosed: true }
        ]
      });
      setEditingEmployee(employeeId);
      setIsAddingEmployee(true);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      // Find the employee to get their image URL
      const employee = employees.find(emp => emp.id === employeeId);
      
      // Delete the employee from database
      await deleteEmployee(employeeId);
      
      // Delete the employee's image from storage if it exists
      if (employee?.image_url) {
        try {
          const path = extractStoragePath(employee.image_url);
          if (path) {
            await deleteFromStorage('employee-images', path);
          }
        } catch (error) {
          console.error('Error deleting employee image:', error);
          // Don't fail the employee deletion if image deletion fails
        }
      }
      
      showNotification('Employee deleted successfully!', 'success');
      setDeletingEmployee(null);
    } catch (error) {
      console.error('Error deleting employee:', error);
      showNotification('Failed to delete employee. Please try again.', 'error');
    }
  };

  // Helper function to extract storage path from Supabase URL
  const extractStoragePath = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const storageIndex = pathParts.findIndex(part => part === 'storage');
      if (storageIndex !== -1 && pathParts[storageIndex + 2]) {
        return pathParts.slice(storageIndex + 2).join('/');
      }
      return null;
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Employees</h2>
          <p className="text-gray-600">Manage your business employees and their schedules</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setIsAddingEmployee(true)}
            className="flex items-center justify-center w-10 h-10 rounded-full sm:w-auto sm:h-auto sm:rounded-lg"
            aria-label="Add employee"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">
              Add Employee
            </span>
          </Button>
        </div>
      </div>

      {/* Employee List */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {employees.map((employee) => (
          <Card key={employee.id} className="hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-blue-300 group">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center">
                  {employee.image_url ? (
                    <img
                      src={employee.image_url}
                      alt={employee.name}
                      className="w-12 h-12 rounded-full object-cover shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-sm">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                  )}
                  <div className="ml-4">
                    <h3 className="font-semibold text-gray-900 text-lg">{employee.name}</h3>
                  </div>
                </div>
                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => handleEditEmployee(employee.id)}
                    className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeletingEmployee(employee.id)}
                    className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3 text-sm text-gray-600 border-t border-gray-100 pt-6">
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-4 w-4 mr-3 text-gray-400" />
                  <span className="font-medium">{employee.email}</span>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-4 w-4 mr-3 text-gray-400" />
                  <span className="font-medium">{employee.phone}</span>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Briefcase className="h-4 w-4 mr-3 text-gray-400" />
                  <span className="font-medium">{employee.role}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Employee Modal */}
      {isAddingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-[1px] flex items-center justify-center z-[80] p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl relative">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    {editingEmployee ? 'Update the employee details below' : 'Fill in the employee details below'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsAddingEmployee(false);
                    setEditingEmployee(null);
                    resetForm();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Full Name *
                    </label>
                    <Input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter employee name"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Role *
                    </label>
                    <Input
                      type="text"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      placeholder="e.g., Stylist, Therapist"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Email *
                    </label>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="employee@example.com"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Phone *
                    </label>
                    <Input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 234 567 8900"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Employee Photo */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Employee Photo
                  </label>
                  <ImageUpload
                    value={formData.image_url}
                    onChange={(imageUrl) => setFormData(prev => ({ ...prev, image_url: imageUrl }))}
                    onRemove={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                    className="max-w-xs"
                    employeeId={editingEmployee || undefined}
                  />
                </div>

                {/* Working Hours */}
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-700">
                    <Clock className="inline h-4 w-4 mr-2" />
                    Working Hours
                  </label>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {formData.working_hours.map((hours) => (
                        <div
                          key={hours.day}
                          className="flex flex-col gap-3 p-3 bg-white rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-800">
                              {hours.day}
                            </span>
                            <label className="flex items-center text-xs font-medium text-gray-600">
                              <input
                                type="checkbox"
                                checked={!hours.isClosed}
                                onChange={(e) =>
                                  handleWorkingHoursChange(hours.day, 'isClosed', !e.target.checked)
                                }
                                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              {hours.isClosed ? 'Closed' : 'Open'}
                            </label>
                          </div>

                          {!hours.isClosed && (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-medium text-gray-500">
                                  Opens
                                </span>
                                <Input
                                  type="time"
                                  value={hours.open}
                                  onChange={(e) =>
                                    handleWorkingHoursChange(hours.day, 'open', e.target.value)
                                  }
                                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-medium text-gray-500">
                                  Closes
                                </span>
                                <Input
                                  type="time"
                                  value={hours.close}
                                  onChange={(e) =>
                                    handleWorkingHoursChange(hours.day, 'close', e.target.value)
                                  }
                                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddingEmployee(false);
                      setEditingEmployee(null);
                      resetForm();
                    }}
                    className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700">
                    {editingEmployee ? 'Update Employee' : 'Add Employee'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={!!deletingEmployee}
        onCancel={() => setDeletingEmployee(null)}
        onConfirm={() => deletingEmployee && handleDeleteEmployee(deletingEmployee)}
        title="Delete Employee"
        description="Are you sure you want to delete this employee? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default EmployeeManagement;
