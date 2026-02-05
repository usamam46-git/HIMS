import express from 'express';
import * as controller from '../controllers/opdPatientDataController.js';

const router = express.Router();

// GET all OPD records
router.get('/', controller.getAllPatients);

// GET records by MR number
router.get('/mr/:mrNumber', controller.getPatientsByMrNumber);

// GET records by shift
router.get('/shift/:shiftId', controller.getPatientsByShift);

// GET shift summary
router.get('/shift/:shiftId/summary', controller.getShiftSummary);

// GET record by ID
router.get('/:id', controller.getPatientById);

// POST create new OPD record
router.post('/', controller.createPatient);

// PUT update OPD record
router.put('/:id', controller.updatePatient);

// PUT cancel OPD record
router.put('/:id/cancel', controller.cancelPatient);

// PUT process refund
router.put('/:id/refund', controller.refundPatient);

// PUT mark paid to doctor
router.put('/:id/paid-to-doctor', controller.markPaidToDoctor);

export default router;
