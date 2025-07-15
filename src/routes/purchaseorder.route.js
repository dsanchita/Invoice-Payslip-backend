import express from 'express';
import {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  deleteMultiplePurchaseOrders,
  downloadWordPurchaseOrder,
  downloadPdfPurchaseOrder
} from '../controller/purchaseorder.controller.js';

const router = express.Router();

// Create a new purchase order
router.post('/create', createPurchaseOrder);

// Get all purchase orders with pagination and search
router.get('/get', getPurchaseOrders);

// Get single purchase order
router.get('/get/:id', getPurchaseOrder);

// Update purchase order
router.put('/put/:id', updatePurchaseOrder);

// Delete single purchase order
router.delete('/delete/:id', deletePurchaseOrder);

// Delete multiple purchase orders
router.delete('/deleteall', deleteMultiplePurchaseOrders);

// Download purchase order in Word format
router.get('/:id/download/word', downloadWordPurchaseOrder);

// Download purchase order in PDF format
router.get('/:id/download/pdf', downloadPdfPurchaseOrder);

export default router;