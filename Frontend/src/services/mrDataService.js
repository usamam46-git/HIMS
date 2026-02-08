import api from '@/lib/axios';

// Get all MR records (search)
export const getAllPatients = async (searchTerm = '') => {
    const response = await api.get(`/mr-data?search=${searchTerm}`);
    return response.data;
};

// Get single patient by MR
export const getPatientByMR = async (mr) => {
    const response = await api.get(`/mr-data/${mr}`);
    return response.data;
};

// Create new patient
export const createPatient = async (patientData) => {
    const response = await api.post('/mr-data', patientData);
    return response.data;
};

// Update patient
export const updatePatient = async (mr, patientData) => {
    const response = await api.put(`/mr-data/${mr}`, patientData);
    return response.data;
};
