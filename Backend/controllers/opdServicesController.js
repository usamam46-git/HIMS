import { query } from '../config/db.js';

// Get all OPD services
export const getAllServices = async (req, res) => {
    try {
        const results = await query(
            'SELECT * FROM opd_services WHERE is_active = TRUE ORDER BY service_head, service_name'
        );
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get service by ID
export const getServiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const results = await query('SELECT * FROM opd_services WHERE srl_no = ?', [id]);
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Service not found' });
        }
        res.json({ success: true, data: results[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create new service
export const createService = async (req, res) => {
    try {
        const { service_id, service_name, service_head, service_rate, required_consultant, price_editable } = req.body;

        const result = await query(
            `INSERT INTO opd_services (service_id, service_name, service_head, service_rate, required_consultant, price_editable)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [service_id, service_name, service_head, service_rate, required_consultant || false, price_editable || false]
        );

        res.status(201).json({
            success: true,
            message: 'Service created successfully',
            data: { srl_no: result.insertId, ...req.body }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Service ID already exists' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update service
export const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { service_name, service_head, service_rate, required_consultant, price_editable, is_active } = req.body;

        const result = await query(
            `UPDATE opd_services 
       SET service_name = ?, service_head = ?, service_rate = ?, 
           required_consultant = ?, price_editable = ?, is_active = ?
       WHERE srl_no = ?`,
            [service_name, service_head, service_rate, required_consultant, price_editable, is_active, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Service not found' });
        }
        res.json({ success: true, message: 'Service updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete service (soft delete - set is_active to false)
export const deleteService = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('UPDATE opd_services SET is_active = FALSE WHERE srl_no = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Service not found' });
        }
        res.json({ success: true, message: 'Service deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get services by head/category
export const getServicesByHead = async (req, res) => {
    try {
        const { head } = req.params;
        const results = await query(
            'SELECT * FROM opd_services WHERE service_head = ? AND is_active = TRUE ORDER BY service_name',
            [head]
        );
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all service heads (categories)
export const getServiceHeads = async (req, res) => {
    try {
        const results = await query(
            'SELECT DISTINCT service_head FROM opd_services WHERE is_active = TRUE ORDER BY service_head'
        );
        res.json({ success: true, data: results.map(r => r.service_head) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
