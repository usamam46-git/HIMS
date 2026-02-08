import express from 'express';
import {
    getAllDoctors,
    getDoctorById,
    createDoctor,
    updateDoctor,
    deleteDoctor,
    getDoctorsByDepartment,
    getDepartments
} from '../controllers/doctorsController.js';

const router = express.Router();

// Get all departments
router.get('/departments', getDepartments);

// Get doctors by department
router.get('/department/:department', getDoctorsByDepartment);

// CRUD routes
router.get('/', getAllDoctors);
router.get('/:id', getDoctorById);
router.post('/', createDoctor);
router.put('/:id', updateDoctor);
router.delete('/:id', deleteDoctor);

export default router;
