const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendAccessLink(email, name, accessToken) {
  const link = `${process.env.BASE_URL}/gallery/${accessToken}`;

  await transporter.sendMail({
    from: `"Sublimação Personalizada" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Suas artes personalizadas estão prontas! 🎨',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Olá, ${name}! 👋</h2>
        <p>Suas artes personalizadas ficaram incríveis! Clique no botão abaixo para visualizar e escolher seus produtos.</p>
        <a href="${link}" style="
          display: inline-block;
          background: #6366f1;
          color: white;
          padding: 14px 28px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
          margin: 20px 0;
        ">Ver minhas artes</a>
        <p style="color: #666; font-size: 14px;">Ou copie e cole o link: ${link}</p>
      </div>
    `,
  });
}

module.exports = { sendAccessLink };
