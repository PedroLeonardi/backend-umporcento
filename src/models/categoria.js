import { DataTypes } from 'sequelize';
import db from '../config/database.js';

const Categoria = db.define('Categoria', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nome: { type: DataTypes.STRING, unique: true, allowNull: false }
}, { tableName: 'categorias', timestamps: false });

export default Categoria;