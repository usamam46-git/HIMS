import api from '@/lib/axios';

// Get all OPD services
export const getAllServices = async () => {
    const response = await api.get('/opd-services');
    return response.data;
};

// Get service by ID
export const getServiceById = async (id) => {
    const response = await api.get(`/opd-services/${id}`);
    return response.data;
};

// Create new service
export const createService = async (serviceData) => {
    const response = await api.post('/opd-services', serviceData);
    return response.data;
};

// Update service
export const updateService = async (id, serviceData) => {
    const response = await api.put(`/opd-services/${id}`, serviceData);
    return response.data;
};

// Delete service
export const deleteService = async (id) => {
    const response = await api.delete(`/opd-services/${id}`);
    return response.data;
};

// Get all service heads/categories
export const getServiceHeads = async () => {
    const response = await api.get('/opd-services/heads');
    return response.data;
};

// Get services by head/category
export const getServicesByHead = async (head) => {
    const response = await api.get(`/opd-services/head/${head}`);
    return response.data;
};
