import express from 'express';
import * as controller from '../controllers/opdServicesController.js';

const router = express.Router();

// GET all services
router.get('/', controller.getAllServices);

// GET service heads/categories
router.get('/heads', controller.getServiceHeads);

// GET services by head
router.get('/head/:head', controller.getServicesByHead);

// GET service by ID
router.get('/:id', controller.getServiceById);

// POST create new service
router.post('/', controller.createService);

// PUT update service
router.put('/:id', controller.updateService);

// DELETE service (soft delete)
router.delete('/:id', controller.deleteService);

export default router;
