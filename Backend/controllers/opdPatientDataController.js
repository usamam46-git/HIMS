import { query } from '../config/db.js';

// Get all OPD patient records with optional filters
export const getAllPatients = async (req, res) => {
    try {
        const { date, shift_id, shift_date, mr_number, opd_cancelled } = req.query;
        let sql = 'SELECT * FROM opd_patient_data WHERE 1=1';
        const params = [];

        if (date) {
            sql += ' AND date = ?';
            params.push(date);
        }
        if (shift_id) {
            sql += ' AND shift_id = ?';
            params.push(shift_id);
        }
        if (shift_date) {
            sql += ' AND shift_date = ?';
            params.push(shift_date);
        }
        if (mr_number) {
            sql += ' AND patient_mr_number = ?';
            params.push(mr_number);
        }
        if (opd_cancelled !== undefined) {
            sql += ' AND opd_cancelled = ?';
            params.push(opd_cancelled === 'true');
        }

        sql += ' ORDER BY date DESC, time DESC';
        const results = await query(sql, params);
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get patient record by ID
export const getPatientById = async (req, res) => {
    try {
        const { id } = req.params;
        const results = await query('SELECT * FROM opd_patient_data WHERE srl_no = ?', [id]);
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }
        res.json({ success: true, data: results[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get patient records by MR number
export const getPatientsByMrNumber = async (req, res) => {
    try {
        const { mrNumber } = req.params;
        const results = await query(
            'SELECT * FROM opd_patient_data WHERE patient_mr_number = ? ORDER BY date DESC, time DESC',
            [mrNumber]
        );
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Generate next receipt ID
const generateReceiptId = async () => {
    const result = await query(
        'SELECT receipt_id FROM opd_patient_data ORDER BY srl_no DESC LIMIT 1'
    );
    if (result.length === 0) {
        return 'OPD00001';
    }
    const lastId = result[0].receipt_id;
    const num = parseInt(lastId.replace('OPD', '')) + 1;
    return `OPD${num.toString().padStart(5, '0')}`;
};

// Create new OPD patient record (receipt)
export const createPatient = async (req, res) => {
    try {
        const {
            patient_mr_number, date, time, emergency_paid, patient_token_appointment,
            patient_checked, patient_requested_discount, patient_name, phone_number,
            patient_age, patient_gender, patient_address, opd_service, service_detail, total_amount, discount,
            payable, paid, balance, service_details, service_amount, opd_discount,
            discount_amount, discount_reason, discount_id, dr_share, dr_share_amount,
            hospital_share, shift_id, shift_type, shift_date
        } = req.body;

        const receipt_id = await generateReceiptId();

        const result = await query(
            `INSERT INTO opd_patient_data (
        receipt_id, patient_mr_number, date, time, emergency_paid, patient_token_appointment,
        patient_checked, patient_requested_discount, patient_name, phone_number,
        patient_age, patient_gender, patient_address, opd_service, service_detail, total_amount, discount,
        payable, paid, balance, service_details, service_amount, opd_discount,
        discount_amount, discount_reason, discount_id, dr_share, dr_share_amount,
        hospital_share, paid_to_doctor, opd_cancelled, opd_refund, shift_closed,
        shift_id, shift_type, shift_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, FALSE, FALSE, FALSE, ?, ?, ?)`,
            [
                receipt_id, patient_mr_number, date, time, emergency_paid || false,
                patient_token_appointment || false, patient_checked || false,
                patient_requested_discount || false, patient_name, phone_number,
                patient_age, patient_gender, patient_address, opd_service, service_detail, total_amount, discount || 0,
                payable, paid || 0, balance || 0,
                typeof service_details === 'object' ? JSON.stringify(service_details) : service_details,
                service_amount || 0, opd_discount || false, discount_amount || 0,
                discount_reason, discount_id, dr_share || 0, dr_share_amount || 0,
                hospital_share || 0, shift_id, shift_type, shift_date
            ]
        );

        res.status(201).json({
            success: true,
            message: 'OPD record created successfully',
            data: { srl_no: result.insertId, receipt_id, ...req.body }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update OPD patient record
export const updatePatient = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Build dynamic update query
        const fields = Object.keys(updates).filter(k => k !== 'srl_no' && k !== 'receipt_id');
        if (fields.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }

        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values = fields.map(f => {
            if (f === 'service_details' && typeof updates[f] === 'object') {
                return JSON.stringify(updates[f]);
            }
            return updates[f];
        });
        values.push(id);

        const result = await query(
            `UPDATE opd_patient_data SET ${setClause} WHERE srl_no = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }
        res.json({ success: true, message: 'Record updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Cancel OPD record
export const cancelPatient = async (req, res) => {
    try {
        const { id } = req.params;
        const { cancel_details } = req.body;

        const result = await query(
            `UPDATE opd_patient_data SET opd_cancelled = TRUE, cancel_details = ? WHERE srl_no = ?`,
            [cancel_details, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }
        res.json({ success: true, message: 'OPD record cancelled successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Process refund
export const refundPatient = async (req, res) => {
    try {
        const { id } = req.params;
        const { refund_reason, refund_amount } = req.body;

        const result = await query(
            `UPDATE opd_patient_data SET opd_refund = TRUE, refund_reason = ?, refund_amount = ? WHERE srl_no = ?`,
            [refund_reason, refund_amount, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }
        res.json({ success: true, message: 'Refund processed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Mark doctor payment as done
export const markPaidToDoctor = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `UPDATE opd_patient_data SET paid_to_doctor = TRUE WHERE srl_no = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }
        res.json({ success: true, message: 'Doctor payment marked as done' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get records by shift
export const getPatientsByShift = async (req, res) => {
    try {
        const { shiftId } = req.params;
        const results = await query(
            `SELECT * FROM opd_patient_data WHERE shift_id = ? ORDER BY time`,
            [shiftId]
        );
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get shift summary for OPD
export const getShiftSummary = async (req, res) => {
    try {
        const { shiftId } = req.params;
        const results = await query(
            `SELECT 
        COUNT(*) as total_patients,
        SUM(total_amount) as total_amount,
        SUM(discount_amount) as total_discount,
        SUM(paid) as total_paid,
        SUM(balance) as total_balance,
        SUM(dr_share_amount) as total_dr_share,
        SUM(hospital_share) as total_hospital_share,
        SUM(CASE WHEN opd_cancelled = TRUE THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN opd_refund = TRUE THEN refund_amount ELSE 0 END) as total_refund
       FROM opd_patient_data WHERE shift_id = ? AND opd_cancelled = FALSE`,
            [shiftId]
        );
        res.json({ success: true, data: results[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
