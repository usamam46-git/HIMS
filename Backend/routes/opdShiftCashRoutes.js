import express from 'express';
import * as controller from '../controllers/opdShiftCashController.js';

const router = express.Router();

// GET all shift cash records
router.get('/', controller.getAllShiftCash);

// GET daily cash summary
router.get('/daily/:date', controller.getDailyCashSummary);

// GET shift cash by shift ID
router.get('/shift/:shiftId', controller.getShiftCashByShiftId);

// GET shift cash by ID
router.get('/:id', controller.getShiftCashById);

// POST close shift with summary
router.post('/close', controller.closeShiftWithSummary);

// PUT update shift cash
router.put('/:id', controller.updateShiftCash);

export default router;
