import { query } from '../config/db.js';

// Get daily report (all 3 shifts for a date)
export const getDailyReport = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ success: false, message: 'Date is required' });
        }

        // Get all shifts for the date
        const shifts = await query(
            'SELECT * FROM shifts WHERE shift_date = ? ORDER BY shift_id',
            [date]
        );

        // Get OPD data grouped by shift
        const opdData = await query(
            `SELECT shift_type,
        COUNT(*) as patient_count,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(discount_amount), 0) as total_discount,
        COALESCE(SUM(paid), 0) as total_paid,
        COALESCE(SUM(balance), 0) as total_balance,
        COALESCE(SUM(dr_share_amount), 0) as total_dr_share,
        COALESCE(SUM(hospital_share), 0) as total_hospital_share,
        COALESCE(SUM(CASE WHEN opd_cancelled = TRUE THEN 1 ELSE 0 END), 0) as cancelled_count,
        COALESCE(SUM(CASE WHEN opd_refund = TRUE THEN refund_amount ELSE 0 END), 0) as total_refund
       FROM opd_patient_data 
       WHERE shift_date = ?
       GROUP BY shift_type
       ORDER BY FIELD(shift_type, 'Morning', 'Evening', 'Night')`,
            [date]
        );

        // Get expenses grouped by shift
        const expenses = await query(
            `SELECT expense_shift as shift_type, 
        COUNT(*) as expense_count,
        COALESCE(SUM(expense_amount), 0) as total_expense
       FROM expenses 
       WHERE shift_date = ?
       GROUP BY expense_shift`,
            [date]
        );

        // Get shift cash records
        const shiftCash = await query(
            'SELECT * FROM opd_shift_cash WHERE shift_date = ?',
            [date]
        );

        // Calculate grand totals
        const totals = opdData.reduce((acc, row) => {
            acc.patient_count += parseInt(row.patient_count) || 0;
            acc.total_amount += parseFloat(row.total_amount) || 0;
            acc.total_discount += parseFloat(row.total_discount) || 0;
            acc.total_paid += parseFloat(row.total_paid) || 0;
            acc.total_balance += parseFloat(row.total_balance) || 0;
            acc.total_dr_share += parseFloat(row.total_dr_share) || 0;
            acc.total_hospital_share += parseFloat(row.total_hospital_share) || 0;
            return acc;
        }, { patient_count: 0, total_amount: 0, total_discount: 0, total_paid: 0, total_balance: 0, total_dr_share: 0, total_hospital_share: 0 });

        res.json({
            success: true,
            data: {
                date,
                shifts,
                opdSummary: opdData,
                expenses,
                shiftCash,
                totals
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get shift-specific report
export const getShiftReport = async (req, res) => {
    try {
        const { date, shiftId } = req.query;
        if (!date || !shiftId) {
            return res.status(400).json({ success: false, message: 'Date and shiftId are required' });
        }

        // Get shift info
        const shift = await query('SELECT * FROM shifts WHERE shift_id = ?', [shiftId]);
        if (shift.length === 0) {
            return res.status(404).json({ success: false, message: 'Shift not found' });
        }

        // Get all OPD records for this shift
        const opdRecords = await query(
            `SELECT * FROM opd_patient_data WHERE shift_id = ? ORDER BY time`,
            [shiftId]
        );

        // Get all expenses for this shift
        const expenses = await query(
            'SELECT * FROM expenses WHERE shift_id = ? ORDER BY expense_time',
            [shiftId]
        );

        // Get all consultant payments for this shift
        const payments = await query(
            'SELECT * FROM consultant_payments WHERE shift_id = ? ORDER BY payment_time',
            [shiftId]
        );

        // Get shift cash summary if closed
        const shiftCash = await query(
            'SELECT * FROM opd_shift_cash WHERE shift_id = ?',
            [shiftId]
        );

        // Calculate summary
        const summary = {
            patient_count: opdRecords.filter(r => !r.opd_cancelled).length,
            total_amount: opdRecords.filter(r => !r.opd_cancelled).reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0),
            total_discount: opdRecords.reduce((sum, r) => sum + parseFloat(r.discount_amount || 0), 0),
            total_paid: opdRecords.reduce((sum, r) => sum + parseFloat(r.paid || 0), 0),
            total_balance: opdRecords.reduce((sum, r) => sum + parseFloat(r.balance || 0), 0),
            total_expenses: expenses.reduce((sum, r) => sum + parseFloat(r.expense_amount || 0), 0),
            total_dr_payments: payments.reduce((sum, r) => sum + parseFloat(r.payment_amount || 0), 0),
            cancelled_count: opdRecords.filter(r => r.opd_cancelled).length,
            refund_amount: opdRecords.filter(r => r.opd_refund).reduce((sum, r) => sum + parseFloat(r.refund_amount || 0), 0)
        };
        summary.net_collection = summary.total_paid - summary.total_expenses;

        res.json({
            success: true,
            data: {
                shift: shift[0],
                opdRecords,
                expenses,
                payments,
                shiftCash: shiftCash[0] || null,
                summary
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get monthly report
export const getMonthlyReport = async (req, res) => {
    try {
        const { year, month } = req.query;
        if (!year || !month) {
            return res.status(400).json({ success: false, message: 'Year and month are required' });
        }

        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const endDate = `${year}-${month.padStart(2, '0')}-31`;

        // Get daily summaries
        const dailySummaries = await query(
            `SELECT 
        shift_date,
        COUNT(*) as patient_count,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(discount_amount), 0) as total_discount,
        COALESCE(SUM(paid), 0) as total_paid,
        COALESCE(SUM(balance), 0) as total_balance
       FROM opd_patient_data 
       WHERE shift_date BETWEEN ? AND ? AND opd_cancelled = FALSE
       GROUP BY shift_date
       ORDER BY shift_date`,
            [startDate, endDate]
        );

        // Get expense summary
        const expenseSummary = await query(
            `SELECT 
        shift_date,
        COALESCE(SUM(expense_amount), 0) as total_expense
       FROM expenses
       WHERE shift_date BETWEEN ? AND ?
       GROUP BY shift_date`,
            [startDate, endDate]
        );

        // Calculate monthly totals
        const totals = dailySummaries.reduce((acc, row) => {
            acc.patient_count += parseInt(row.patient_count) || 0;
            acc.total_amount += parseFloat(row.total_amount) || 0;
            acc.total_discount += parseFloat(row.total_discount) || 0;
            acc.total_paid += parseFloat(row.total_paid) || 0;
            acc.total_balance += parseFloat(row.total_balance) || 0;
            return acc;
        }, { patient_count: 0, total_amount: 0, total_discount: 0, total_paid: 0, total_balance: 0 });

        totals.total_expense = expenseSummary.reduce((sum, r) => sum + parseFloat(r.total_expense || 0), 0);
        totals.net_collection = totals.total_paid - totals.total_expense;

        res.json({
            success: true,
            data: {
                year,
                month,
                dailySummaries,
                expenseSummary,
                totals
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get yearly report
export const getYearlyReport = async (req, res) => {
    try {
        const { year } = req.query;
        if (!year) {
            return res.status(400).json({ success: false, message: 'Year is required' });
        }

        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        // Get monthly summaries
        const monthlySummaries = await query(
            `SELECT 
        MONTH(shift_date) as month,
        COUNT(*) as patient_count,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(discount_amount), 0) as total_discount,
        COALESCE(SUM(paid), 0) as total_paid,
        COALESCE(SUM(balance), 0) as total_balance
       FROM opd_patient_data 
       WHERE shift_date BETWEEN ? AND ? AND opd_cancelled = FALSE
       GROUP BY MONTH(shift_date)
       ORDER BY month`,
            [startDate, endDate]
        );

        // Get expense summary by month
        const expenseSummary = await query(
            `SELECT 
        MONTH(shift_date) as month,
        COALESCE(SUM(expense_amount), 0) as total_expense
       FROM expenses
       WHERE shift_date BETWEEN ? AND ?
       GROUP BY MONTH(shift_date)`,
            [startDate, endDate]
        );

        // Calculate yearly totals
        const totals = monthlySummaries.reduce((acc, row) => {
            acc.patient_count += parseInt(row.patient_count) || 0;
            acc.total_amount += parseFloat(row.total_amount) || 0;
            acc.total_discount += parseFloat(row.total_discount) || 0;
            acc.total_paid += parseFloat(row.total_paid) || 0;
            acc.total_balance += parseFloat(row.total_balance) || 0;
            return acc;
        }, { patient_count: 0, total_amount: 0, total_discount: 0, total_paid: 0, total_balance: 0 });

        totals.total_expense = expenseSummary.reduce((sum, r) => sum + parseFloat(r.total_expense || 0), 0);
        totals.net_collection = totals.total_paid - totals.total_expense;

        res.json({
            success: true,
            data: {
                year,
                monthlySummaries,
                expenseSummary,
                totals
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get service-wise report
export const getServiceReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'Start and end date are required' });
        }

        // This requires parsing service_details JSON - simplified version
        const results = await query(
            `SELECT 
        DATE(date) as report_date,
        COUNT(*) as record_count,
        COALESCE(SUM(service_amount), 0) as total_service_amount
       FROM opd_patient_data
       WHERE date BETWEEN ? AND ? AND opd_cancelled = FALSE
       GROUP BY DATE(date)
       ORDER BY report_date`,
            [startDate, endDate]
        );

        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
