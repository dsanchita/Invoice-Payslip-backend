import express from 'express';
import {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  deleteMultipleInvoices
} from '../controller/invoice.controller.js';

const router = express.Router();

// Create a new invoice - keep the route as '/create'
router.post('/create', createInvoice);

// Get all invoices with pagination and search
router.get('/get', getInvoices);

// Get single invoice
router.get('/get/:id', getInvoice);

// Update invoice
router.put('/put/:id', updateInvoice);

// Delete single invoice (fix the typo here)
router.delete('/delete/:id', deleteInvoice);

// Delete multiple invoices
router.delete('/deleteall', deleteMultipleInvoices);

export default router;