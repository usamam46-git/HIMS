import { query } from '../config/db.js';

// Get all doctors
export const getAllDoctors = async (req, res) => {
    try {
        const results = await query(
            'SELECT * FROM doctors WHERE is_active = TRUE ORDER BY doctor_name'
        );
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get doctor by ID
export const getDoctorById = async (req, res) => {
    try {
        const { id } = req.params;
        const results = await query('SELECT * FROM doctors WHERE srl_no = ?', [id]);
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }
        res.json({ success: true, data: results[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create new doctor
export const createDoctor = async (req, res) => {
    try {
        const {
            doctor_id,
            doctor_name,
            doctor_specialization,
            doctor_department,
            doctor_qualification,
            doctor_phone,
            doctor_email,
            doctor_address,
            doctor_share,
            consultation_fee
        } = req.body;

        const result = await query(
            `INSERT INTO doctors 
            (doctor_id, doctor_name, doctor_specialization, doctor_department, 
             doctor_qualification, doctor_phone, doctor_email, doctor_address, 
             doctor_share, consultation_fee)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                doctor_id,
                doctor_name,
                doctor_specialization || null,
                doctor_department || null,
                doctor_qualification || null,
                doctor_phone || null,
                doctor_email || null,
                doctor_address || null,
                doctor_share || 0,
                consultation_fee || 0
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Doctor registered successfully',
            data: { srl_no: result.insertId, ...req.body }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Doctor ID already exists' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update doctor
export const updateDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            doctor_name,
            doctor_specialization,
            doctor_department,
            doctor_qualification,
            doctor_phone,
            doctor_email,
            doctor_address,
            doctor_share,
            consultation_fee,
            is_active
        } = req.body;

        const result = await query(
            `UPDATE doctors 
            SET doctor_name = ?, doctor_specialization = ?, doctor_department = ?,
                doctor_qualification = ?, doctor_phone = ?, doctor_email = ?,
                doctor_address = ?, doctor_share = ?, consultation_fee = ?, is_active = ?
            WHERE srl_no = ?`,
            [
                doctor_name,
                doctor_specialization,
                doctor_department,
                doctor_qualification,
                doctor_phone,
                doctor_email,
                doctor_address,
                doctor_share,
                consultation_fee,
                is_active,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }
        res.json({ success: true, message: 'Doctor updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete doctor (soft delete)
export const deleteDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('UPDATE doctors SET is_active = FALSE WHERE srl_no = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }
        res.json({ success: true, message: 'Doctor deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get doctors by department
export const getDoctorsByDepartment = async (req, res) => {
    try {
        const { department } = req.params;
        const results = await query(
            'SELECT * FROM doctors WHERE doctor_department = ? AND is_active = TRUE ORDER BY doctor_name',
            [department]
        );
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all departments
export const getDepartments = async (req, res) => {
    try {
        const results = await query(
            'SELECT DISTINCT doctor_department FROM doctors WHERE is_active = TRUE AND doctor_department IS NOT NULL ORDER BY doctor_department'
        );
        res.json({ success: true, data: results.map(r => r.doctor_department) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
