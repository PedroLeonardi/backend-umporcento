import { DataTypes } from 'sequelize';
import db from '../config/database.js';

const Mentoria = db.define('Mentoria', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    titulo: { type: DataTypes.STRING, allowNull: false },
    subText: { type: DataTypes.STRING },
    textoDescritivo: { type: DataTypes.TEXT },
    fotoUrl: { type: DataTypes.STRING },
    // categorias: { type: DataTypes.JSONB, defaultValue: [] },
    status: { 
        type: DataTypes.ENUM('ativo', 'inativo'), 
        defaultValue: 'ativo' 
    }
}, { tableName: 'mentorias', timestamps: true });

export default Mentoria;