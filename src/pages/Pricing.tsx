import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ArrowLeft } from 'lucide-react';

function Pricing() {
  const plans = [
    {
      name: "Basic",
      price: "2€",
      rate: "/ month",
      offer: "First 3 months free",
      description: "Perfect for passion projects & simple websites.",
      features: [
        "Unlimited API requests",
        "50,000 monthly active users",
        "500 MB database size",
        "5 GB egress",
        "5 GB cached egress",
        "1 GB file storage",
      ],
      button: "Start for Free",
    },
    {
      name: "Pro",
      price: "5€",
      rate: "/ 3 months",
      offer: "First 3 months free",
      description: "For production applications with the power to scale.",
      features: [
        "100,000 monthly active users",
        "8 GB disk size per project",
        "250 GB egress",
        "250 GB cached egress",
      ],
      button: "Upgrade Now",
      highlight: true,
    },
    {
      name: "Team",
      price: "20€",
      rate: "/ year",
      offer: "First 3 months free",
      description: "Add features such as SSO, control over backups, and certifications.",
      features: [
        "SOC2",
        "Project-scoped and read-only access",
        "HIPAA available as paid add-on",
        "SSO for dashboard",
        "Priority email support & SLAs",
        "Daily backups stored for 14 days",
      ],
      button: "Upgrade Now",
    },
  ];

  return (
    <>
        <header className="relative text-center py-10 dark:bg-transparent">
            <div className="absolute left-10 top-10">
                <Button className="flex items-center gap-2 rounded-3xl bg-gray-200 hover:bg-gray-500 dark:bg-gray-800 dark:hover:bg-gray-700 px-4 py-2 hover:scale-105 transition-transform" onClick={() => window.history.back()}>
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
            className={`flex-1 rounded-3xl shadow-xl p-8 flex flex-col justify-between transition-transform transform hover:scale-105 duration-300
                ${plan.highlight
                ? "bg-gradient-to-b from-gray-900 to-gray-800 text-white hover:shadow-2xl border-2"
                : "border-gray-900 hover:shadow-2xl border-2 hover:border-purple-500"
                }`}
            >
            <CardContent className="space-y-6 flex-1 flex flex-col">
                <div className="text-center">
                <h2 className="text-3xl font-extrabold mb-2">{plan.name}</h2>
                <p className={`${plan.highlight ? "text-white" : "text-gray-500 dark:text-black"}`}>
                    {plan.description}
                </p>
                </div>
                <div className='flex flex-col p-0'>
                    <div className='flex flex-row justify-center items-baseline gap-2'>
                        <p className="text-center text-4xl font-bold">{plan.price}</p>
                        <p className={`text-center ${plan.highlight ? "text-white" : "text-gray-800"} font-semibold`}>{plan.rate}</p>
                    </div>

                    <p className={`text-center ${plan.highlight ? "text-gray-300" : "text-gray-500"}`}>{plan.offer}</p>
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
                className={`w-full py-3 text-lg font-semibold rounded-xl transition-colors duration-300 ${
                    plan.highlight
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-gray-900"
                }`}
                >
                {plan.button}
                </Button>
            </div>
            </Card>
        ))}
        </div>
    </>
  );
}

export default Pricing;