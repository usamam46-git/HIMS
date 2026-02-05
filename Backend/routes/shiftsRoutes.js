import express from 'express';
import * as controller from '../controllers/shiftsController.js';

const router = express.Router();

// GET all shifts
router.get('/', controller.getAllShifts);

// GET current open shift
router.get('/current', controller.getCurrentShift);

// GET shifts by date
router.get('/date/:date', controller.getShiftsByDate);

// GET shift by ID
router.get('/:id', controller.getShiftById);

// POST open new shift
router.post('/open', controller.openShift);

// PUT close shift
router.put('/:id/close', controller.closeShift);

export default router;
