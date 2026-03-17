import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Teste = sequelize.define('Teste', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  campoUnico: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  campoObrigatorio: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  campoOpcional: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  tableName: 'teste'
});

export default Teste;