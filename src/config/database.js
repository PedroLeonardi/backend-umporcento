import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Prioriza a URL do Postgres (Neon), se não existir, usa as credenciais locais
const sequelize = process.env.POSTGRES_URL 
  ? new Sequelize(process.env.POSTGRES_URL, {
      dialect: 'postgres',
      protocol: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false // Essencial para o Neon aceitar a conexão
        }
      },
      logging: false,
    })
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASS,
      {
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT || 'mysql',
        logging: false,
      }
    );

export default sequelize;