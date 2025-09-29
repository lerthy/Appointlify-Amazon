import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useNotification } from '../context/NotificationContext';

function Pricing() {
  const { user } = useAuth();
  const [paidUser, setPaidUser] = useState<{ id: string; payment: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showNotification } = useNotification();

  const navigate = useNavigate();
  const paidPlan: string = paidUser?.payment || 'guest';

  useEffect(() => {
    const checkAuthAndPayment = async () => {
      setIsLoading(true);
      const { data: paidUserData, error } = await supabase
        .from('users')
        .select('id, payment')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching payment status:', error);
        showNotification('Failed to fetch payment status. Please try again.', 'error');
      } else {
        setPaidUser(paidUserData);
      }
      setIsLoading(false);
    };
    checkAuthAndPayment();
  }, [user, showNotification]);

  const handlePlanSelection = (planName: string) => {
    if (paidPlan === planName.toLowerCase()) {
      // Already subscribed to this plan
      showNotification(`You already possess the ${planName} plan.`, 'error');
      return;
    }

    // Different plan → ask confirmation
    const proceed = window.confirm(
      `You are about to change your plan to ${planName}. Do you wish to continue?`
    );
    if (proceed) {
      navigate(`/paymentForm-${planName.toLowerCase()}`, { replace: true });
    }
  };

  const plans = [
    {
      name: "Basic",
      price: "2€",
      rate: "/ month",
      offer: "First 3 months free",
      description: "Perfect for individuals and small businesses starting out.",
      features: [
        "Dashboard access",
        "Up to 5 Employees",
        "Up to 3 Services",
        "Homepage Appointment Widget",
        "Email notifications for bookings",
        "Basic calendar view",
        "Standard customer support"
      ],
      button: "Choose Plan",
    },
    {
      name: "Pro",
      price: "5€",
      rate: "/ 3 months",
      offer: "First 3 months free",
      description: "Ideal for growing businesses needing more features and flexibility.",
      features: [
        "Everything in Basic",
        "Up to 20 employees",
        "Up to 10 services",
        "Optimized SEO tools",
        "Analytics dashboard (appointments, client stats)",
        "SMS reminders for clients",
        "Priority support",
      ],
      button: "Choose Plan",
      highlight: true,
    },
    {
      name: "Team",
      price: "20€",
      rate: "/ year",
      offer: "First 3 months free",
      description: "Best for established businesses requiring advanced features & support.",
      features: [
        "Everything in Pro",
        "Unlimited employees & services",
        "AI powererd analysis & insights",
        "SSO for dashboard",
        "Daily backups (14 days retention)",
        "Priority email support & SLA",
        "Advanced integrations (Google Calendar, Stripe, PayPal)",
      ],
      button: "Choose Plan",
    },
  ];

  return (
    <>
      <header className="relative text-center py-10 dark:bg-transparent">
        <div className="absolute left-10 top-10">
          <Button
            className="flex items-center gap-2 !rounded-3xl bg-gray-200 hover:bg-gray-500 dark:bg-gray-800 dark:hover:bg-gray-700 px-4 py-2 hover:scale-105 transition-transform"
            onClick={() => {
              const lastPath = sessionStorage.getItem('lastNonPaymentPath');
              navigate(lastPath || '/');
            }}
          >
            <ArrowLeft /> Go Back
          </Button>
        </div>
        <h1 className="text-4xl font-bold text-gray-900">Pick Your Plan</h1>
        <p className="text-xl mt-4 text-gray-600 max-w-2xl mx-auto">
          Choose the plan that best fits your needs. Upgrade, downgrade, or cancel anytime.
        </p>
      </header>
      <div className="flex flex-row gap-8 p-10 max-w-7xl mx-auto mt-5 align-center items-stretch">
        {plans.map((plan, index) => (
          <Card
            key={index}
            className={`flex-1 !rounded-3xl shadow-xl p-8 flex flex-col justify-between transition-transform transform hover:scale-105 duration-300
              ${
                plan.highlight
                  ? "bg-gradient-to-b from-gray-900 to-gray-800 text-white hover:shadow-2xl border-2"
                  : "border-gray-900 hover:shadow-2xl border-2 hover:border-purple-500"
              }`}
          >
            <CardContent className="space-y-6 flex-1 flex flex-col">
              <div className="text-center">
                <h2 className="text-3xl font-extrabold mb-2">{plan.name}</h2>
                <p
                  className={`${
                    plan.highlight ? "text-white" : "text-gray-500 dark:text-black"
                  }`}
                >
                  {plan.description}
                </p>
              </div>
              <div className="flex flex-col p-0">
                <div className="flex flex-row justify-center items-baseline gap-2">
                  <p className="text-center text-4xl font-bold">{plan.price}</p>
                  <p
                    className={`text-center ${
                      plan.highlight ? "text-white" : "text-gray-800"
                    } font-semibold`}
                  >
                    {plan.rate}
                  </p>
                </div>

                <p
                  className={`text-center ${
                    plan.highlight ? "text-gray-300" : "text-gray-500"
                  }`}
                >
                  {plan.offer}
                </p>
              </div>
              <ul className="space-y-3 text-sm flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✔</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <div className="mt-6">
              <Button
                className={`w-full py-3 text-lg font-semibold rounded-xl transition-colors duration-300 focus:ring-offset-0 ${
                  plan.highlight
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-indigo-700 hover:to-purple-700 text-white focus:ring-white"
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-gray-900 focus:ring-gray-900"
                }`}
                onClick={() => handlePlanSelection(plan.name)}
              >
                {paidPlan === plan.name.toLowerCase() ? (
                  <span>Current Plan</span>
                ) : (
                  <span>{plan.button}</span>
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

export default Pricing;
