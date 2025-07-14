import express from 'express';
import {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  deleteMultipleInvoices,
  downloadWordInvoice,
  downloadPdfInvoice
} from '../controller/invoice.controller.js';

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
router.delete('/delete/:id', deleteInvoice);

// Delete multiple invoices
router.delete('/deleteall', deleteMultipleInvoices);

// Download invoice in Word format
router.get('/:id/download/word', downloadWordInvoice);

// Download invoice in PDF format
router.get('/:id/download/pdf', downloadPdfInvoice);

export default router;