import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

function PaymentForm() {
    const navigate = useNavigate();
    const { plan } = window.location.pathname.includes('paymentForm-') ? { plan: window.location.pathname.split('paymentForm-')[1] } : { plan: null };
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');
    const [name, setName] = useState('');
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [isLoading, setIsLoading] = useState(false);
    const [paidUser, setPaidUser] = useState<{ id: string; payment: string } | null>(null);

    useEffect(() => {
        const checkAuthAndPayment = async () => {
            if (!user || !user.id) {
                showNotification('Please log in to proceed with payment.', 'error');
                navigate('/login');
                return;
            }
            setIsLoading(true);
            const { data: authUser, error: authError } = await supabase.auth.getUser();
            

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
                if (['basic', 'pro', 'team'].includes(paidUserData?.payment)) {
                    // showNotification('You already have an active plan.', 'error');
                    // navigate('/dashboard');
                }
            }
            setIsLoading(false);
        };
        checkAuthAndPayment();
    }, [user, navigate, showNotification]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        

        if (!plan || !['basic', 'pro', 'team'].includes(plan)) {
            console.error('Invalid plan:', plan);
            showNotification('Invalid plan selected.', 'error');
            return;
        }

        try {
            const { data: userCheck, error: checkError } = await supabase
                .from('users')
                .select('id, payment')
                .eq('id', user.id)
                .single();

            if (checkError || !userCheck) {
                console.error('User not found:', checkError || 'No user data returned');
                showNotification('User not found. Please ensure you are logged in correctly.', 'error');
                return;
            }
            

            const { data, error } = await supabase
                .from('users')
                .update({ payment: plan })
                .eq('id', user.id)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                console.error('No rows updated. Check RLS policies or user ID:', user.id);
                showNotification('Failed to update payment plan. Please try again.', 'error');
                return;
            }

            
            showNotification('Payment plan updated successfully!', 'success');
            navigate('/dashboard');
        } catch (error) {
            console.error('Error updating payment:', error);
            showNotification('Error updating payment plan. Please try again.', 'error');
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
                        onClick={() => navigate(-1)}
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
                <Card className="w-full max-w-xl !rounded-3xl border-2 border-gray-900 hover:border-primary shadow-xl hover:shadow-2xl transition-transform transform hover:scale-105 duration-300">
                    <CardContent className="space-y-6">
                        <h2 className="text-3xl font-extrabold text-center mb-2">Payment Details</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cardholder Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="mt-1 block w-full rounded-xl border-2 border-gray-300 p-3 focus:border-primary focus:ring-primary"
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
                                    className="mt-1 block w-full rounded-xl border-2 border-gray-300 p-3 focus:border-primary focus:ring-primary"
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
                                        className="mt-1 block w-full rounded-xl border-2 border-gray-300 p-3 focus:border-primary focus:ring-primary"
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
                                        className="mt-1 block w-full rounded-xl border-2 border-gray-300 p-3 focus:border-primary focus:ring-primary"
                                        placeholder="123"
                                        required
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                className="w-full py-3 text-lg font-semibold rounded-xl transition-colors duration-300 bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-accent text-white focus:ring-white"
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