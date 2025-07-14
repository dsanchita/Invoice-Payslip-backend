import express from 'express';
import {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  deleteMultipleInvoices
} from '../controllers/invoice.controller.js';
const router = express.Router();

// Create a new invoice
router.post('/create', createInvoice);

// Get all invoices with pagination and search
router.get('/get', getInvoices);

// Get single invoice
router.get('/get/:id', getInvoice);

// Update invoice
router.put('/put/:id', updateInvoice);

// Delete single invoice
router.delete('/detele/:id', deleteInvoice);

// Delete multiple invoices
router.delete('/deleteall', deleteMultipleInvoices);

export default router;