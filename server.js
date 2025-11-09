const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import API handlers
const authLogin = require('./api/auth/login');
const authVerify = require('./api/auth/verify');
const productsHandler = require('./api/products');
const categoriesHandler = require('./api/categories');
const ordersHandler = require('./api/orders');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// API Routes
app.post('/api/auth/login', authLogin);
app.post('/api/auth/verify', authVerify);
app.get('/api/products', productsHandler);
app.post('/api/products', productsHandler);
app.put('/api/products', productsHandler);
app.delete('/api/products', productsHandler);
app.get('/api/categories', categoriesHandler);
app.post('/api/categories', categoriesHandler);
app.delete('/api/categories', categoriesHandler);
app.get('/api/orders', ordersHandler);
app.post('/api/orders', ordersHandler);
app.put('/api/orders', ordersHandler);
app.delete('/api/orders', ordersHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
});
