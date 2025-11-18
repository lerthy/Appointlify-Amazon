import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center text-purple-600 hover:text-purple-800 mb-6">
          <ArrowLeft size={20} className="mr-2" />
          Back to Home
        </Link>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
        <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="bg-white rounded-lg shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-700">
              By accessing and using Appointly-ks ("Service," "Platform," "we," "us," or "our"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p className="text-gray-700">
              Appointly-ks is an AI-powered appointment booking SaaS platform that enables businesses to manage appointments, employees, and services while allowing customers to book appointments online. Our Service includes:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mt-2">
              <li>Business dashboard and management tools</li>
              <li>Employee and service management</li>
              <li>Appointment scheduling and notifications</li>
              <li>AI-powered chat assistance</li>
              <li>Analytics and reporting features</li>
              <li>Customer booking interface</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">3. User Accounts</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Registration</h3>
            <p className="text-gray-700 mb-3">
              To use certain features, you must register for an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and update your information to keep it accurate</li>
              <li>Maintain the security of your password and account</li>
              <li>Notify us immediately of any unauthorized use</li>
              <li>Be responsible for all activities under your account</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">Account Types</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Business Accounts:</strong> For businesses offering appointment-based services</li>
              <li><strong>Customer Accounts:</strong> For individuals booking appointments</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">4. Acceptable Use Policy</h2>
            <p className="text-gray-700 mb-3">You agree NOT to:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Violate any laws in your jurisdiction</li>
              <li>Infringe on intellectual property rights</li>
              <li>Transmit harmful code, viruses, or malware</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Scrape, copy, or reproduce content without permission</li>
              <li>Create fake or misleading appointments</li>
              <li>Use automated systems to access the Service excessively</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">5. Appointments and Bookings</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">For Businesses</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>You are responsible for managing your calendar and availability</li>
              <li>You must honor confirmed appointments or provide reasonable notice of cancellation</li>
              <li>You must provide accurate service descriptions and pricing</li>
              <li>You are responsible for the quality of services provided</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">For Customers</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>You must provide accurate information when booking</li>
              <li>You must arrive on time or provide notice of cancellation</li>
              <li>You agree to the business's cancellation and refund policies</li>
              <li>You are responsible for any fees or charges incurred</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">6. Payment Terms</h2>
            <p className="text-gray-700 mb-3">
              For business accounts:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Subscription fees are billed according to your selected plan</li>
              <li>All fees are non-refundable except as required by law</li>
              <li>We may change pricing with 30 days' notice</li>
              <li>Payment processing is handled by third-party providers</li>
              <li>You authorize us to charge your payment method on file</li>
              <li>Late payments may result in service suspension</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">7. Intellectual Property</h2>
            <p className="text-gray-700 mb-3">
              The Service, including all content, features, and functionality, is owned by Appointly-ks and is protected by international copyright, trademark, and other intellectual property laws.
            </p>
            <p className="text-gray-700">
              You retain ownership of content you create or upload, but grant us a license to use, store, and display it as necessary to provide the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">8. Privacy and Data Protection</h2>
            <p className="text-gray-700">
              Your privacy is important to us. Our collection and use of personal information is described in our <Link to="/privacy-policy" className="text-purple-600 hover:text-purple-800">Privacy Policy</Link>. By using the Service, you consent to our data practices as described in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">9. Disclaimers and Limitations of Liability</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Service "As Is"</h3>
            <p className="text-gray-700 mb-3">
              The Service is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
            </p>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Limitation of Liability</h3>
            <p className="text-gray-700">
              To the maximum extent permitted by law, Appointly-ks shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">10. Indemnification</h2>
            <p className="text-gray-700">
              You agree to indemnify, defend, and hold harmless Appointly-ks and its officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses arising from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">11. Termination</h2>
            <p className="text-gray-700 mb-3">
              We may terminate or suspend your account and access to the Service immediately, without prior notice, for:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Violation of these Terms</li>
              <li>Fraudulent or illegal activity</li>
              <li>Non-payment of fees</li>
              <li>At our discretion for any reason</li>
            </ul>
            <p className="text-gray-700 mt-3">
              You may cancel your account at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">12. Changes to Terms</h2>
            <p className="text-gray-700">
              We reserve the right to modify these Terms at any time. We will provide notice of material changes by posting the updated Terms on the Service and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">13. Governing Law</h2>
            <p className="text-gray-700">
              These Terms shall be governed by and construed in accordance with the laws of Kosovo, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of Prishtina, Kosovo.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">14. Contact Information</h2>
            <p className="text-gray-700">
              For questions about these Terms of Service, please contact us:
            </p>
            <div className="mt-3 text-gray-700">
              <p><strong>Email:</strong> <a href="mailto:support@appointly-ks.com" className="text-purple-600 hover:text-purple-800">support@appointly-ks.com</a></p>
              <p><strong>Phone:</strong> +1 (555) 123-4567</p>
              <p><strong>Address:</strong> Prishtina, 501601, Kosovo</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;


















