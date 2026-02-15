import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const CookiePolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center text-primary hover:text-primary-light mb-6">
          <ArrowLeft size={20} className="mr-2" />
          Back to Home
        </Link>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Cookie Policy</h1>
        <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="bg-white rounded-lg shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">1. What Are Cookies?</h2>
            <p className="text-gray-700">
              Cookies are small text files that are placed on your device (computer, smartphone, or tablet) when you visit our website. They are widely used to make websites work more efficiently and provide information to the owners of the site. Appointly-ks uses cookies to enhance your experience and improve our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">2. How We Use Cookies</h2>
            <p className="text-gray-700 mb-3">
              We use cookies for several important reasons:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>To keep you signed in to your account</li>
              <li>To remember your preferences and settings</li>
              <li>To understand how you use our platform</li>
              <li>To improve the performance and functionality of our services</li>
              <li>To provide personalized content and recommendations</li>
              <li>To analyze traffic and user behavior</li>
              <li>To enhance security and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">3. Types of Cookies We Use</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Essential Cookies</h3>
            <p className="text-gray-700 mb-3">
              These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and accessibility. You cannot opt-out of these cookies.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
                <li><strong>Session Cookies:</strong> Keep you logged in during your visit</li>
                <li><strong>Authentication Cookies:</strong> Verify your identity and access rights</li>
                <li><strong>Security Cookies:</strong> Protect against fraudulent activity</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-2">Performance and Analytics Cookies</h3>
            <p className="text-gray-700 mb-3">
              These cookies collect information about how visitors use our website, such as which pages are visited most often and if error messages are received. This helps us improve how our website works.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
                <li><strong>Google Analytics:</strong> Tracks website usage and generates statistics</li>
                <li><strong>Performance Monitoring:</strong> Identifies technical issues and errors</li>
                <li><strong>Usage Tracking:</strong> Analyzes feature adoption and user behavior</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-2">Functionality Cookies</h3>
            <p className="text-gray-700 mb-3">
              These cookies allow our website to remember choices you make and provide enhanced, personalized features.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                <li><strong>Language Cookies:</strong> Store your language selection</li>
                <li><strong>Display Cookies:</strong> Remember your display preferences (theme, layout)</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-2">Targeting and Advertising Cookies</h3>
            <p className="text-gray-700 mb-3">
              These cookies may be set through our site by our advertising partners to build a profile of your interests and show you relevant content.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
                <li><strong>Marketing Cookies:</strong> Track your visits across websites</li>
                <li><strong>Social Media Cookies:</strong> Enable sharing on social platforms</li>
                <li><strong>Retargeting Cookies:</strong> Show relevant ads on other websites</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">4. Third-Party Cookies</h2>
            <p className="text-gray-700 mb-3">
              We may use third-party services that set their own cookies. These services include:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Google Analytics:</strong> For website analytics and insights</li>
              <li><strong>Payment Processors:</strong> For secure payment processing</li>
              <li><strong>Email Services:</strong> For sending transactional emails</li>
              <li><strong>Social Media Platforms:</strong> For social sharing and login features</li>
              <li><strong>AI Services:</strong> For powering our AI chat assistance</li>
            </ul>
            <p className="text-gray-700 mt-3">
              These third parties have their own privacy policies and cookie policies. We recommend reviewing them.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">5. Cookie Duration</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Session Cookies</h3>
            <p className="text-gray-700 mb-3">
              These temporary cookies are deleted when you close your browser. They help maintain your session while browsing our website.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-2">Persistent Cookies</h3>
            <p className="text-gray-700">
              These cookies remain on your device for a set period (ranging from days to years) or until you delete them. They help us recognize you when you return to our website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">6. Managing Your Cookie Preferences</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Browser Settings</h3>
            <p className="text-gray-700 mb-3">
              Most web browsers allow you to control cookies through their settings. You can:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>View what cookies are stored and delete them individually</li>
              <li>Block third-party cookies</li>
              <li>Block cookies from specific websites</li>
              <li>Block all cookies</li>
              <li>Delete all cookies when you close your browser</li>
            </ul>

            <p className="text-gray-700 mt-4 mb-3">
              To manage cookies in popular browsers:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
              <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies and Site Data</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
              <li><strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and data stored</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">Opt-Out Tools</h3>
            <p className="text-gray-700 mb-3">
              You can opt-out of specific tracking services:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Google Analytics: <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-light">Browser Opt-out Add-on</a></li>
              <li>Your Online Choices: <a href="http://www.youronlinechoices.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-light">www.youronlinechoices.com</a></li>
              <li>Network Advertising Initiative: <a href="http://www.networkadvertising.org/choices/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-light">www.networkadvertising.org</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">7. Impact of Disabling Cookies</h2>
            <p className="text-gray-700 mb-3">
              If you choose to disable cookies, some features of our service may not function properly:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>You may not be able to stay signed in</li>
              <li>Your preferences and settings won't be saved</li>
              <li>Some features may become unavailable</li>
              <li>The website may load more slowly</li>
              <li>You may have a less personalized experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">8. Updates to This Cookie Policy</h2>
            <p className="text-gray-700">
              We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our business practices. We will notify you of any significant changes by posting the updated policy on our website and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">9. More Information</h2>
            <p className="text-gray-700 mb-3">
              For more information about how we handle your personal data, please review our <Link to="/privacy-policy" className="text-primary hover:text-primary-light">Privacy Policy</Link>.
            </p>
            <p className="text-gray-700">
              To learn more about cookies in general, visit <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-light">www.allaboutcookies.org</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">10. Contact Us</h2>
            <p className="text-gray-700">
              If you have any questions about our use of cookies, please contact us:
            </p>
            <div className="mt-3 text-gray-700">
              <p><strong>Email:</strong> <a href="mailto:support@appointly-ks.com" className="text-primary hover:text-primary-light">support@appointly-ks.com</a></p>
              <p><strong>Phone:</strong> +1 (555) 123-4567</p>
              <p><strong>Address:</strong> Prishtina, 501601, Kosovo</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;




















