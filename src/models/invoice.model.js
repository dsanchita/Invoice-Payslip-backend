import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  hsnSac: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  rate: { type: Number, required: true, min: 0 },
  taxableValue: { type: Number, required: true, min: 0 },
  gstRate: { type: Number, required: true, min: 0 },
  gstAmount: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 }
});

const addressSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  stateCode: { type: String, required: true },
  GSTIN: { type: String, required: true }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNo: { type: String, unique: true, required: true },
  poreferencevalue: { type: String },
  invoiceDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  referenceDate: { type: Date },
  currency: { type: String, default: 'USD' },
  amountDue: { type: Number, required: true, min: 0 },
  paymentMode: { 
    type: String, 
    enum: ['bank-transfer', 'credit-card', 'debit-card', 'upi', 'cash', 'cheque'], 
    default: 'bank-transfer' 
  },
  billTo: { type: addressSchema, required: true },
  shipTo: { type: addressSchema, required: true },
  items: { type: [invoiceItemSchema], required: true },
  totalTaxableValue: { type: Number, required: true, min: 0 },
  totalCGSTAmount: { type: Number, required: true, min: 0 },
  totalSGSTAmount: { type: Number, required: true, min: 0 },
  totalIGSTAmount: { type: Number, required: true, min: 0 },
  valueInWords: { type: String, required: true },
  withSignature: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

invoiceSchema.pre('save', async function(next) {
  if (!this.isNew) {
    return next();
  }
  
  try {
    const date = new Date();
    const year = date.getFullYear().toString().slice(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    const lastInvoice = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
    let sequence = 1;
    
    if (lastInvoice && lastInvoice.invoiceNo) {
      const lastSequence = parseInt(lastInvoice.invoiceNo.split('-')[3]);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }
    
    this.invoiceNo = `INV-${year}${month}${day}-${sequence.toString().padStart(3, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

invoiceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Invoice = mongoose.model('Invoice', invoiceSchema);