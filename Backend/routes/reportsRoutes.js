import express from 'express';
import * as controller from '../controllers/reportsController.js';

const router = express.Router();

// GET daily report (all 3 shifts for a date)
router.get('/daily', controller.getDailyReport);

// GET shift-specific report
router.get('/shift', controller.getShiftReport);

// GET monthly report
router.get('/monthly', controller.getMonthlyReport);

// GET yearly report
router.get('/yearly', controller.getYearlyReport);

// GET service-wise report
router.get('/services', controller.getServiceReport);

export default router;
