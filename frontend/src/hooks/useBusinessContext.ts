import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { chatbotDataService } from '../utils/chatbotDataService';

export interface BusinessContext {
  businessId?: string;
  businessName?: string;
  services?: string[];
  availableTimes?: string[];
}

export const useBusinessContext = (): BusinessContext => {
  const [context, setContext] = useState<BusinessContext>({});
  const location = useLocation();

  useEffect(() => {
    const loadBusinessContext = async () => {
      try {
        // Try to get business context from URL params, local storage, or other sources
        const searchParams = new URLSearchParams(location.search);
        const businessIdFromUrl = searchParams.get('businessId');
        
        // Check if we're on a business-specific page
        let businessId = businessIdFromUrl;
        
        // You can add more logic here to detect business context
        // For example, from user's last booking, or from the current business owner
        
        if (!businessId) {
          // If no specific business, get all businesses for general context
          const dbContext = await chatbotDataService.getChatbotContext();
          
          if (dbContext.businesses.length === 1) {
            // If only one business exists, use it as default
            const business = dbContext.businesses[0];
            setContext({
              businessId: business.id,
              businessName: business.name,
              services: business.services?.map(s => s.name) || [],
              availableTimes: [] // Will be loaded dynamically when needed
            });
          } else if (dbContext.businesses.length > 0) {
            // Multiple businesses - provide general context
            setContext({
              businessName: 'our businesses',
              services: dbContext.allServices.map(s => s.name),
              availableTimes: []
            });
          }
        } else {
          // Load specific business context
          const dbContext = await chatbotDataService.getChatbotContext(businessId);
          const business = dbContext.businesses[0];
          
          if (business) {
            setContext({
              businessId: business.id,
              businessName: business.name,
              services: business.services?.map(s => s.name) || [],
              availableTimes: dbContext.availableSlots
                .filter(s => s.available)
                .map(s => s.time)
            });
          }
        }
      } catch (error) {
        console.error('Error loading business context:', error);
        setContext({
          businessName: 'appointment booking',
          services: [],
          availableTimes: []
        });
      }
    };

    loadBusinessContext();
  }, [location]);

  return context;
};
