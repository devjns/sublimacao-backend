const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { generateProductImages } = require('../services/nanoBananaService');
const { sendAccessLink } = require('../services/whatsappService');

async function registerAndUpload(req, res) {
  try {
    const { name, email, whatsapp } = req.body;
    const photo = req.file;

    if (!name || !email || !whatsapp || !photo) {
      return res.status(400).json({ error: 'Todos os campos sao obrigatorios.' });
    }

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      const userId = uuidv4();
      db.prepare('INSERT INTO users (id, name, email, whatsapp) VALUES (?, ?, ?, ?)')
        .run(userId, name, email, whatsapp);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    }

    const artId = uuidv4();
    const accessToken = uuidv4();
    db.prepare('INSERT INTO generated_arts (id, user_id, original_photo, access_token) VALUES (?, ?, ?, ?)')
      .run(artId, user.id, photo.filename, accessToken);

    processArt(artId, photo.path, user, accessToken);

    return res.status(201).json({
      message: 'Foto recebida! Em breve voce recebera o link pelo WhatsApp.',
      artId,
      accessToken,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}

async function processArt(artId, photoPath, user, accessToken) {
  try {
    const products = await generateProductImages(photoPath);

    const insertProduct = db.prepare(
      'INSERT INTO generated_products (id, art_id, product_id, product_name, image_url, base_price) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const p of products) {
      insertProduct.run(uuidv4(), artId, p.product_id, p.product_name, p.image_url, p.base_price);
    }

    db.prepare("UPDATE generated_arts SET status = 'ready' WHERE id = ?").run(artId);
    console.log('Arte processada para ' + user.email + ' — token: ' + accessToken);

    try {
      await sendAccessLink(user.whatsapp, user.name, accessToken);
    } catch (waErr) {
      console.warn('WhatsApp nao enviado: ' + waErr.message);
    }

  } catch (err) {
    console.error('Erro ao processar arte:', err);
    db.prepare("UPDATE generated_arts SET status = 'error' WHERE id = ?").run(artId);
  }
}

module.exports = { registerAndUpload };
