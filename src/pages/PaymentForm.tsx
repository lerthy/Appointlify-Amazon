import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';

function PaymentForm() {
    const navigate = useNavigate();
    const { plan } = window.location.pathname.includes('paymentForm-') ? { plan: window.location.pathname.split('paymentForm-')[1] } : { plan: null };
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');
    const [name, setName] = useState('');
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [paidUser, setPaidUser] = useState<{ payment: string } | null>(null);

    useEffect(() => {
        const checkAuthAndPayment = async () => {
          if (!user || !user.id) {
            navigate('/login');
            return;
          }
          setIsLoading(true);
          const { data: paidUserData, error } = await supabase
            .from('users')
            .select('payment')
            .eq('id', user.id)
            .single();
          if (error) {
            console.error('Error fetching payment status:', error);
          } else {
            setPaidUser(paidUserData);
            // Optional: If already paid and not guest, navigate away
            if (paidUserData.payment !== 'guest') {
              navigate('/dashboard');
            }
          }
          setIsLoading(false);
        };
        checkAuthAndPayment();
      }, [user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Handle payment processing logic here (simulated)
        console.log('Payment submitted:', { cardNumber, expiry, cvc, name, plan });

        if (!plan || !['basic', 'pro', 'team'].includes(plan)) {
            console.error('Invalid plan');
            return;
        }

        try {
            const { error } = await supabase
                .from('users')
                .update({ payment: plan })
                .eq('id', user.id);

            if (error) throw error;

            // Success: Navigate to dashboard or show success message
            navigate('/dashboard');
        } catch (error) {
            console.error('Error updating payment:', error);
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <>
            <header className="relative text-center py-10 dark:bg-transparent">
                <div className="absolute left-10 top-10">
                    <Button 
                        className="flex items-center gap-2 !rounded-3xl bg-gray-200 hover:bg-gray-500 dark:bg-gray-800 dark:hover:bg-gray-700 px-4 py-2 hover:scale-105 transition-transform" 
                        onClick={() => navigate('/pricing')}
                    >
                        <ArrowLeft /> Go Back
                    </Button>
                </div>
                <h1 className="text-4xl font-bold text-gray-900">
                    Complete Your Payment for {(plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : '')} Plan
                </h1>
                <p className="text-xl mt-4 text-gray-600 max-w-2xl mx-auto">
                    Enter your payment details to proceed with your selected plan.
                </p>
            </header>
            <div className="flex justify-center p-10 max-w-7xl mx-auto mt-5">
                <Card className="w-full max-w-xl !rounded-3xl border-2 border-gray-900 hover:border-purple-500 shadow-xl hover:shadow-2xl transition-transform transform hover:scale-105 duration-300">
                    <CardContent className="space-y-6">
                        <h2 className="text-3xl font-extrabold text-center mb-2">Payment Details</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cardholder Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="mt-1 block w-full rounded-xl border-2 border-gray-300 p-3 focus:border-purple-500 focus:ring-purple-500"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Card Number</label>
                                <input
                                    type="text"
                                    value={cardNumber}
                                    onChange={(e) => setCardNumber(e.target.value)}
                                    className="mt-1 block w-full rounded-xl border-2 border-gray-300 p-3 focus:border-purple-500 focus:ring-purple-500"
                                    placeholder="1234 5678 9012 3456"
                                    required
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                                    <input
                                        type="text"
                                        value={expiry}
                                        onChange={(e) => setExpiry(e.target.value)}
                                        className="mt-1 block w-full rounded-xl border-2 border-gray-300 p-3 focus:border-purple-500 focus:ring-purple-500"
                                        placeholder="MM/YY"
                                        required
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700">CVC</label>
                                    <input
                                        type="text"
                                        value={cvc}
                                        onChange={(e) => setCvc(e.target.value)}
                                        className="mt-1 block w-full rounded-xl border-2 border-gray-300 p-3 focus:border-purple-500 focus:ring-purple-500"
                                        placeholder="123"
                                        required
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                className="w-full py-3 text-lg font-semibold rounded-xl transition-colors duration-300 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white focus:ring-white"
                            >
                                Pay Now
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

export default PaymentForm;