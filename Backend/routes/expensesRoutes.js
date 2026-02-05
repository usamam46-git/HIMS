import express from 'express';
import * as controller from '../controllers/expensesController.js';

const router = express.Router();

// GET all expenses
router.get('/', controller.getAllExpenses);

// GET expense summary by date
router.get('/summary/:date', controller.getExpenseSummaryByDate);

// GET expenses by shift
router.get('/shift/:shiftId', controller.getExpensesByShift);

// GET expense by ID
router.get('/:id', controller.getExpenseById);

// POST create new expense
router.post('/', controller.createExpense);

// PUT update expense
router.put('/:id', controller.updateExpense);

// DELETE expense
router.delete('/:id', controller.deleteExpense);

export default router;
