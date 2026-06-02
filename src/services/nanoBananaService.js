const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const PRODUCTS = [
  { id: 'tela_quadrada_media', name: 'Tela Quadrada Media 30x30', base_price: 89.90, formato: 'square', dimensao: '30x30cm' },
  { id: 'tela_horizontal_media', name: 'Tela Horizontal Media 40x30', base_price: 99.90, formato: 'landscape', dimensao: '40x30cm' },
  { id: 'tela_vertical_media', name: 'Tela Vertical Media 30x40', base_price: 99.90, formato: 'portrait', dimensao: '30x40cm' },
];

async function uploadToCloudinary(imageBuffer) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'artela', resource_type: 'image' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    ).end(imageBuffer);
  });
}

async function generateProductImages(photoPath) {
  const apiKey = process.env.NANO_BANANA_API_KEY;
console.log('API KEY:', apiKey ? 'OK (' + apiKey.slice(0, 8) + '...)' : 'UNDEFINED');
if (!apiKey) throw new Error('Must supply api_key');

  const photoBuffer = fs.readFileSync(photoPath);
  const base64Photo = photoBuffer.toString('base64');
  const mimeType = photoPath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const results = [];

  for (const product of PRODUCTS) {
    try {
      console.log('Gerando tela: ' + product.name + '...');

      const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=' + apiKey;

      const body = {
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Photo
              }
            },
            {
              text: 'Transform this photo into a premium decorative canvas wall art print in ' + product.formato + ' format (' + product.dimensao + '). Apply an artistic oil painting or watercolor style while keeping the subject clearly recognizable. Show realistic canvas texture with visible stretcher bar edges on the sides. The result should look like a high-quality printed canvas product ready for sale in a home decor store.'
            }
          ]
        }],
        generationConfig: {
          responseModalities: ['IMAGE']
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Erro API ' + product.name + ':', JSON.stringify(data.error || data));
        results.push(placeholderProduct(product));
        continue;
      }

      const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
      const imagePart = parts && parts.find(function(p) { return p.inlineData || p.inline_data; });
      const imageData = imagePart && (imagePart.inlineData ? imagePart.inlineData.data : imagePart.inline_data.data);

      if (imageData) {
        const imageBuffer = Buffer.from(imageData, 'base64');
        const cloudinaryUrl = await uploadToCloudinary(imageBuffer);

        results.push({
          product_id: product.id,
          product_name: product.name,
          image_url: cloudinaryUrl,
          base_price: product.base_price,
        });
        console.log('OK: ' + product.name + ' gerada e upada no Cloudinary!');
      } else {
        console.warn('Sem imagem na resposta para ' + product.name);
        results.push(placeholderProduct(product));
      }

      await new Promise(function(resolve) { setTimeout(resolve, 3000); });

    } catch (err) {
      console.error('Erro ' + product.name + ':', err.message);
      results.push(placeholderProduct(product));
    }
  }

  return results;
}

function placeholderProduct(product) {
  return {
    product_id: product.id,
    product_name: product.name,
    image_url: 'https://placehold.co/800x800/f0e6d3/8B6914?text=' + encodeURIComponent(product.dimensao),
    base_price: product.base_price,
  };
}

module.exports = { generateProductImages, PRODUCTS };
