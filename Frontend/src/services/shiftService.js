import api from '@/lib/axios';

// Get all shifts
export const getAllShifts = async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/shifts?${params}`);
    return response.data;
};

// Get shift by ID
export const getShiftById = async (id) => {
    const response = await api.get(`/shifts/${id}`);
    return response.data;
};

// Get current open shift
export const getCurrentShift = async () => {
    const response = await api.get('/shifts/current');
    return response.data;
};

// Get shifts for a specific date
export const getShiftsByDate = async (date) => {
    const response = await api.get(`/shifts/date/${date}`);
    return response.data;
};

// Open a new shift
export const openShift = async (shiftData) => {
    const response = await api.post('/shifts', shiftData);
    return response.data;
};

// Close a shift
export const closeShift = async (shiftId, closedBy) => {
    const response = await api.put(`/shifts/${shiftId}/close`, { closed_by: closedBy });
    return response.data;
};

// Get shift summary (receipts, totals)
export const getShiftSummary = async (shiftId) => {
    const response = await api.get(`/opd-patient-data/shift/${shiftId}/summary`);
    return response.data;
};

// Get OPD shift cash record
export const getShiftCash = async (shiftId) => {
    const response = await api.get(`/opd-shift-cash/${shiftId}`);
    return response.data;
};

// Create shift cash record (on close)
export const createShiftCash = async (cashData) => {
    const response = await api.post('/opd-shift-cash', cashData);
    return response.data;
};
