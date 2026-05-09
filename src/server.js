require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const routes = require('./routes');

const fs = require('fs');
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve imagens uploaded
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rotas
app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
});
