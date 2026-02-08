import { query, getConnection } from '../config/db.js';

// Get all shifts with optional filters
export const getAllShifts = async (req, res) => {
    try {
        const { date, is_closed } = req.query;
        let sql = 'SELECT * FROM shifts WHERE 1=1';
        const params = [];

        if (date) {
            sql += ' AND shift_date = ?';
            params.push(date);
        }
        if (is_closed !== undefined) {
            sql += ' AND is_closed = ?';
            params.push(is_closed === 'true');
        }

        sql += ' ORDER BY shift_date DESC, shift_id DESC';
        const results = await query(sql, params);
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get shift by ID
export const getShiftById = async (req, res) => {
    try {
        const { id } = req.params;
        const results = await query('SELECT * FROM shifts WHERE shift_id = ?', [id]);
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Shift not found' });
        }
        res.json({ success: true, data: results[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get current open shift
export const getCurrentShift = async (req, res) => {
    try {
        const results = await query(
            'SELECT * FROM shifts WHERE is_closed = FALSE ORDER BY shift_id DESC LIMIT 1'
        );
        if (results.length === 0) {
            return res.json({ success: true, data: null, message: 'No open shift found' });
        }
        res.json({ success: true, data: results[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Open a new shift
export const openShift = async (req, res) => {
    try {
        const { shift_date, shift_type, opened_by } = req.body;

        // Check if there's already an open shift
        const openShifts = await query('SELECT * FROM shifts WHERE is_closed = FALSE');
        if (openShifts.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot open new shift. Please close the current shift first.',
                current_shift: openShifts[0]
            });
        }

        // Check if this shift type already exists for the date
        const existingShift = await query(
            'SELECT * FROM shifts WHERE shift_date = ? AND shift_type = ?',
            [shift_date, shift_type]
        );
        if (existingShift.length > 0) {
            return res.status(400).json({
                success: false,
                message: `${shift_type} shift already exists for ${shift_date}`
            });
        }

        // Check if 3 shifts already exist for this date
        const shiftsCount = await query(
            'SELECT COUNT(*) as count FROM shifts WHERE shift_date = ?',
            [shift_date]
        );
        if (shiftsCount[0].count >= 3) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 3 shifts allowed per day'
            });
        }

        const result = await query(
            `INSERT INTO shifts (shift_date, shift_type, shift_start_time, opened_by, is_closed)
       VALUES (?, ?, NOW(), ?, FALSE)`,
            [shift_date, shift_type, opened_by]
        );

        res.status(201).json({
            success: true,
            message: 'Shift opened successfully',
            data: { shift_id: result.insertId, shift_date, shift_type, opened_by }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'This shift already exists for the date' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// Close a shift
export const closeShift = async (req, res) => {
    const connection = await getConnection();
    try {
        const { id } = req.params;
        const { closed_by } = req.body;

        await connection.beginTransaction();

        // 1. Get shift details (to ensure it exists and get type/date)
        const [shiftResult] = await connection.execute('SELECT * FROM shifts WHERE shift_id = ?', [id]);
        if (shiftResult.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Shift not found' });
        }
        const shift = shiftResult[0];

        // 2. Calculate OPD Summary from opd_patient_data
        const [opdSummary] = await connection.execute(`
            SELECT 
                COUNT(*) as total_count,
                MIN(receipt_id) as receipt_from,
                MAX(receipt_id) as receipt_to,
                COALESCE(SUM(total_amount), 0) as total_amount,
                COALESCE(SUM(discount), 0) as total_discount,
                COALESCE(SUM(paid), 0) as total_paid,
                COALESCE(SUM(balance), 0) as total_balance,
                COUNT(CASE WHEN discount > 0 THEN 1 END) as discount_qty
            FROM opd_patient_data 
            WHERE shift_id = ? AND opd_cancelled = FALSE
        `, [id]);

        const summary = opdSummary[0];

        // 3. Get Expense Summary
        const [expSummary] = await connection.execute(`
            SELECT 
                MIN(expense_id) as expense_from,
                MAX(expense_id) as expense_to,
                COALESCE(SUM(expense_amount), 0) as total_expenses
            FROM expenses 
            WHERE shift_id = ?
        `, [id]);
        const expenses = expSummary[0];

        // 4. Update shift as closed
        const [updateResult] = await connection.execute(
            `UPDATE shifts SET is_closed = TRUE, shift_end_time = NOW(), closed_by = ? WHERE shift_id = ?`,
            [closed_by, id]
        );

        if (updateResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Failed to close shift' });
        }

        // 5. Update related records
        await connection.execute('UPDATE opd_patient_data SET shift_closed = TRUE WHERE shift_id = ?', [id]);
        await connection.execute('UPDATE consultant_payments SET shift_closed = TRUE WHERE shift_id = ?', [id]);

        // 6. Insert into opd_shift_cash
        // Prepare data for insertion
        const cashData = {
            shift_id: id,
            shift_date: shift.shift_date,
            shift_time: new Date().toTimeString().split(' ')[0], // Current time
            submit_by: closed_by,
            shift_type: shift.shift_type,
            receipt_from: summary.receipt_from || null,
            receipt_to: summary.receipt_to || null,
            expense_from: expenses.expense_from || null,
            expense_to: expenses.expense_to || null,
            total_amount: summary.total_amount, // Gross
            service_serial: 0, // Not used currently
            service_head: 'OPD',
            service_qty: summary.total_count,
            service_amount: summary.total_amount,
            service_discount_qty: summary.discount_qty,
            service_discount_amount: summary.total_discount,
            service_paid: summary.total_paid,
            service_balance: summary.total_balance,
            service_invoice_from: summary.receipt_from || null,
            service_invoice_to: summary.receipt_to || null,
            total_quantity: summary.total_count,
            total_collected: summary.total_paid, // Net collected
            total_discount_quantity: summary.discount_qty,
            total_discount_amount: summary.total_discount,
            total_paid: summary.total_paid, // Confusing naming in schema, but usually means collected
            total_balance: summary.total_balance
        };

        await connection.execute(
            `INSERT INTO opd_shift_cash (
                shift_id, shift_date, shift_time, submit_by, shift_type,
                receipt_from, receipt_to, expense_from, expense_to,
                total_amount, service_head, service_qty, service_amount,
                service_discount_qty, service_discount_amount, service_paid, service_balance,
                service_invoice_from, service_invoice_to,
                total_quantity, total_collected, total_discount_quantity, total_discount_amount,
                total_paid, total_balance
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                cashData.shift_id, cashData.shift_date, cashData.shift_time, cashData.submit_by, cashData.shift_type,
                cashData.receipt_from, cashData.receipt_to, cashData.expense_from, cashData.expense_to,
                cashData.total_amount, cashData.service_head, cashData.service_qty, cashData.service_amount,
                cashData.service_discount_qty, cashData.service_discount_amount, cashData.service_paid, cashData.service_balance,
                cashData.service_invoice_from, cashData.service_invoice_to,
                cashData.total_quantity, cashData.total_collected, cashData.total_discount_quantity, cashData.total_discount_amount,
                cashData.total_paid, cashData.total_balance
            ]
        );

        await connection.commit();
        res.json({ success: true, message: 'Shift closed successfully', data: cashData });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

// Get shifts for a date
export const getShiftsByDate = async (req, res) => {
    try {
        const { date } = req.params;
        const results = await query(
            'SELECT * FROM shifts WHERE shift_date = ? ORDER BY shift_type',
            [date]
        );
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
