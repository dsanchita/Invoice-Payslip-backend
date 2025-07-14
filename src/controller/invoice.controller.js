import { Invoice } from '../models/invoice.model.js';
import mongoose from 'mongoose';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { PDFDocument, rgb } from 'pdf-lib';
import { format } from 'date-fns';
import { replaceTemplatePlaceholders } from '../utils/templateUtils.js';
import docxTemplates from 'docx-templates';
import pkg from 'html-to-docx';
const { convert } = pkg;
import { exec } from 'child_process';
import libre from 'libreoffice-convert';
import { promisify } from 'util';
import mammoth from 'mammoth';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '../Templates');
const libreConvert = promisify(libre.convert);

// Helper function to format date
const formatDate = (date) => {
  return date ? format(new Date(date), 'dd/MM/yyyy') : '';
};

// Helper function to load template
const loadTemplate = async (templateName) => {
  try {
    const templatePath = path.join(TEMPLATES_DIR, templateName);
    return await fs.readFile(templatePath);
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
    ValueInFigure: invoice.
    valueInWords.toFixed(2),
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

  // Add items with proper numbering (1-based index)
  invoice.items.forEach((item, index) => {
    const itemNum = index + 1;
    data[`SL${itemNum}`] = itemNum;
    data[`Description${itemNum}`] = item.description;
    data[`HSN_SAC${itemNum}`] = item.hsnSac;
    data[`Quantity${itemNum}`] = item.quantity;
    data[`Rate${itemNum}`] = item.rate.toFixed(2);
    data[`TaxableValue${itemNum}`] = item.taxableValue.toFixed(2);
    data[`GSTRate${itemNum}`] = `${item.gstRate}%`;
    data[`GSTAmount${itemNum}`] = item.gstAmount.toFixed(2);
    data[`Total${itemNum}`] = item.total.toFixed(2);
  });

  // Fill empty rows with null to remove them from the template
  for (let i = invoice.items.length; i < 4; i++) {
    const itemNum = i + 1;
    data[`SL${itemNum}`] = null;
    data[`Description${itemNum}`] = null;
    data[`HSN_SAC${itemNum}`] = null;
    data[`Quantity${itemNum}`] = null;
    data[`Rate${itemNum}`] = null;
    data[`TaxableValue${itemNum}`] = null;
    data[`GSTRate${itemNum}`] = null;
    data[`GSTAmount${itemNum}`] = null;
    data[`Total${itemNum}`] = null;
  }

  return data;
};

// Generate Word document using the template
const generateWordDocument = async (invoice) => {
  try {
    // Determine which template to use based on withSignature flag
    const templateName = invoice.withSignature 
      ? 'Invoice-Template With Signeture.docx'  
      : 'Invoice-Template without signeture.docx';
    
    const templatePath = path.join(TEMPLATES_DIR, templateName);
    
    // Check if template exists
    try {
      await fs.access(templatePath);
    } catch (error) {
      throw new Error(`Template file not found: ${templateName}`);
    }
    
    // Read the template file
    const content = await fs.readFile(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });
    
    // Prepare the data for template replacement
    const templateData = prepareInvoiceData(invoice);
    
    // Set the template data
    doc.setData(templateData);
    
    try {
      // Render the document
      doc.render();
    } catch (error) {
      console.error('Error rendering document:', error);
      throw error;
    }
    
    // Generate the buffer
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });
    
    return buffer;
  } catch (error) {
    console.error('Error generating Word document:', error);
    throw error;
  }
};

// Generate PDF document from the Word template
const generatePdfDocument = async (invoice) => {
  try {
    // First generate the Word document
    const wordBuffer = await generateWordDocument(invoice);
    
    // Convert Word to PDF using LibreOffice
    const pdfBuffer = await libreConvert(wordBuffer, '.pdf', undefined);
    
    return pdfBuffer;
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

    // Try the preferred method first
    let pdfBytes;
    try {
      pdfBytes = await generatePdfDocument(invoice);
    } catch (error) {
      console.log('Falling back to alternative PDF generation method');
      const wordBuffer = await generateWordDocument(invoice);
      const htmlResult = await mammoth.convertToHtml({ buffer: wordBuffer });
      const html = htmlResult.value;
      
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size
      
      // Draw the HTML content (simplified)
      page.drawText('Invoice generated from template', {
        x: 50,
        y: 700,
        size: 20,
        color: rgb(0, 0, 0),
      });
      
      pdfBytes = await pdfDoc.save();
    }
    
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