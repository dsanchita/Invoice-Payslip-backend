import express from 'express';
import {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient
} from '../controller/clientDatabase.Controller.js';

const router = express.Router();

// Client routes
router.post('/create', createClient);
router.get('/get', getClients);
router.get('/get/:id', getClient);
router.put('/update/:id', updateClient);
router.delete('/delete/:id', deleteClient);

export default router;