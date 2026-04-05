import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

const TermsOfService: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-surface via-white to-surface">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center text-primary hover:text-accent transition-colors mb-6">
            <ArrowLeft size={20} className="mr-2" />
            {t('terms.backToHome')}
          </Link>
          
          <h1 className="text-4xl font-bold text-navy-900 mb-4">{t('terms.title')}</h1>
          <p className="text-muted mb-8">{t('terms.lastUpdated')}: April 5, 2026</p>

          <div className="bg-white rounded-2xl shadow-ghost-lg border border-gray-100 p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">1. Acceptance of Terms</h2>
              <p className="text-navy-800 leading-relaxed">
                By accessing and using Appointly-ks ("Service," "Platform," "we," "us," or "our"), you accept and agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Service. These Terms apply to all visitors, users, and others who access or use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">2. Description of Service</h2>
              <p className="text-navy-800 leading-relaxed">
                Appointly-ks is an appointment booking platform that enables businesses in Kosovo to manage appointments, employees, and services while allowing customers to book appointments online. Our Service includes:
              </p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4 mt-3">
                <li>Business dashboard for managing appointments, services, and employees</li>
                <li>Online appointment scheduling and calendar management</li>
                <li>Email and SMS notifications for appointment confirmations and reminders</li>
                <li>Optional Google Calendar synchronization</li>
                <li>Customer booking interface with service selection</li>
                <li>Business analytics and reporting features</li>
                <li>Review and rating system</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">3. User Accounts</h2>
              
              <h3 className="text-xl font-semibold text-navy-800 mb-2">Registration</h3>
              <p className="text-navy-800 mb-3 leading-relaxed">
                To use certain features, you must register for an account. You agree to:
              </p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Verify your email address to activate your account</li>
                <li>Maintain and update your information to keep it accurate</li>
                <li>Maintain the security of your password and account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Be responsible for all activities under your account</li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-800 mb-2 mt-6">Account Types</h3>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                <li><strong>Business Accounts:</strong> For businesses offering appointment-based services. Includes access to dashboard, employee management, service configuration, and analytics.</li>
                <li><strong>Guest Booking:</strong> Customers can book appointments without creating an account by providing contact information.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">4. Service Plans and Pricing</h2>
              <p className="text-navy-800 mb-3 leading-relaxed">
                Appointly-ks offers the following service plans:
              </p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                <li><strong>Free Plan:</strong> Basic appointment scheduling with limited features, up to 50 appointments per month and 2 employees</li>
                <li><strong>Starter Plan (€9.99/month):</strong> Unlimited appointments, up to 5 employees, email reminders, and basic analytics</li>
                <li><strong>Professional Plan (€24.99/month):</strong> All features including unlimited employees, SMS reminders, advanced analytics, priority support, and custom branding</li>
              </ul>
              <p className="text-navy-800 mt-3 leading-relaxed">
                <strong>Note:</strong> Paid plans are currently under development. All users currently have access to free tier features. We will notify registered users when paid features become available.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">5. Acceptable Use Policy</h2>
              <p className="text-navy-800 mb-3 leading-relaxed">You agree NOT to:</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                <li>Use the Service for any illegal or unauthorized purpose</li>
                <li>Violate any laws in your jurisdiction, including Kosovo law</li>
                <li>Infringe on intellectual property rights</li>
                <li>Transmit harmful code, viruses, or malware</li>
                <li>Interfere with or disrupt the Service or its servers</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Create fake or misleading business profiles</li>
                <li>Book fake appointments or abuse the booking system</li>
                <li>Use automated systems to access the Service excessively</li>
                <li>Scrape, copy, or reproduce content without permission</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">6. Appointments and Bookings</h2>
              
              <h3 className="text-xl font-semibold text-navy-800 mb-2">For Businesses</h3>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                <li>You are responsible for maintaining accurate availability and working hours</li>
                <li>You must honor confirmed appointments or provide reasonable notice of cancellation</li>
                <li>You must provide accurate service descriptions, durations, and pricing</li>
                <li>You are responsible for the quality of services provided to customers</li>
                <li>You must respond to customer inquiries in a timely manner</li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-800 mb-2 mt-6">For Customers</h3>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                <li>You must provide accurate contact information when booking</li>
                <li>You must arrive on time for appointments</li>
                <li>You may cancel appointments within one hour of booking through the provided cancellation link</li>
                <li>You agree to the business's individual cancellation and service policies</li>
                <li>You are responsible for any fees charged by the business for services rendered</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">7. Third-Party Integrations</h2>
              <p className="text-navy-800 mb-3 leading-relaxed">
                Our Service integrates with third-party services. By using these integrations, you agree to their respective terms:
              </p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                <li><strong>Google Calendar:</strong> When you connect your Google account, you authorize us to create, read, and update calendar events on your behalf</li>
                <li><strong>SMS Notifications:</strong> By providing a phone number, you consent to receive appointment-related SMS messages via Twilio</li>
                <li><strong>Email Communications:</strong> You will receive transactional emails related to your account and appointments</li>
              </ul>
              <p className="text-navy-800 mt-3 leading-relaxed">
                You may disconnect Google Calendar integration at any time through your account settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">8. Intellectual Property</h2>
              <p className="text-navy-800 mb-3 leading-relaxed">
                The Service, including all content, features, and functionality, is owned by Appointly-ks and is protected by international copyright, trademark, and other intellectual property laws.
              </p>
              <p className="text-navy-800 leading-relaxed">
                You retain ownership of content you create or upload (such as business logos, service descriptions, and profile information), but grant us a non-exclusive, worldwide license to use, store, and display it as necessary to provide the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">9. Privacy and Data Protection</h2>
              <p className="text-navy-800 leading-relaxed">
                Your privacy is important to us. Our collection and use of personal information is described in our <Link to="/privacy-policy" className="text-primary hover:text-accent">Privacy Policy</Link>. By using the Service, you consent to our data practices as described in the Privacy Policy and <Link to="/cookie-policy" className="text-primary hover:text-accent">Cookie Policy</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">10. Disclaimers and Limitations of Liability</h2>
              
              <h3 className="text-xl font-semibold text-navy-800 mb-2">Service "As Is"</h3>
              <p className="text-navy-800 mb-3 leading-relaxed">
                The Service is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
              </p>
              
              <h3 className="text-xl font-semibold text-navy-800 mb-2">Platform Role</h3>
              <p className="text-navy-800 mb-3 leading-relaxed">
                Appointly-ks is a platform that connects businesses with customers. We are not responsible for:
              </p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                <li>The quality of services provided by businesses</li>
                <li>Disputes between businesses and customers</li>
                <li>Business cancellations or no-shows</li>
                <li>Accuracy of business information provided by users</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-navy-800 mb-2 mt-4">Limitation of Liability</h3>
              <p className="text-navy-800 leading-relaxed">
                To the maximum extent permitted by law, Appointly-ks shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenues, data, or goodwill resulting from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">11. Indemnification</h2>
              <p className="text-navy-800 leading-relaxed">
                You agree to indemnify, defend, and hold harmless Appointly-ks and its officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses arising from your use of the Service, your violation of these Terms, or your violation of any rights of another.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">12. Termination</h2>
              <p className="text-navy-800 mb-3 leading-relaxed">
                We may terminate or suspend your account and access to the Service immediately, without prior notice, for:
              </p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                <li>Violation of these Terms</li>
                <li>Fraudulent or illegal activity</li>
                <li>Abuse of the booking system</li>
                <li>At our discretion for any reason with reasonable notice</li>
              </ul>
              <p className="text-navy-800 mt-3 leading-relaxed">
                You may cancel your account at any time by contacting us. Upon termination, your right to use the Service will immediately cease.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">13. Changes to Terms</h2>
              <p className="text-navy-800 leading-relaxed">
                We reserve the right to modify these Terms at any time. We will provide notice of material changes by posting the updated Terms on the Service and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">14. Governing Law</h2>
              <p className="text-navy-800 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the Republic of Kosovo, without regard to its conflict of law provisions. Any disputes arising from these Terms or your use of the Service shall be resolved in the courts of Prishtina, Kosovo.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">15. Contact Information</h2>
              <p className="text-navy-800 leading-relaxed">
                For questions about these Terms of Service, please contact us:
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

export default TermsOfService;
