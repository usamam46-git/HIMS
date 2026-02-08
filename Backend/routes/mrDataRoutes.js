import express from 'express';
import {
    getAllPatients,
    getPatientByMR,
    createPatient,
    updatePatient
} from '../controllers/mrDataController.js';

const router = express.Router();

router.get('/', getAllPatients);
router.get('/:mr', getPatientByMR);
router.post('/', createPatient);
router.put('/:mr', updatePatient);

export default router;
