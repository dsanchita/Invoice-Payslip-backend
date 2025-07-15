import mongoose from 'mongoose';

const purchaseOrderItemSchema = new mongoose.Schema({
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

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: { type: String, unique: true },
  poreferencevalue: { type: String },
  poDate: { type: Date, required: true },
  deliveryDate: { type: Date, required: true },
  referenceDate: { type: Date },
  currency: { type: String, default: 'USD' },
  totalAmount: { type: Number, required: true, min: 0 },
  paymentTerms: { 
    type: String, 
    enum: ['net-30', 'net-60', 'net-90', 'cod', 'advance', 'immediate'], 
    default: 'net-30' 
  },
  vendor: { type: addressSchema, required: true },
  deliverTo: { type: addressSchema, required: true },
  items: { type: [purchaseOrderItemSchema], required: true },
  totalTaxableValue: { type: Number, required: true, min: 0 },
  totalCGSTAmount: { type: Number, required: true, min: 0 },
  totalSGSTAmount: { type: Number, required: true, min: 0 },
  totalIGSTAmount: { type: Number, required: true, min: 0 },
  valueInWords: { type: String, required: true },
  withSignature: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

purchaseOrderSchema.pre('save', async function(next) {
  if (!this.isNew || this.poNumber) {
    return next();
  }
  
  try {
    const date = new Date();
    const year = date.getFullYear().toString().slice(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const datePrefix = `PO-${year}${month}${day}`;
    
    // Find the highest PO number with the same date prefix
    const lastPO = await this.constructor.findOne(
      { poNumber: new RegExp(`^${datePrefix}`) },
      {},
      { sort: { poNumber: -1 } }
    );
    
    let sequence = 1;
    if (lastPO) {
      const lastSequence = parseInt(lastPO.poNumber.split('-')[2]);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }
    
    this.poNumber = `${datePrefix}-${sequence.toString().padStart(3, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

purchaseOrderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);