import express from 'express';
import * as controller from '../controllers/consultantPaymentsController.js';

const router = express.Router();

// GET all payments
router.get('/', controller.getAllPayments);

// GET pending payments
router.get('/pending', controller.getPendingPayments);

// GET doctor payment summary
router.get('/summary', controller.getDoctorPaymentSummary);

// GET payments by doctor
router.get('/doctor/:doctorName', controller.getPaymentsByDoctor);

// GET payment by ID
router.get('/:id', controller.getPaymentById);

// POST create new payment
router.post('/', controller.createPayment);

// PUT update payment
router.put('/:id', controller.updatePayment);

// DELETE payment
router.delete('/:id', controller.deletePayment);

export default router;
