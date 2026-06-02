const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const { registerAndUpload } = require('../controllers/uploadController');
const { getGallery } = require('../controllers/galleryController');
const {
  createCheckout,
  webhookMercadoPago,
  getProductionQueue,
  updateOrderStatus,
  getUploads, // FIX: importado corretamente do orderController
} = require('../controllers/orderController');

// Upload + cadastro
router.post('/upload', upload.single('photo'), registerAndUpload);

// Galeria de artes pelo token
router.get('/gallery/:token', getGallery);

// Checkout com Mercado Pago
router.post('/orders/checkout', createCheckout);

// Webhook Mercado Pago
router.post('/webhook/mercadopago', webhookMercadoPago);

// Fila de producao (gestor)
router.get('/admin/queue', getProductionQueue);
router.patch('/admin/orders/:id/status', updateOrderStatus);

// FIX: rota agora funciona pois getUploads está importada
router.get('/admin/uploads', getUploads);

module.exports = router;
