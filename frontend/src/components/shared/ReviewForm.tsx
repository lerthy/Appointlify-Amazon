import React, { useState } from 'react';
import { Star, Send, MessageSquare, User } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Card } from '../ui/Card';
import { supabase } from '../../utils/supabaseClient';
import { useNotification } from '../../context/NotificationContext';

interface ReviewFormProps {
  businessId?: string;
  appointmentId?: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
  isModal?: boolean;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  businessId,
  appointmentId,
  customerId,
  customerName: initialCustomerName = '',
  customerEmail: initialCustomerEmail = '',
  onSubmitSuccess,
  onCancel,
  isModal = false
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [customerEmail, setCustomerEmail] = useState(initialCustomerEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showNotification } = useNotification();

  // If no specific businessId is provided, we'll use a default platform review
  const effectiveBusinessId = businessId || '550e8400-e29b-41d4-a716-446655440000'; // Default business ID for platform reviews

  const handleStarClick = (value: number) => {
    setRating(value);
  };

  const handleStarHover = (value: number) => {
    setHoveredRating(value);
  };

  const handleStarLeave = () => {
    setHoveredRating(0);
  };

  const isFormValid = () => {
    return rating > 0 && title.trim() && content.trim() && customerName.trim() && customerEmail.trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      showNotification('Please fill in all fields and select a rating', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // First, get or create customer
      let customer_id = customerId;
      
      if (!customer_id) {
        // Try to find existing customer by email
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('email', customerEmail.trim())
          .single();

        if (existingCustomer) {
          customer_id = existingCustomer.id;
        } else {
          // Create new customer
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              name: customerName.trim(),
              email: customerEmail.trim(),
              phone: '', // Default empty phone for review-only customers
            })
            .select('id')
            .single();

          if (customerError) {
            throw new Error('Failed to create customer: ' + customerError.message);
          }
          
          customer_id = newCustomer.id;
        }
      }

      // Insert the review with proper business_id
      const { error: reviewError } = await supabase
        .from('reviews')
        .insert({
          customer_id,
          business_id: effectiveBusinessId, // Ensure this is always set
          appointment_id: appointmentId,
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim(),
          rating,
          title: title.trim(),
          content: content.trim(),
          is_approved: true // Auto-approve for now
        });

      if (reviewError) {
        throw new Error('Failed to submit review: ' + reviewError.message);
      }

      showNotification('Thank you for your review! It has been submitted successfully.', 'success');
      
      // Reset form
      setRating(0);
      setTitle('');
      setContent('');
      if (!initialCustomerName) setCustomerName('');
      if (!initialCustomerEmail) setCustomerEmail('');
      
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      showNotification(error instanceof Error ? error.message : 'Failed to submit review', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerClass = isModal 
    ? "p-6" 
    : "max-w-2xl mx-auto p-6";

  return (
    <div className={containerClass}>
      <Card className="p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <MessageSquare className="w-12 h-12 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Share Your Experience</h2>
          <p className="text-gray-600">Your feedback helps us improve our service</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating Section */}
          <div className="text-center">
            <label className="block text-lg font-semibold text-gray-700 mb-4">
              How would you rate your experience?
            </label>
            <div className="flex justify-center space-x-2 mb-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className="focus:outline-none transition-transform duration-150 hover:scale-110"
                  onClick={() => handleStarClick(value)}
                  onMouseEnter={() => handleStarHover(value)}
                  onMouseLeave={handleStarLeave}
                >
                  <Star
                    className={`w-8 h-8 ${
                      value <= (hoveredRating || rating)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-gray-600">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          {/* Customer Info Section */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Your Name
              </label>
              <Input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter your full name"
                required
                disabled={!!initialCustomerName}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <Input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={!!initialCustomerEmail}
              />
            </div>
          </div>

          {/* Review Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review Title
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience in a few words"
              maxLength={100}
              required
            />
            <p className="text-xs text-gray-500 mt-1">{title.length}/100 characters</p>
          </div>

          {/* Review Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Review
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your experience in detail. What did you like? What could be improved?"
              rows={5}
              maxLength={1000}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">{content.length}/1000 characters</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary-light text-white"
              isLoading={isSubmitting}
              disabled={!isFormValid() || isSubmitting}
            >
              {!isSubmitting && (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Review
                </>
              )}
              {isSubmitting && 'Submitting...'}
            </Button>
            
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1 sm:flex-none sm:px-8"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ReviewForm;
