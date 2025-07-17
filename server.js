import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'; 
import connectDB from './src/config/db.js';
import invoiceRoutes from './src/routes/invoice.route.js';
import purchaseOrderRoutes from './src/routes/purchaseorder.route.js';
import clientRoutes from './src/routes/clientDatabase.Route.js';

// Load environment variables from .env file
const dotenvResult = dotenv.config();

// Debug environment variable loading
console.log('Dotenv config result:', dotenvResult);
console.log('Current working directory:', process.cwd());
console.log('__dirname equivalent:', import.meta.url);

// Check if environment variables are loaded
console.log('\n=== Environment Variables Debug ===');
console.log('MONGO_URI:', process.env.MONGO_URI ? 'DEFINED' : 'UNDEFINED');
console.log('MONGO_URI length:', process.env.MONGO_URI?.length || 0);
console.log('PORT:', process.env.PORT || 'UNDEFINED');
console.log('=====================================\n');

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware to parse JSON bodies
app.use(express.json());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Connect to MongoDB
connectDB()
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((error) => {
    console.log(`Failed to connect to MongoDB: ${error.message}`);
    process.exit(1);
  });

app.get('/', (req, res) => {
  res.send('Hello from Express server!');
});

// Use invoice routes
app.use('/api/invoices', invoiceRoutes);
// Use purchase order routes
app.use('/api/purchaseorders', purchaseOrderRoutes);

// Use client database routes
app.use('/api/clients', clientRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});