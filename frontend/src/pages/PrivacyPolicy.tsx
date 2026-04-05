import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

const PrivacyPolicy: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-surface via-white to-surface">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center text-primary hover:text-accent transition-colors mb-6">
            <ArrowLeft size={20} className="mr-2" />
            {t('privacy.backToHome')}
          </Link>
          
          <h1 className="text-4xl font-bold text-navy-900 mb-4">{t('privacy.title')}</h1>
          <p className="text-muted mb-8">{t('privacy.lastUpdated')}: April 5, 2026</p>

          <div className="bg-white rounded-2xl shadow-ghost-lg border border-gray-100 p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">1. Introduction</h2>
              <p className="text-navy-800 leading-relaxed">
                Welcome to Appointly-ks ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our appointment booking platform operating in Kosovo.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-navy-800 mb-2">Personal Information for Business Accounts</h3>
              <p className="text-navy-800 mb-3 leading-relaxed">
                When you register a business account, we collect:
              </p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                <li>Business name, owner name, and contact information (email, phone)</li>
                <li>Business description and category</li>
                <li>Business address (for map display purposes)</li>
                <li>Business logo (stored in our secure cloud storage)</li>
                <li>Account credentials (email and securely hashed password)</li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-800 mb-2 mt-6">Employee Information</h3>
              <p className="text-navy-800 mb-3 leading-relaxed">
                Business accounts may add employee data including:
              </p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                <li>Employee name, email, phone, and role</li>
                <li>Working hours and schedules</li>
                <li>Profile photos</li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-800 mb-2 mt-6">Customer Information</h3>
              <p className="text-navy-800 mb-3 leading-relaxed">
                When customers book appointments, we collect:
              </p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                <li>Name, email address, and phone number</li>
                <li>Appointment details (date, time, service, notes)</li>
                <li>Communication preferences</li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-800 mb-2 mt-6">Google Account Information (Optional)</h3>
              <p className="text-navy-800 mb-3 leading-relaxed">
                If you choose to connect your Google account for calendar synchronization, we collect:
              </p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                <li>Google account identifier and email</li>
                <li>OAuth access and refresh tokens (securely stored)</li>
                <li>Calendar access permissions you grant</li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-800 mb-2 mt-6">Automatically Collected Information</h3>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                <li>Browser type and device information</li>
                <li>Language preferences</li>
                <li>Session data for authentication purposes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">3. How We Use Your Information</h2>
              <p className="text-navy-800 mb-3 leading-relaxed">We use the information we collect to:</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                <li>Provide, maintain, and improve our appointment booking services</li>
                <li>Process appointment bookings and send confirmation emails</li>
                <li>Send SMS notifications for appointment confirmations and reminders (via Twilio)</li>
                <li>Synchronize appointments with Google Calendar (when enabled)</li>
                <li>Enable business dashboard analytics and reporting</li>
                <li>Provide customer support and respond to inquiries</li>
                <li>Send password reset and email verification communications</li>
                <li>Display business location on maps (using Google Maps)</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">4. Third-Party Services</h2>
              <p className="text-navy-800 mb-3 leading-relaxed">We use the following third-party services to operate our platform:</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                <li><strong>Supabase:</strong> Database hosting, user authentication, and file storage</li>
                <li><strong>Twilio:</strong> SMS notifications for appointment confirmations and reminders</li>
                <li><strong>Gmail/SMTP:</strong> Transactional email delivery (confirmations, password resets)</li>
                <li><strong>Google OAuth:</strong> Optional sign-in and calendar integration</li>
                <li><strong>Google Maps:</strong> Business address display and location services</li>
                <li><strong>Netlify:</strong> Application hosting and serverless functions</li>
              </ul>
              <p className="text-navy-800 mt-3 leading-relaxed">
                Each of these services has their own privacy policies. We recommend reviewing them for more information about their data practices.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">5. Information Sharing and Disclosure</h2>
              <p className="text-navy-800 mb-3 leading-relaxed">We may share your information with:</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                <li><strong>Service Providers:</strong> Third-party companies that help us operate our platform (as listed above)</li>
                <li><strong>Business-Customer Relationship:</strong> Customer information is shared with the business they book appointments with</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              </ul>
              <p className="text-navy-800 mt-3 font-medium">
                We do not sell your personal information to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">6. Data Storage and Security</h2>
              <p className="text-navy-800 leading-relaxed">
                Your data is stored securely using Supabase's infrastructure. We implement appropriate technical and organizational security measures including:
              </p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4 mt-3">
                <li>Encrypted data transmission (HTTPS/TLS)</li>
                <li>Secure password hashing</li>
                <li>OAuth 2.0 PKCE flow for authentication</li>
                <li>Row-level security policies on database tables</li>
                <li>Secure token storage for third-party integrations</li>
              </ul>
              <p className="text-navy-800 mt-3 leading-relaxed">
                However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">7. Local Storage and Browser Data</h2>
              <p className="text-navy-800 leading-relaxed">
                We store the following data in your browser's local storage:
              </p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4 mt-3">
                <li><strong>Authentication Session:</strong> Your login session data (managed by Supabase)</li>
                <li><strong>User Profile:</strong> Cached profile information for faster page loads</li>
                <li><strong>Language Preference:</strong> Your selected language (English or Albanian)</li>
              </ul>
              <p className="text-navy-800 mt-3 leading-relaxed">
                For more details, please see our <Link to="/cookie-policy" className="text-primary hover:text-accent">Cookie Policy</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">8. Your Rights and Choices</h2>
              <p className="text-navy-800 mb-3 leading-relaxed">You have the right to:</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                <li>Access and receive a copy of your personal information</li>
                <li>Correct or update your information through your profile settings</li>
                <li>Delete your account and personal information</li>
                <li>Disconnect Google Calendar integration at any time</li>
                <li>Opt-out of SMS notifications</li>
                <li>Clear browser storage through your browser settings</li>
              </ul>
              <p className="text-navy-800 mt-3 leading-relaxed">
                To exercise these rights, please contact us at <a href="mailto:support@appointly-ks.com" className="text-primary hover:text-accent">support@appointly-ks.com</a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">9. Data Retention</h2>
              <p className="text-navy-800 leading-relaxed">
                We retain your personal information for as long as necessary to provide our services and comply with legal obligations. Appointment records are retained for business reporting purposes. When you delete your account, we will delete or anonymize your information within 30 days, except where retention is required by law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">10. Children's Privacy</h2>
              <p className="text-navy-800 leading-relaxed">
                Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">11. Changes to This Privacy Policy</h2>
              <p className="text-navy-800 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">12. Contact Us</h2>
              <p className="text-navy-800 leading-relaxed">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us:
              </p>
              <div className="mt-4 p-4 bg-surface rounded-xl border border-gray-100">
                <p className="text-navy-800"><strong>Email:</strong> <a href="mailto:support@appointly-ks.com" className="text-primary hover:text-accent">support@appointly-ks.com</a></p>
                <p className="text-navy-800 mt-1"><strong>Address:</strong> Prishtina, Kosovo</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
