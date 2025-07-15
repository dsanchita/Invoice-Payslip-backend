import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'; 
import connectDB from './src/config/db.js';
import invoiceRoutes from './src/routes/invoice.route.js';
import purchaseOrderRoutes from './src/routes/purchaseorder.route.js';

// Load environment variables from .env file
dotenv.config();

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
    console.log('MongoDB connected');
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});