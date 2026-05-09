const db = require('../database');

function getGallery(req, res) {
  try {
    const { token } = req.params;

    const art = db.prepare('SELECT * FROM generated_arts WHERE access_token = ?').get(token);
    if (!art) return res.status(404).json({ error: 'Link inválido ou expirado.' });

    if (art.status === 'processing') {
      return res.json({ status: 'processing', message: 'Suas artes ainda estão sendo geradas...' });
    }

    if (art.status === 'error') {
      return res.status(500).json({ error: 'Ocorreu um erro ao gerar suas artes. Entre em contato.' });
    }

    const products = db.prepare('SELECT * FROM generated_products WHERE art_id = ?').all(art.id);
    const user = db.prepare('SELECT id, name, email, whatsapp FROM users WHERE id = ?').get(art.user_id);

    return res.json({
      status: 'ready',
      user,
      products,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}

module.exports = { getGallery };
