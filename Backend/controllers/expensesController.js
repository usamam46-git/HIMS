import { query } from '../config/db.js';

// Get all expenses with optional filters
export const getAllExpenses = async (req, res) => {
    try {
        const { date, shift_id, shift_date, shift_type } = req.query;
        let sql = 'SELECT * FROM expenses WHERE 1=1';
        const params = [];

        if (date) {
            // If checking for shift report, we might prefer shift_date if available in query, 
            // but here we keep expense_date for backward compatibility if just 'date' is passed.
            // However, the report will likely pass 'shift_date'.
            sql += ' AND expense_date = ?';
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
        if (shift_type && shift_type !== 'All') {
            sql += ' AND expense_shift = ?';
            params.push(shift_type);
        }

        sql += ' ORDER BY expense_date DESC, expense_time DESC';
        const results = await query(sql, params);
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get expense by ID
export const getExpenseById = async (req, res) => {
    try {
        const { id } = req.params;
        const results = await query('SELECT * FROM expenses WHERE srl_no = ?', [id]);
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }
        res.json({ success: true, data: results[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Generate next expense ID
const generateExpenseId = async () => {
    const result = await query(
        'SELECT expense_id FROM expenses ORDER BY srl_no DESC LIMIT 1'
    );
    if (result.length === 0) {
        return 'EXP0001';
    }
    const lastId = result[0].expense_id;
    const num = parseInt(lastId.replace('EXP', '')) + 1;
    return `EXP${num.toString().padStart(4, '0')}`;
};

// Create new expense
export const createExpense = async (req, res) => {
    try {
        const {
            expense_date, expense_time, expense_shift, expense_description,
            expense_name, expense_amount, expense_by, shift_id, shift_date
        } = req.body;

        const expense_id = await generateExpenseId();

        const result = await query(
            `INSERT INTO expenses (expense_id, expense_date, expense_time, expense_shift, 
        expense_description, expense_name, expense_amount, expense_by, shift_id, shift_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [expense_id, expense_date, expense_time, expense_shift, expense_description,
                expense_name, expense_amount, expense_by, shift_id, shift_date]
        );

        res.status(201).json({
            success: true,
            message: 'Expense created successfully',
            data: { srl_no: result.insertId, expense_id, ...req.body }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update expense
export const updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            expense_date, expense_time, expense_shift, expense_description,
            expense_name, expense_amount, expense_by
        } = req.body;

        const result = await query(
            `UPDATE expenses 
       SET expense_date = ?, expense_time = ?, expense_shift = ?, 
           expense_description = ?, expense_name = ?, expense_amount = ?, expense_by = ?
       WHERE srl_no = ?`,
            [expense_date, expense_time, expense_shift, expense_description,
                expense_name, expense_amount, expense_by, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }
        res.json({ success: true, message: 'Expense updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete expense
export const deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM expenses WHERE srl_no = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }
        res.json({ success: true, message: 'Expense deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get expenses by shift
export const getExpensesByShift = async (req, res) => {
    try {
        const { shiftId } = req.params;
        const results = await query(
            'SELECT * FROM expenses WHERE shift_id = ? ORDER BY expense_time',
            [shiftId]
        );
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get expense summary by date
export const getExpenseSummaryByDate = async (req, res) => {
    try {
        const { date } = req.params;
        const results = await query(
            `SELECT expense_shift, COUNT(*) as count, SUM(expense_amount) as total
       FROM expenses WHERE shift_date = ?
       GROUP BY expense_shift`,
            [date]
        );
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
