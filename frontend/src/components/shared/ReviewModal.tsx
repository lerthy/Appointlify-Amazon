import React, { useState } from 'react';
import { Star, Send, MessageSquare, User, X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Card } from '../ui/Card';
import { supabase } from '../../utils/supabaseClient';
import { useNotification } from '../../context/NotificationContext';
import { useTranslation } from 'react-i18next';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId?: string;
  appointmentId?: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  onSubmitSuccess?: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  businessId,
  appointmentId,
  customerId,
  customerName: initialCustomerName = '',
  customerEmail: initialCustomerEmail = '',
  onSubmitSuccess
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [customerEmail, setCustomerEmail] = useState(initialCustomerEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showNotification } = useNotification();
  const { t } = useTranslation();

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

  const resetForm = () => {
    setRating(0);
    setTitle('');
    setContent('');
    if (!initialCustomerName) setCustomerName('');
    if (!initialCustomerEmail) setCustomerEmail('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      showNotification(t('reviewForm.fillAllFields'), 'error');
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
            throw new Error(t('reviewForm.failedToCreate') + customerError.message);
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
        throw new Error(t('reviewForm.failedToSubmit') + reviewError.message);
      }

      showNotification(t('reviewForm.successMessage'), 'success');
      
      // Reset form and close modal
      resetForm();
      
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
      
      // Close modal after short delay to show success message
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error submitting review:', error);
      showNotification(error instanceof Error ? error.message : 'Failed to submit review', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="max-w-2xl w-full max-h-screen overflow-y-auto">
        <Card className="relative">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>

          <div className="p-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <MessageSquare className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('reviewForm.title')}</h2>
              <p className="text-gray-600">{t('reviewForm.subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Rating Section */}
              <div className="text-center">
                <label className="block text-lg font-semibold text-gray-700 mb-4">
                  {t('reviewForm.ratingLabel')}
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
                    {rating === 1 && t('reviewForm.ratingLabels.poor')}
                    {rating === 2 && t('reviewForm.ratingLabels.fair')}
                    {rating === 3 && t('reviewForm.ratingLabels.good')}
                    {rating === 4 && t('reviewForm.ratingLabels.veryGood')}
                    {rating === 5 && t('reviewForm.ratingLabels.excellent')}
                  </p>
                )}
              </div>

              {/* Customer Info Section */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    {t('reviewForm.yourName')}
                  </label>
                  <Input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={t('reviewForm.namePlaceholder')}
                    required
                    disabled={!!initialCustomerName || isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('reviewForm.emailAddress')}
                  </label>
                  <Input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder={t('reviewForm.emailPlaceholder')}
                    required
                    disabled={!!initialCustomerEmail || isSubmitting}
                  />
                </div>
              </div>

              {/* Review Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('reviewForm.reviewTitle')}
                </label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('reviewForm.titlePlaceholder')}
                  maxLength={100}
                  required
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-1">{title.length}/100 {t('reviewForm.characters')}</p>
              </div>

              {/* Review Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('reviewForm.yourReview')}
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t('reviewForm.reviewPlaceholder')}
                  rows={5}
                  maxLength={1000}
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">{content.length}/1000 {t('reviewForm.characters')}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary-light text-white"
                  disabled={!isFormValid() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t('reviewForm.submitting')}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {t('reviewForm.submitReview')}
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 sm:flex-none sm:px-8"
                  disabled={isSubmitting}
                >
                  {t('reviewForm.cancel')}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ReviewModal;
