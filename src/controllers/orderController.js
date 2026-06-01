const { v4: uuidv4 } = require('uuid');
const db = require('../database');

async function createCheckout(req, res) {
  try {
    const { user_id, items } = req.body;
    console.log("Checkout recebido:", JSON.stringify({ user_id, items_count: items?.length }));

    if (!user_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Pedido invalido.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado.' });

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderId = uuidv4();

    db.prepare('INSERT INTO orders (id, user_id, total) VALUES (?, ?, ?)').run(orderId, user_id, total);

    const insertItem = db.prepare(
      'INSERT INTO order_items (id, order_id, product_id, product_name, size, price, image_url, quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const item of items) {
      insertItem.run(uuidv4(), orderId, item.product_id, item.product_name, item.size, item.price, item.image_url, item.quantity);
    }

    const mpItems = items.map(item => ({
      title: item.product_name + ' (' + item.size + ')',
      quantity: item.quantity,
      unit_price: item.price,
      currency_id: 'BRL',
    }));

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.MP_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        items: mpItems,
        payer: { name: user.name, email: user.email },
        external_reference: orderId,
        notification_url: process.env.BASE_URL + '/api/webhook/mercadopago',
        back_urls: {
          success: process.env.FRONTEND_URL + '/pedido/sucesso',
          failure: process.env.FRONTEND_URL + '/pedido/erro',
          pending: process.env.FRONTEND_URL + '/pedido/pendente',
        },
      })
    });

    const mpData = await mpResponse.json();
    console.log("MP resposta:", JSON.stringify(mpData));

    if (!mpResponse.ok) {
      console.error("Erro Mercado Pago:", JSON.stringify(mpData));
      return res.status(500).json({ error: 'Erro ao criar pagamento.' });
    }

    db.prepare('UPDATE orders SET mp_preference_id = ? WHERE id = ?').run(mpData.id, orderId);

    return res.status(201).json({
      orderId,
      checkoutUrl: mpData.sandbox_init_point,
      total,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao criar pedido.' });
  }
}

async function webhookMercadoPago(req, res) {
  try {
    const { type, data } = req.body;

    if (type === 'payment') {
      const paymentId = data.id;

      const mpResponse = await fetch('https://api.mercadopago.com/v1/payments/' + paymentId, {
        headers: { 'Authorization': 'Bearer ' + process.env.MP_ACCESS_TOKEN }
      });
      const payment = await mpResponse.json();

      if (payment.status === 'approved') {
        const orderId = payment.external_reference;
        db.prepare("UPDATE orders SET status = 'paid' WHERE id = ?").run(orderId);
        console.log('Pagamento aprovado para pedido: ' + orderId);
      }
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error('Erro webhook:', err);
    return res.sendStatus(500);
  }
}

function getProductionQueue(req, res) {
  try {
    const orders = db.prepare(`
      SELECT o.id, o.status, o.total, o.created_at,
             u.name as customer_name, u.email, u.whatsapp
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `).all();

    const ordersWithItems = orders.map(order => {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      return { ...order, items };
    });

    return res.json(ordersWithItems);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar fila.' });
  }
}

function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
    return res.json({ message: 'Status atualizado.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao atualizar status.' });
  }
}

// FIX: getUploads agora está devidamente definida e exportada
function getUploads(req, res) {
  try {
    const uploads = db.prepare(`
      SELECT a.id, a.status, a.created_at,
             u.name, u.email, u.whatsapp
      FROM generated_arts a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
    `).all();
    return res.json(uploads);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar uploads.' });
  }
}

// FIX: getUploads incluída no exports
module.exports = { createCheckout, webhookMercadoPago, getProductionQueue, updateOrderStatus, getUploads };
