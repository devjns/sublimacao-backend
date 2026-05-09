async function sendAccessLink(whatsapp, name, accessToken) {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;
  const baseUrl = process.env.BASE_URL || 'http://localhost:3001';

  const numero = whatsapp.replace(/\D/g, '');
  const link = baseUrl + '/gallery/' + accessToken;

  const response = await fetch('https://api.z-api.io/instances/' + instanceId + '/token/' + token + '/send-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': clientToken
    },
    body: JSON.stringify({
      phone: '55' + numero,
      message: 'Ola ' + name + '! Suas telas personalizadas ficaram incriveis! Acesse o link abaixo para visualizar, escolher os tamanhos e finalizar sua compra:\n\n' + link + '\n\nQualquer duvida estamos a disposicao!'
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error('Erro Z-API: ' + JSON.stringify(data));
  }

  console.log('WhatsApp enviado para ' + whatsapp);
}

module.exports = { sendAccessLink };
