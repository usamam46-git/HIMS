import api from '@/lib/axios';

// Get all consultant payments
export const getAllPayments = async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/consultant-payments?${params}`);
    return response.data;
};

// Get payment by ID
export const getPaymentById = async (id) => {
    const response = await api.get(`/consultant-payments/${id}`);
    return response.data;
};

// Create new payment
export const createPayment = async (paymentData) => {
    const response = await api.post('/consultant-payments', paymentData);
    return response.data;
};

// Get payments by doctor
export const getPaymentsByDoctor = async (doctorName) => {
    const response = await api.get(`/consultant-payments/doctor/${encodeURIComponent(doctorName)}`);
    return response.data;
};

// Get payment summary for date range
export const getPaymentSummary = async (startDate, endDate) => {
    const response = await api.get(`/consultant-payments/summary?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
};

// Get pending (unclosed) payments
export const getPendingPayments = async () => {
    const response = await api.get('/consultant-payments/pending');
    return response.data;
};
