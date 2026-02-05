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

        // Update shift
        const result = await connection.execute(
            `UPDATE shifts SET is_closed = TRUE, shift_end_time = NOW(), closed_by = ? WHERE shift_id = ?`,
            [closed_by, id]
        );

        if (result[0].affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Shift not found' });
        }

        // Update all related records to mark shift as closed
        await connection.execute(
            'UPDATE opd_patient_data SET shift_closed = TRUE WHERE shift_id = ?',
            [id]
        );
        await connection.execute(
            'UPDATE consultant_payments SET shift_closed = TRUE WHERE shift_id = ?',
            [id]
        );

        await connection.commit();
        res.json({ success: true, message: 'Shift closed successfully' });
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
