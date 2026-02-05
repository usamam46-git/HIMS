import { query } from '../config/db.js';

// Get all consultant payments with optional filters
export const getAllPayments = async (req, res) => {
    try {
        const { date, doctor_name, shift_id, shift_date, shift_closed } = req.query;
        let sql = 'SELECT * FROM consultant_payments WHERE 1=1';
        const params = [];

        if (date) {
            sql += ' AND payment_date = ?';
            params.push(date);
        }
        if (doctor_name) {
            sql += ' AND doctor_name LIKE ?';
            params.push(`%${doctor_name}%`);
        }
        if (shift_id) {
            sql += ' AND shift_id = ?';
            params.push(shift_id);
        }
        if (shift_date) {
            sql += ' AND shift_date = ?';
            params.push(shift_date);
        }
        if (shift_closed !== undefined) {
            sql += ' AND shift_closed = ?';
            params.push(shift_closed === 'true');
        }

        sql += ' ORDER BY payment_date DESC, payment_time DESC';
        const results = await query(sql, params);
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get payment by ID
export const getPaymentById = async (req, res) => {
    try {
        const { id } = req.params;
        const results = await query('SELECT * FROM consultant_payments WHERE srl_no = ?', [id]);
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }
        res.json({ success: true, data: results[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Generate next payment ID (voucher number)
const generatePaymentId = async () => {
    const result = await query(
        'SELECT payment_id FROM consultant_payments ORDER BY srl_no DESC LIMIT 1'
    );
    if (result.length === 0) {
        return 'PAY0001';
    }
    const lastId = result[0].payment_id;
    const num = parseInt(lastId.replace('PAY', '')) + 1;
    return `PAY${num.toString().padStart(4, '0')}`;
};

// Create new payment
export const createPayment = async (req, res) => {
    try {
        const {
            payment_date, payment_time, doctor_name, payment_department,
            total, payment_share, payment_amount, patient_id, patient_date,
            patient_service, patient_name, shift_id, shift_type, shift_date
        } = req.body;

        const payment_id = await generatePaymentId();

        const result = await query(
            `INSERT INTO consultant_payments (payment_id, payment_date, payment_time, doctor_name, 
        payment_department, total, payment_share, payment_amount, patient_id, patient_date,
        patient_service, patient_name, shift_id, shift_type, shift_date, shift_closed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
            [payment_id, payment_date, payment_time, doctor_name, payment_department,
                total, payment_share, payment_amount, patient_id, patient_date,
                patient_service, patient_name, shift_id, shift_type, shift_date]
        );

        res.status(201).json({
            success: true,
            message: 'Payment recorded successfully',
            data: { srl_no: result.insertId, payment_id, ...req.body }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update payment
export const updatePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            payment_date, payment_time, doctor_name, payment_department,
            total, payment_share, payment_amount, patient_id, patient_date,
            patient_service, patient_name
        } = req.body;

        const result = await query(
            `UPDATE consultant_payments 
       SET payment_date = ?, payment_time = ?, doctor_name = ?, payment_department = ?,
           total = ?, payment_share = ?, payment_amount = ?, patient_id = ?, patient_date = ?,
           patient_service = ?, patient_name = ?
       WHERE srl_no = ?`,
            [payment_date, payment_time, doctor_name, payment_department,
                total, payment_share, payment_amount, patient_id, patient_date,
                patient_service, patient_name, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }
        res.json({ success: true, message: 'Payment updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete payment
export const deletePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM consultant_payments WHERE srl_no = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }
        res.json({ success: true, message: 'Payment deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get payments by doctor
export const getPaymentsByDoctor = async (req, res) => {
    try {
        const { doctorName } = req.params;
        const results = await query(
            `SELECT * FROM consultant_payments WHERE doctor_name = ? ORDER BY payment_date DESC`,
            [doctorName]
        );
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get payment summary by doctor for a date range
export const getDoctorPaymentSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const results = await query(
            `SELECT doctor_name, COUNT(*) as payment_count, 
              SUM(total) as total_services, SUM(payment_amount) as total_paid
       FROM consultant_payments 
       WHERE payment_date BETWEEN ? AND ?
       GROUP BY doctor_name
       ORDER BY total_paid DESC`,
            [startDate, endDate]
        );
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get pending payments (not yet closed)
export const getPendingPayments = async (req, res) => {
    try {
        const results = await query(
            `SELECT * FROM consultant_payments WHERE shift_closed = FALSE ORDER BY payment_date, payment_time`
        );
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
