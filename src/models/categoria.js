import { DataTypes } from 'sequelize';
import db from '../config/database.js';

const Categoria = db.define('Categoria', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nome: { type: DataTypes.STRING, unique: true, allowNull: false },
    
    // 👇 NOVA COLUNA PARA OTIMIZAÇÃO DE PROCESSAMENTO
    quantidadeMentorias: { 
        type: DataTypes.INTEGER, 
        defaultValue: 0,
        comment: 'Cache do total de mentorias ativas nesta categoria'
    }
}, { tableName: 'categorias', timestamps: false });

export default Categoria;