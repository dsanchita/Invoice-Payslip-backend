import { Invoice } from '../models/invoice.model.js';
import mongoose from 'mongoose';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { PDFDocument, rgb } from 'pdf-lib';
import { format } from 'date-fns';
import {replaceTemplatePlaceholders} from '../utils/templateUtils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '../Templates');

// Helper function to format date
const formatDate = (date) => {
  return date ? format(new Date(date), 'dd/MM/yyyy') : '';
};

// Helper function to load template
const loadTemplate = async (templateName) => {
  try {
    const templatePath = path.join(TEMPLATES_DIR, templateName);
    return await fs.readFile(templatePath, 'utf8');
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    throw error;
  }
};

// Create a new invoice
export const createInvoice = async (req, res) => {
  try {
    const invoiceData = req.body;
    
    // Convert date strings to Date objects
    invoiceData.invoiceDate = new Date(invoiceData.invoiceDate);
    invoiceData.dueDate = new Date(invoiceData.dueDate);
    if (invoiceData.referenceDate) {
      invoiceData.referenceDate = new Date(invoiceData.referenceDate);
    }

    const invoice = new Invoice(invoiceData);
    await invoice.save();
    
    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create invoice',
      error: error.message
    });
  }
};

// Get all invoices with pagination
export const getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { 'billTo.name': { $regex: search, $options: 'i' } },
        { invoiceNo: { $regex: search, $options: 'i' } },
        { 'billTo.GSTIN': { $regex: search, $options: 'i' } }
      ];
    }
    
    const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    const count = await Invoice.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: invoices,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices',
      error: error.message
    });
  }
};

// Get single invoice
export const getInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID'
      });
    }
    
    const invoice = await Invoice.findById(id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice',
      error: error.message
    });
  }
};

// Update invoice
export const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID'
      });
    }
    
    // Convert date strings to Date objects
    if (updateData.invoiceDate) updateData.invoiceDate = new Date(updateData.invoiceDate);
    if (updateData.dueDate) updateData.dueDate = new Date(updateData.dueDate);
    if (updateData.referenceDate) updateData.referenceDate = new Date(updateData.referenceDate);
    
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: updatedInvoice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update invoice',
      error: error.message
    });
  }
};

// Delete single invoice
export const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID'
      });
    }
    
    const deletedInvoice = await Invoice.findByIdAndDelete(id);
    
    if (!deletedInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully',
      data: deletedInvoice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete invoice',
      error: error.message
    });
  }
};

// Delete multiple invoices
export const deleteMultipleInvoices = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid invoice IDs'
      });
    }
    
    // Validate all IDs
    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== ids.length) {
      return res.status(400).json({
        success: false,
        message: 'Some invoice IDs are invalid'
      });
    }
    
    const result = await Invoice.deleteMany({ _id: { $in: ids } });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No invoices found to delete'
      });
    }
    
    res.status(200).json({
      success: true,
      message: `${result.deletedCount} invoice(s) deleted successfully`,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete invoices',
      error: error.message
    });
  }
};

// Prepare invoice data for template
const prepareInvoiceData = (invoice) => {
  const data = {
    InvoiceNo: invoice.invoiceNo,
    InvoiceDate: formatDate(invoice.invoiceDate),
    DueDate: formatDate(invoice.dueDate),
    purchaseorderreference: invoice.poreferencevalue || '',
    referenceDate: invoice.referenceDate ? formatDate(invoice.referenceDate) : '',
    Currency: invoice.currency,
    AmountDue: invoice.amountDue.toFixed(2),
    PaymentMode: invoice.paymentMode,
    TotalTaxableValue: invoice.totalTaxableValue.toFixed(2),
    ValueInFigure: invoice.amountDue.toFixed(2),
    CGST: invoice.totalCGSTAmount.toFixed(2),
    SGST: invoice.totalSGSTAmount.toFixed(2),
    IGST: invoice.totalIGSTAmount.toFixed(2),
    
    // Bill To details
    BillToClientName: invoice.billTo.name,
    BillToAddress: invoice.billTo.address,
    BillToStateCode: invoice.billTo.stateCode,
    BillToGSTIN: invoice.billTo.GSTIN,
    BillToPAN: invoice.billTo.PAN || '',
    
    // Ship To details
    ShipToClientName: invoice.shipTo.name,
    ShipToAddress: invoice.shipTo.address,
    ShipToStateCode: invoice.shipTo.stateCode,
    ShipToGSTIN: invoice.shipTo.GSTIN,
    ShipToPAN: invoice.shipTo.PAN || '',
  };

  // Add items
  invoice.items.forEach((item, index) => {
    const itemNum = index + 1;
    data[`Description${itemNum}`] = item.description;
    data[`HSN_SAC${itemNum}`] = item.hsnSac;
    data[`Quantity${itemNum}`] = item.quantity;
    data[`Rate${itemNum}`] = item.rate.toFixed(2);
    data[`TaxableValue${itemNum}`] = item.taxableValue.toFixed(2);
    data[`GSTRate${itemNum}`] = `${item.gstRate}%`;
    data[`GSTAmount${itemNum}`] = item.gstAmount.toFixed(2);
    data[`Total${itemNum}`] = item.total.toFixed(2);
  });

  return data;
};

// Generate Word document
const generateWordDocument = async (invoice) => {
  try {
    // Fixed template names to match your actual files
    const templateName = invoice.withSignature 
      ? 'Invoice-Template With Signeture.docx'  // Note: keeping the typo as it matches your file
      : 'Invoice-Template without signeture.docx';
    
    const templatePath = path.join(TEMPLATES_DIR, templateName);
    
    // Check if file exists first
    try {
      await fs.access(templatePath);
    } catch (error) {
      throw new Error(`Template file not found: ${templateName}`);
    }
    
    const templateBuffer = await fs.readFile(templatePath);
    
    // For Word, we'll just return the template for now
    // In a real implementation, you'd use a library like docx-templates to replace placeholders
    return templateBuffer;
  } catch (error) {
    console.error('Error generating Word document:', error);
    throw error;
  }
};

// Generate PDF document with better error handling and template processing
const generatePdfDocument = async (invoice) => {
  try {
    // Create a comprehensive PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();
    
    // Header
    page.drawText('TAX INVOICE', {
      x: 50,
      y: height - 50,
      size: 20,
      color: rgb(0, 0, 0),
    });
    
    // Invoice details
    let yPosition = height - 100;
    const lineHeight = 20;
    
    page.drawText(`Invoice No: ${invoice.invoiceNo}`, {
      x: 50,
      y: yPosition,
      size: 12,
      color: rgb(0, 0, 0),
    });
    
    page.drawText(`Date: ${formatDate(invoice.invoiceDate)}`, {
      x: 300,
      y: yPosition,
      size: 12,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= lineHeight * 2;
    
    // Bill To section
    page.drawText('BILL TO:', {
      x: 50,
      y: yPosition,
      size: 14,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= lineHeight;
    page.drawText(`${invoice.billTo.name}`, {
      x: 50,
      y: yPosition,
      size: 12,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= lineHeight;
    page.drawText(`${invoice.billTo.address}`, {
      x: 50,
      y: yPosition,
      size: 10,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= lineHeight;
    page.drawText(`GSTIN: ${invoice.billTo.GSTIN}`, {
      x: 50,
      y: yPosition,
      size: 10,
      color: rgb(0, 0, 0),
    });
    
    // Ship To section
    yPosition = height - 100 - lineHeight * 2;
    page.drawText('SHIP TO:', {
      x: 300,
      y: yPosition,
      size: 14,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= lineHeight;
    page.drawText(`${invoice.shipTo.name}`, {
      x: 300,
      y: yPosition,
      size: 12,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= lineHeight;
    page.drawText(`${invoice.shipTo.address}`, {
      x: 300,
      y: yPosition,
      size: 10,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= lineHeight;
    page.drawText(`GSTIN: ${invoice.shipTo.GSTIN}`, {
      x: 300,
      y: yPosition,
      size: 10,
      color: rgb(0, 0, 0),
    });
    
    // Items table header
    yPosition = height - 300;
    page.drawText('Description', { x: 50, y: yPosition, size: 10, color: rgb(0, 0, 0) });
    page.drawText('HSN/SAC', { x: 200, y: yPosition, size: 10, color: rgb(0, 0, 0) });
    page.drawText('Qty', { x: 280, y: yPosition, size: 10, color: rgb(0, 0, 0) });
    page.drawText('Rate', { x: 320, y: yPosition, size: 10, color: rgb(0, 0, 0) });
    page.drawText('Amount', { x: 380, y: yPosition, size: 10, color: rgb(0, 0, 0) });
    page.drawText('GST', { x: 450, y: yPosition, size: 10, color: rgb(0, 0, 0) });
    page.drawText('Total', { x: 500, y: yPosition, size: 10, color: rgb(0, 0, 0) });
    
    // Items
    yPosition -= lineHeight;
    invoice.items.forEach((item, index) => {
      if (yPosition < 100) return; // Prevent overflow
      
      page.drawText(item.description.substring(0, 20), { x: 50, y: yPosition, size: 9, color: rgb(0, 0, 0) });
      page.drawText(item.hsnSac, { x: 200, y: yPosition, size: 9, color: rgb(0, 0, 0) });
      page.drawText(item.quantity.toString(), { x: 280, y: yPosition, size: 9, color: rgb(0, 0, 0) });
      page.drawText(item.rate.toFixed(2), { x: 320, y: yPosition, size: 9, color: rgb(0, 0, 0) });
      page.drawText(item.taxableValue.toFixed(2), { x: 380, y: yPosition, size: 9, color: rgb(0, 0, 0) });
      page.drawText(`${item.gstRate}%`, { x: 450, y: yPosition, size: 9, color: rgb(0, 0, 0) });
      page.drawText(item.total.toFixed(2), { x: 500, y: yPosition, size: 9, color: rgb(0, 0, 0) });
      
      yPosition -= lineHeight;
    });
    
    // Totals
    yPosition -= lineHeight;
    page.drawText(`Total Taxable Value: ${invoice.currency} ${invoice.totalTaxableValue.toFixed(2)}`, {
      x: 300,
      y: yPosition,
      size: 12,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= lineHeight;
    page.drawText(`CGST: ${invoice.currency} ${invoice.totalCGSTAmount.toFixed(2)}`, {
      x: 300,
      y: yPosition,
      size: 12,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= lineHeight;
    page.drawText(`SGST: ${invoice.currency} ${invoice.totalSGSTAmount.toFixed(2)}`, {
      x: 300,
      y: yPosition,
      size: 12,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= lineHeight;
    page.drawText(`IGST: ${invoice.currency} ${invoice.totalIGSTAmount.toFixed(2)}`, {
      x: 300,
      y: yPosition,
      size: 12,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= lineHeight * 2;
    page.drawText(`Total Amount Due: ${invoice.currency} ${invoice.amountDue.toFixed(2)}`, {
      x: 300,
      y: yPosition,
      size: 14,
      color: rgb(0, 0, 0),
    });
    
    // Payment details
    yPosition -= lineHeight * 2;
    page.drawText(`Payment Mode: ${invoice.paymentMode}`, {
      x: 50,
      y: yPosition,
      size: 12,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= lineHeight;
    page.drawText(`Due Date: ${formatDate(invoice.dueDate)}`, {
      x: 50,
      y: yPosition,
      size: 12,
      color: rgb(0, 0, 0),
    });
    
    // Signature (if required)
    if (invoice.withSignature) {
      page.drawText('Authorized Signatory', {
        x: 400,
        y: 100,
        size: 12,
        color: rgb(0, 0, 0),
      });
    }
    
    return await pdfDoc.save();
  } catch (error) {
    console.error('Error generating PDF document:', error);
    throw error;
  }
};

// Download Word document
export const downloadWordInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID'
      });
    }
    
    const invoice = await Invoice.findById(id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const buffer = await generateWordDocument(invoice);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice_${invoice.invoiceNo}.docx`);
    res.send(buffer);
  } catch (error) {
    console.error('Error downloading Word invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download Word invoice',
      error: error.message
    });
  }
};

// Download PDF document
export const downloadPdfInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID'
      });
    }
    
    const invoice = await Invoice.findById(id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const pdfBytes = await generatePdfDocument(invoice);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice_${invoice.invoiceNo}.pdf`);
    res.send(pdfBytes);
  } catch (error) {
    console.error('Error downloading PDF invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download PDF invoice',
      error: error.message
    });
  }
};