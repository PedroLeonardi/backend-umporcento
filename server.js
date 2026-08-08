import app from './src/app.js';
import sequelize from './src/config/database.js';
import './src/models/index.js'; 
import iniciarLimpeza from './src/jobs/limpeza.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await sequelize.authenticate();
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS unaccent;');
    await sequelize.sync({ alter: true }); 
    await sequelize.sync({ force: false });
    
    console.log('Conexão com banco de dados estabelecida');
    iniciarLimpeza();
    
    // 👇 ALTERAÇÃO AQUI: Salve a instância do servidor em uma constante
    const server = app.listen(PORT, () => {
      console.log(` Servidor rodando em http://localhost:${PORT}`);
    });

    // 👇 NOVA LINHA: Aumenta o tempo limite para 5 minutos (300.000 ms)
    server.setTimeout(300000);

  } catch (error) {
    console.error('❌ Não foi possível conectar ao banco:', error);
  }
}

startServer();