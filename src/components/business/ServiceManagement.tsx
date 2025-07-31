import React, { useState } from 'react';
import { Briefcase, Plus, Edit, Trash2, Clock, DollarSign, FileText } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import AlertDialog from '../ui/AlertDialog';

interface ServiceFormData {
  name: string;
  description: string;
  duration: number;
  price: number;
}

const ServiceManagement: React.FC = () => {
  const { services, addService, updateService, deleteService } = useApp();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [deletingService, setDeletingService] = useState<string | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    duration: 30,
    price: 0
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'duration' || name === 'price' ? parseFloat(value) || 0 : value 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || formData.duration <= 0 || formData.price <= 0) {
      showNotification('Please fill in all required fields with valid values.', 'error');
      return;
    }

    try {
      if (editingService) {
        // Update existing service
        await updateService(editingService, {
          name: formData.name,
          description: formData.description,
          duration: formData.duration,
          price: formData.price
        });
        showNotification('Service updated successfully!', 'success');
        setEditingService(null);
      } else {
        // Add new service
        await addService({
          business_id: user?.id || '',
          name: formData.name,
          description: formData.description,
          duration: formData.duration,
          price: formData.price
        });
        showNotification('Service added successfully!', 'success');
      }

      resetForm();
      setIsAddingService(false);
    } catch (error) {
      console.error('Error saving service:', error);
      showNotification('Failed to save service. Please try again.', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      duration: 30,
      price: 0
    });
  };

  const handleEditService = (serviceId: string) => {
    const service = services.find(svc => svc.id === serviceId);
    if (service) {
      setFormData({
        name: service.name,
        description: service.description,
        duration: service.duration,
        price: service.price
      });
      setEditingService(serviceId);
      setIsAddingService(true);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      await deleteService(serviceId);
      showNotification('Service deleted successfully!', 'success');
      setDeletingService(null);
    } catch (error) {
      console.error('Error deleting service:', error);
      showNotification('Failed to delete service. Please try again.', 'error');
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Services</h2>
          <p className="text-gray-600">Manage your business services and pricing</p>
        </div>
        <Button
          onClick={() => setIsAddingService(true)}
          className="flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Service List */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card key={service.id} className="hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-green-300 group">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center shadow-sm">
                  <Briefcase className="h-6 w-6 text-green-600" />
                </div>
                                  <div className="ml-4">
                    <h3 className="font-semibold text-gray-900 text-lg mb-2">{service.name}</h3>
                    <p className="text-lg font-bold text-green-600">{formatPrice(service.price)}</p>
                  </div>
              </div>
                              <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => handleEditService(service.id)}
                    className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeletingService(service.id)}
                    className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3 text-sm text-gray-600 border-t border-gray-100 pt-6">
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <FileText className="h-4 w-4 mr-3 text-gray-400" />
                  <span className="font-medium line-clamp-2">{service.description}</span>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Clock className="h-4 w-4 mr-3 text-gray-400" />
                  <span className="font-medium">{formatDuration(service.duration)}</span>
                </div>
                <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <DollarSign className="h-4 w-4 mr-3 text-green-500" />
                  <span className="font-bold text-green-700">{formatPrice(service.price)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Service Modal */}
      {isAddingService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl relative">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {editingService ? 'Edit Service' : 'Add New Service'}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    {editingService ? 'Update the service details below' : 'Create a new service for your business'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsAddingService(false);
                    setEditingService(null);
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
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Service Name *
                  </label>
                  <Input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Haircut, Massage, Consultation"
                    className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe what this service includes..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Duration (minutes) *
                    </label>
                    <Input
                      type="number"
                      name="duration"
                      value={formData.duration}
                      onChange={handleInputChange}
                      placeholder="30"
                      min="1"
                      className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-2 bg-gray-50 px-3 py-1.5 rounded">
                      {formatDuration(formData.duration)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Price (USD) *
                    </label>
                    <Input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="25.00"
                      min="0"
                      step="0.01"
                      className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-2 bg-green-50 px-3 py-1.5 rounded text-green-700">
                      {formatPrice(formData.price)}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddingService(false);
                      setEditingService(null);
                      resetForm();
                    }}
                    className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="px-6 py-2 bg-green-600 hover:bg-green-700">
                    {editingService ? 'Update Service' : 'Add Service'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={!!deletingService}
        onCancel={() => setDeletingService(null)}
        onConfirm={() => deletingService && handleDeleteService(deletingService)}
        title="Delete Service"
        description="Are you sure you want to delete this service? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ServiceManagement; // Service management
// Service management
// Service management
