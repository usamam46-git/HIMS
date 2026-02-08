import api from '@/lib/axios';

// ==================== OPD Services ====================
export const getOPDServices = async () => {
    const response = await api.get('/opd-services');
    return response.data;
};

export const getServicesByHead = async (head) => {
    const response = await api.get(`/opd-services/head/${head}`);
    return response.data;
};

export const getServiceHeads = async () => {
    const response = await api.get('/opd-services/heads');
    return response.data;
};

// ==================== Doctors ====================
export const getDoctors = async () => {
    const response = await api.get('/doctors');
    return response.data;
};

export const getDoctorById = async (id) => {
    const response = await api.get(`/doctors/${id}`);
    return response.data;
};

// ==================== OPD Patient Data (Receipts) ====================
export const createOPDReceipt = async (receiptData) => {
    const response = await api.post('/opd-patient-data', receiptData);
    return response.data;
};

export const getOPDReceipts = async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/opd-patient-data?${params}`);
    return response.data;
};

export const getReceiptById = async (id) => {
    const response = await api.get(`/opd-patient-data/${id}`);
    return response.data;
};

export const getReceiptsByMR = async (mr) => {
    const response = await api.get(`/opd-patient-data/mr/${mr}`);
    return response.data;
};

export const getReceiptsByShift = async (shiftId) => {
    const response = await api.get(`/opd-patient-data/shift/${shiftId}`);
    return response.data;
};

// ==================== Current Shift ====================
export const getCurrentShift = async () => {
    const response = await api.get('/shifts/current');
    return response.data;
};

// ==================== Consultant Payments ====================
export const createConsultantPayment = async (paymentData) => {
    const response = await api.post('/consultant-payments', paymentData);
    return response.data;
};
