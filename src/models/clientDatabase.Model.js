import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  stateCode: {
    type: String,
    required: [true, 'State code is required'],
    validate: {
      validator: function(v) {
        return /^\d{2}$/.test(v);
      },
      message: props => `${props.value} is not a valid state code! Must be 2 digits.`
    }
  },
  gstin: {
    type: String,
    required: [true, 'GSTIN is required'],
    unique: true,
    validate: {
      validator: function(v) {
        return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
      },
      message: props => `${props.value} is not a valid GSTIN!`
    }
  }
}, {
  timestamps: true
});

const Client = mongoose.model('Client', clientSchema);

export default Client;