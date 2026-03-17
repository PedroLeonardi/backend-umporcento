import app from './src/app.js';
import sequelize from './src/config/database.js';
import './src/models/index.js'; // IMPORTANTE: Carrega os relacionamentos
import iniciarLimpeza from './src/jobs/limpeza.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Autentica e sincroniza o banco
    await sequelize.authenticate();
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS unaccent;');
    await sequelize.sync({ alter: true }); // quando for alterar as colunas habilitar
    await sequelize.sync({ force: false });
    
    console.log('Conexão com banco de dados estabelecida');
iniciarLimpeza();
    app.listen(PORT, () => {
      console.log(` Servidor rodando em http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Não foi possível conectar ao banco:', error);
  }
}

startServer();