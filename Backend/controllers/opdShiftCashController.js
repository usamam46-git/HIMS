import { query, getConnection } from '../config/db.js';

// Get all shift cash records
export const getAllShiftCash = async (req, res) => {
    try {
        const { date, shift_type } = req.query;
        let sql = 'SELECT * FROM opd_shift_cash WHERE 1=1';
        const params = [];

        if (date) {
            sql += ' AND shift_date = ?';
            params.push(date);
        }
        if (shift_type) {
            sql += ' AND shift_type = ?';
            params.push(shift_type);
        }

        sql += ' ORDER BY shift_date DESC, srl_no DESC';
        const results = await query(sql, params);
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get shift cash by ID
export const getShiftCashById = async (req, res) => {
    try {
        const { id } = req.params;
        const results = await query('SELECT * FROM opd_shift_cash WHERE srl_no = ?', [id]);
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Shift cash record not found' });
        }
        res.json({ success: true, data: results[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get shift cash by shift ID
export const getShiftCashByShiftId = async (req, res) => {
    try {
        const { shiftId } = req.params;
        const results = await query('SELECT * FROM opd_shift_cash WHERE shift_id = ?', [shiftId]);
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Shift cash record not found' });
        }
        res.json({ success: true, data: results[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Close shift and generate cash summary
export const closeShiftWithSummary = async (req, res) => {
    const connection = await getConnection();
    try {
        const { shift_id, submit_by } = req.body;

        await connection.beginTransaction();

        // Get shift details
        const [shiftResult] = await connection.execute(
            'SELECT * FROM shifts WHERE shift_id = ?', [shift_id]
        );
        if (shiftResult.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Shift not found' });
        }
        const shift = shiftResult[0];

        // Get receipt range
        const [receiptRange] = await connection.execute(
            `SELECT MIN(receipt_id) as receipt_from, MAX(receipt_id) as receipt_to 
       FROM opd_patient_data WHERE shift_id = ?`, [shift_id]
        );

        // Get expense range
        const [expenseRange] = await connection.execute(
            `SELECT MIN(expense_id) as expense_from, MAX(expense_id) as expense_to 
       FROM expenses WHERE shift_id = ?`, [shift_id]
        );

        // Get OPD summary
        const [opdSummary] = await connection.execute(
            `SELECT 
        COUNT(*) as total_quantity,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN opd_discount = TRUE THEN 1 ELSE 0 END), 0) as service_discount_qty,
        COALESCE(SUM(discount_amount), 0) as total_discount_amount,
        COALESCE(SUM(paid), 0) as total_paid,
        COALESCE(SUM(balance), 0) as total_balance
       FROM opd_patient_data WHERE shift_id = ? AND opd_cancelled = FALSE`, [shift_id]
        );

        // Get total collected (paid - expenses)
        const [expenseTotal] = await connection.execute(
            'SELECT COALESCE(SUM(expense_amount), 0) as total_expense FROM expenses WHERE shift_id = ?',
            [shift_id]
        );

        const summary = opdSummary[0];
        const totalCollected = parseFloat(summary.total_paid) - parseFloat(expenseTotal[0].total_expense);

        // Insert shift cash record
        const [insertResult] = await connection.execute(
            `INSERT INTO opd_shift_cash (
        shift_id, shift_date, shift_time, submit_by, shift_type,
        receipt_from, receipt_to, expense_from, expense_to,
        total_amount, total_quantity, total_collected,
        total_discount_quantity, total_discount_amount, total_paid, total_balance,
        service_discount_qty, service_discount_amount
      ) VALUES (?, ?, CURTIME(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                shift_id, shift.shift_date, submit_by, shift.shift_type,
                receiptRange[0].receipt_from, receiptRange[0].receipt_to,
                expenseRange[0].expense_from, expenseRange[0].expense_to,
                summary.total_amount, summary.total_quantity, totalCollected,
                summary.service_discount_qty, summary.total_discount_amount,
                summary.total_paid, summary.total_balance,
                summary.service_discount_qty, summary.total_discount_amount
            ]
        );

        // Update shift as closed
        await connection.execute(
            `UPDATE shifts SET is_closed = TRUE, shift_end_time = NOW(), closed_by = ? WHERE shift_id = ?`,
            [submit_by, shift_id]
        );

        // Mark all OPD records in this shift as closed
        await connection.execute(
            'UPDATE opd_patient_data SET shift_closed = TRUE WHERE shift_id = ?',
            [shift_id]
        );

        // Mark all consultant payments in this shift as closed
        await connection.execute(
            'UPDATE consultant_payments SET shift_closed = TRUE WHERE shift_id = ?',
            [shift_id]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Shift closed successfully',
            data: {
                srl_no: insertResult.insertId,
                shift_id,
                ...summary,
                total_collected: totalCollected
            }
        });
    } catch (error) {
        await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Shift already closed' });
        }
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

// Update shift cash (for corrections)
export const updateShiftCash = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const fields = Object.keys(updates).filter(k => k !== 'srl_no' && k !== 'shift_id');
        if (fields.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }

        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values = [...fields.map(f => updates[f]), id];

        const result = await query(
            `UPDATE opd_shift_cash SET ${setClause} WHERE srl_no = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }
        res.json({ success: true, message: 'Shift cash updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get shift cash summary for a date (all 3 shifts)
export const getDailyCashSummary = async (req, res) => {
    try {
        const { date } = req.params;
        const results = await query(
            `SELECT shift_type, total_amount, total_collected, total_discount_amount, 
              total_paid, total_balance, total_quantity
       FROM opd_shift_cash WHERE shift_date = ?
       ORDER BY FIELD(shift_type, 'Morning', 'Evening', 'Night')`,
            [date]
        );

        // Calculate totals
        const totals = results.reduce((acc, row) => {
            acc.total_amount += parseFloat(row.total_amount) || 0;
            acc.total_collected += parseFloat(row.total_collected) || 0;
            acc.total_discount_amount += parseFloat(row.total_discount_amount) || 0;
            acc.total_paid += parseFloat(row.total_paid) || 0;
            acc.total_balance += parseFloat(row.total_balance) || 0;
            acc.total_quantity += parseInt(row.total_quantity) || 0;
            return acc;
        }, { total_amount: 0, total_collected: 0, total_discount_amount: 0, total_paid: 0, total_balance: 0, total_quantity: 0 });

        res.json({ success: true, data: { shifts: results, totals } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
