import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

const CookiePolicy: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-surface via-white to-surface">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center text-primary hover:text-accent transition-colors mb-6">
            <ArrowLeft size={20} className="mr-2" />
            {t('cookies.backToHome')}
          </Link>
          
          <h1 className="text-4xl font-bold text-navy-900 mb-4">{t('cookies.title')}</h1>
          <p className="text-muted mb-8">{t('cookies.lastUpdated')}: April 5, 2026</p>

          <div className="bg-white rounded-2xl shadow-ghost-lg border border-gray-100 p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">1. What Are Cookies and Local Storage?</h2>
              <p className="text-navy-800 leading-relaxed">
                Cookies are small text files stored on your device when you visit websites. Local storage is a similar technology that allows websites to store data in your browser. Appointly-ks primarily uses local storage (not traditional cookies) to enhance your experience and provide essential functionality.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">2. What We Store in Your Browser</h2>
              <p className="text-navy-800 mb-4 leading-relaxed">
                We store the following data locally in your browser:
              </p>
              
              <div className="bg-surface p-5 rounded-xl border border-gray-100 mb-4">
                <h3 className="text-lg font-semibold text-navy-800 mb-3">Essential Storage (Required)</h3>
                <p className="text-navy-800 mb-3 text-sm leading-relaxed">
                  These are necessary for the platform to function properly. You cannot opt-out of these as they are required for basic functionality.
                </p>
                <ul className="list-disc list-inside text-navy-800 space-y-2 ml-2">
                  <li>
                    <strong>Authentication Session (Supabase Auth)</strong>
                    <p className="text-muted text-sm ml-6 mt-1">Keeps you logged in and maintains your session security. Managed by Supabase authentication system using secure tokens.</p>
                  </li>
                  <li>
                    <strong>User Profile Data</strong>
                    <p className="text-muted text-sm ml-6 mt-1">Caches your profile information locally for faster page loads. Key: <code className="bg-gray-100 px-1 rounded">user</code></p>
                  </li>
                </ul>
              </div>

              <div className="bg-surface p-5 rounded-xl border border-gray-100">
                <h3 className="text-lg font-semibold text-navy-800 mb-3">Preference Storage</h3>
                <p className="text-navy-800 mb-3 text-sm leading-relaxed">
                  These remember your preferences and settings.
                </p>
                <ul className="list-disc list-inside text-navy-800 space-y-2 ml-2">
                  <li>
                    <strong>Language Preference</strong>
                    <p className="text-muted text-sm ml-6 mt-1">Remembers your selected language (English or Albanian). Key: <code className="bg-gray-100 px-1 rounded">i18nextLng</code></p>
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">3. Third-Party Services</h2>
              <p className="text-navy-800 mb-4 leading-relaxed">
                The following third-party services may set their own cookies or store data when you use our platform:
              </p>
              
              <div className="space-y-4">
                <div className="bg-surface p-4 rounded-xl border border-gray-100">
                  <h4 className="font-semibold text-navy-800 mb-2">Supabase</h4>
                  <p className="text-muted text-sm leading-relaxed">
                    Our authentication and database provider. Supabase stores authentication tokens securely in local storage to maintain your login session.
                  </p>
                </div>

                <div className="bg-surface p-4 rounded-xl border border-gray-100">
                  <h4 className="font-semibold text-navy-800 mb-2">Google Services (Optional)</h4>
                  <p className="text-muted text-sm leading-relaxed">
                    If you connect your Google account for calendar synchronization, Google may set cookies for authentication purposes. Additionally, Google Maps embeds may set cookies when viewing business locations.
                  </p>
                </div>

                <div className="bg-surface p-4 rounded-xl border border-gray-100">
                  <h4 className="font-semibold text-navy-800 mb-2">Netlify</h4>
                  <p className="text-muted text-sm leading-relaxed">
                    Our hosting provider may set cookies for security and performance purposes.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">4. What We Do NOT Use</h2>
              <p className="text-navy-800 mb-3 leading-relaxed">
                To be transparent, we want to clarify that we currently do NOT use:
              </p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                <li>Google Analytics or other website analytics tracking</li>
                <li>Advertising or marketing cookies</li>
                <li>Social media tracking pixels</li>
                <li>Retargeting or behavioral advertising technologies</li>
                <li>Cross-site tracking cookies</li>
              </ul>
              <p className="text-navy-800 mt-3 leading-relaxed">
                If we add any of these services in the future, we will update this policy and provide appropriate notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">5. Storage Duration</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-navy-800 mb-2">Session Data</h3>
                  <p className="text-navy-800 leading-relaxed">
                    Authentication tokens are refreshed automatically and persist until you log out or clear your browser data. Supabase sessions have configurable expiration times for security.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-navy-800 mb-2">Preference Data</h3>
                  <p className="text-navy-800 leading-relaxed">
                    Language preferences persist indefinitely until you change them or clear your browser's local storage.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">6. Managing Your Browser Storage</h2>
              
              <h3 className="text-lg font-semibold text-navy-800 mb-2">Clearing Local Storage</h3>
              <p className="text-navy-800 mb-4 leading-relaxed">
                You can clear the data we store by:
              </p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4 mb-4">
                <li>Logging out of your account (clears session data)</li>
                <li>Using your browser's "Clear Site Data" feature</li>
                <li>Clearing your browser's local storage through developer tools</li>
              </ul>

              <h3 className="text-lg font-semibold text-navy-800 mb-2">Browser Settings</h3>
              <p className="text-navy-800 mb-3 leading-relaxed">
                To manage local storage and cookies in your browser:
              </p>
              <div className="bg-surface p-4 rounded-xl border border-gray-100">
                <ul className="list-disc list-inside text-navy-800 space-y-2 text-sm">
                  <li><strong>Chrome:</strong> Settings → Privacy and security → Site Settings → View permissions and data stored across sites</li>
                  <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data → Manage Data</li>
                  <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
                  <li><strong>Edge:</strong> Settings → Cookies and site permissions → Manage and delete cookies and site data</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">7. Impact of Clearing Storage</h2>
              <p className="text-navy-800 mb-3 leading-relaxed">
                If you clear your browser's local storage for our site:
              </p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                <li>You will be logged out and need to sign in again</li>
                <li>Your language preference will reset to the default</li>
                <li>You will need to reconnect any Google Calendar integration</li>
              </ul>
              <p className="text-navy-800 mt-3 leading-relaxed">
                Your account data, appointments, and business information are stored on our servers and will not be affected by clearing browser storage.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">8. Updates to This Policy</h2>
              <p className="text-navy-800 leading-relaxed">
                We may update this Cookie Policy when we add new features or third-party integrations. We will update the "Last updated" date at the top of this page. We encourage you to review this policy periodically.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">9. More Information</h2>
              <p className="text-navy-800 leading-relaxed">
                For more information about how we handle your personal data, please review our <Link to="/privacy-policy" className="text-primary hover:text-accent">Privacy Policy</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">10. Contact Us</h2>
              <p className="text-navy-800 leading-relaxed">
                If you have any questions about our use of cookies and local storage, please contact us:
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

export default CookiePolicy;
