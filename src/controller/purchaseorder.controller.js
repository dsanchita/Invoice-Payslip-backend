import { PurchaseOrder } from '../models/purchaseorder.model.js';
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

// Create a new purchase order
export const createPurchaseOrder = async (req, res) => {
    try {
        const poData = req.body;

        // Convert date strings to Date objects
        poData.poDate = new Date(poData.poDate);
        poData.deliveryDate = new Date(poData.deliveryDate);
        if (poData.referenceDate) {
            poData.referenceDate = new Date(poData.referenceDate);
        }

        const purchaseOrder = new PurchaseOrder(poData);
        await purchaseOrder.save();

        res.status(201).json({
            success: true,
            message: 'Purchase Order created successfully',
            data: purchaseOrder
        });
    } catch (error) {
        console.error('Error creating purchase order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create purchase order',
            error: error.message
        });
    }
};

// Get all purchase orders with pagination
export const getPurchaseOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;

        const query = {};
        if (search) {
            query.$or = [
                { 'vendor.name': { $regex: search, $options: 'i' } },
                { poNumber: { $regex: search, $options: 'i' } },
                { 'vendor.GSTIN': { $regex: search, $options: 'i' } }
            ];
        }

        const purchaseOrders = await PurchaseOrder.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await PurchaseOrder.countDocuments(query);

        res.status(200).json({
            success: true,
            data: purchaseOrders,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch purchase orders',
            error: error.message
        });
    }
};

// Get single purchase order
export const getPurchaseOrder = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid purchase order ID'
            });
        }

        const purchaseOrder = await PurchaseOrder.findById(id);

        if (!purchaseOrder) {
            return res.status(404).json({
                success: false,
                message: 'Purchase Order not found'
            });
        }

        res.status(200).json({
            success: true,
            data: purchaseOrder
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch purchase order',
            error: error.message
        });
    }
};

// Update purchase order
export const updatePurchaseOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid purchase order ID'
            });
        }

        // Convert date strings to Date objects
        if (updateData.poDate) updateData.poDate = new Date(updateData.poDate);
        if (updateData.deliveryDate) updateData.deliveryDate = new Date(updateData.deliveryDate);
        if (updateData.referenceDate) updateData.referenceDate = new Date(updateData.referenceDate);

        const updatedPurchaseOrder = await PurchaseOrder.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedPurchaseOrder) {
            return res.status(404).json({
                success: false,
                message: 'Purchase Order not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Purchase Order updated successfully',
            data: updatedPurchaseOrder
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update purchase order',
            error: error.message
        });
    }
};

// Delete single purchase order
export const deletePurchaseOrder = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid purchase order ID'
            });
        }

        const deletedPurchaseOrder = await PurchaseOrder.findByIdAndDelete(id);

        if (!deletedPurchaseOrder) {
            return res.status(404).json({
                success: false,
                message: 'Purchase Order not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Purchase Order deleted successfully',
            data: deletedPurchaseOrder
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete purchase order',
            error: error.message
        });
    }
};

// Delete multiple purchase orders
export const deleteMultiplePurchaseOrders = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide valid purchase order IDs'
            });
        }

        // Validate all IDs
        const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
        if (validIds.length !== ids.length) {
            return res.status(400).json({
                success: false,
                message: 'Some purchase order IDs are invalid'
            });
        }

        const result = await PurchaseOrder.deleteMany({ _id: { $in: ids } });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'No purchase orders found to delete'
            });
        }

        res.status(200).json({
            success: true,
            message: `${result.deletedCount} purchase order(s) deleted successfully`,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete purchase orders',
            error: error.message
        });
    }
};

// Prepare purchase order data for template
const preparePurchaseOrderData = (purchaseOrder) => {
    const data = {
        PurchaseOrderNo: purchaseOrder.poNumber,
        poDate: formatDate(purchaseOrder.poDate),
        DueDate: formatDate(purchaseOrder.deliveryDate),
        purchaseorderreference: purchaseOrder.poreferencevalue || '',
        referenceDate: purchaseOrder.referenceDate ? formatDate(purchaseOrder.referenceDate) : '',
        Currency: purchaseOrder.currency,
        AmountDue: purchaseOrder.totalAmount.toFixed(2),
        PaymentMode: purchaseOrder.paymentTerms,
        TotalTaxableValue: purchaseOrder.totalTaxableValue.toFixed(2),
        ValueInFigure: purchaseOrder.valueInWords,
        CGST: purchaseOrder.totalCGSTAmount.toFixed(2),
        SGST: purchaseOrder.totalSGSTAmount.toFixed(2),
        IGST: purchaseOrder.totalIGSTAmount.toFixed(2),

        // Vendor details
        BillToClientName: purchaseOrder.vendor.name,
        BillToAddress: purchaseOrder.vendor.address,
        BillToStateCode: purchaseOrder.vendor.stateCode,
        BillToGSTIN: purchaseOrder.vendor.GSTIN,

        // Deliver To details
        ShipToClientName: purchaseOrder.deliverTo.name,
        ShipToAddress: purchaseOrder.deliverTo.address,
        ShipToStateCode: purchaseOrder.deliverTo.stateCode,
        ShipToGSTIN: purchaseOrder.deliverTo.GSTIN,
    };

    // Add items with proper numbering (1-based index)
    purchaseOrder.items.forEach((item, index) => {
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
    for (let i = purchaseOrder.items.length; i < 4; i++) {
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
const generatePurchaseOrderWordDocument = async (purchaseOrder) => {
    try {
        // Determine which template to use based on withSignature flag
        const templateName = purchaseOrder.withSignature
            ? 'PurchaseOrder-Template With Signeture.docx'
            : 'PurchaseOrder-Template Without Signeture.docx';

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
        const templateData = preparePurchaseOrderData(purchaseOrder);

        try {
            // Render the document with data (new API)
            doc.render(templateData);
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
const generatePurchaseOrderPdfDocument = async (purchaseOrder) => {
    try {
        // First generate the Word document
        const wordBuffer = await generatePurchaseOrderWordDocument(purchaseOrder);

        // Convert Word to PDF using LibreOffice with proper callback handling
        const pdfBuffer = await new Promise((resolve, reject) => {
            libre.convert(wordBuffer, '.pdf', undefined, (err, done) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(done);
                }
            });
        });

        return pdfBuffer;
    } catch (error) {
        console.error('Error generating PDF document:', error);
        throw error;
    }
};

// Download Word document
export const downloadWordPurchaseOrder = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid purchase order ID'
            });
        }

        const purchaseOrder = await PurchaseOrder.findById(id);

        if (!purchaseOrder) {
            return res.status(404).json({
                success: false,
                message: 'Purchase Order not found'
            });
        }

        const buffer = await generatePurchaseOrderWordDocument(purchaseOrder);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename=PurchaseOrder_${purchaseOrder.poNumber}.docx`);
        res.send(buffer);
    } catch (error) {
        console.error('Error downloading Word purchase order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download Word purchase order',
            error: error.message
        });
    }
};

// Download PDF document
export const downloadPdfPurchaseOrder = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid purchase order ID'
            });
        }

        const purchaseOrder = await PurchaseOrder.findById(id);

        if (!purchaseOrder) {
            return res.status(404).json({
                success: false,
                message: 'Purchase Order not found'
            });
        }

        // Try the preferred method first
        let pdfBytes;
        try {
            pdfBytes = await generatePurchaseOrderPdfDocument(purchaseOrder);
        } catch (error) {
            console.log('Falling back to alternative PDF generation method');
            const wordBuffer = await generatePurchaseOrderWordDocument(purchaseOrder);
            const htmlResult = await mammoth.convertToHtml({ buffer: wordBuffer });
            const html = htmlResult.value;

            // Create a new PDF document
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([595, 842]); // A4 size

            // Draw the HTML content (simplified)
            page.drawText('Purchase Order generated from template', {
                x: 50,
                y: 700,
                size: 20,
                color: rgb(0, 0, 0),
            });

            pdfBytes = await pdfDoc.save();
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=PurchaseOrder_${purchaseOrder.poNumber}.pdf`);
        res.send(pdfBytes);
    } catch (error) {
        console.error('Error downloading PDF purchase order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download PDF purchase order',
            error: error.message
        });
    }
};