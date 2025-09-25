# Review System Setup Guide

This guide will help you set up the review system that allows customers to write reviews and displays the top 3 reviews on your homepage.

## 🗄️ Database Setup

**IMPORTANT: You need to run this SQL script on your Supabase database to create the reviews table.**

```sql
-- Create reviews table for customer reviews
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_featured BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_appointment_id ON reviews(appointment_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_is_featured ON reviews(is_featured);
CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);

-- Insert some sample reviews for testing (optional)
INSERT INTO reviews (customer_name, customer_email, customer_id, business_id, rating, title, content) VALUES
('Sarah Johnson', 'sarah@example.com', (SELECT id FROM customers LIMIT 1), '550e8400-e29b-41d4-a716-446655440000', 5, 'Excellent Service!', 'This platform transformed how we manage appointments. Our clients love the easy booking process!'),
('Mike Chen', 'mike@example.com', (SELECT id FROM customers LIMIT 1), '550e8400-e29b-41d4-a716-446655440000', 5, 'Time Saver', 'The automated reminders and calendar integration saved us hours every week.'),
('Emily Rodriguez', 'emily@example.com', (SELECT id FROM customers LIMIT 1), '550e8400-e29b-41d4-a716-446655440000', 5, 'Highly Recommended', 'Professional, reliable, and incredibly user-friendly. Highly recommended!');
```

## 🚀 Features Added

### 1. Review Form Component (`/src/components/shared/ReviewForm.tsx`)
- ⭐ Star rating system (1-5 stars)
- 📝 Review title and detailed content
- 👤 Customer name and email capture
- ✅ Form validation
- 🔄 Auto-creates customer records if needed
- 📧 Success/error notifications

### 2. Review Page (`/src/pages/ReviewPage.tsx`)
- 🎯 Dedicated page for writing reviews at `/review`
- 🎨 Beautiful UI with benefits section
- 🔗 Supports URL parameters for pre-filling data:
  - `?businessId=abc123`
  - `?appointmentId=def456`
  - `?customerId=ghi789`
  - `?customerName=John Doe`
  - `?customerEmail=john@example.com`

### 3. Updated Homepage (`/src/pages/HomePage.tsx`)
- 🏆 Displays top 3 highest-rated reviews dynamically
- 📊 Sorts by rating (highest first) then by date (newest first)
- 💫 Falls back to static testimonials if no reviews exist
- ➕ "Write a Review" button to encourage feedback

### 4. Enhanced App Context (`/src/context/AppContext.tsx`)
- 📦 Added review management functions:
  - `addReview()` - Add new review
  - `getTopReviews(limit)` - Get top reviews
  - `getReviewsByBusinessId()` - Get reviews for specific business
- 🔄 Auto-fetches approved reviews on app load

## 🎯 How to Use

### For Customers to Write Reviews:
1. Navigate to `/review` 
2. Fill out the review form with rating, title, and content
3. Submit the review

### For Pre-filled Review Forms:
Use URL parameters to pre-fill customer data:
```
/review?businessId=abc123&customerName=John Doe&customerEmail=john@example.com
```

### For Businesses to Display Reviews:
Reviews automatically appear on the homepage testimonials section, showing the top 3 highest-rated reviews.

## 🔧 Customization Options

### Review Moderation
- Set `is_approved: false` in database for manual review approval
- Use `is_featured: true` to manually feature specific reviews

### Review Display
- Change the number of reviews shown by modifying `getTopReviews(3)` in HomePage.tsx
- Customize the fallback testimonials in HomePage.tsx

### Form Styling
- Modify ReviewForm.tsx for different styling
- Add additional fields if needed

## 🧪 Testing

1. **Create the database table** using the SQL above
2. **Navigate to `/review`** in your app
3. **Submit a test review** with 5 stars
4. **Check the homepage** - your review should appear in the testimonials section
5. **Test with URL parameters** like `/review?customerName=Test User`

## 🎉 Success!

You now have a complete review system where:
- ✅ Customers can easily write and submit reviews
- ✅ Reviews are stored securely in your database
- ✅ Top 3 reviews automatically display on your homepage
- ✅ The system handles customer creation automatically
- ✅ Beautiful, responsive UI that matches your app's design

Your customers can now share their experiences and help build trust with potential new customers!
