import { DataTypes } from 'sequelize';
import db from '../config/database.js';

const Assinatura = db.define('Assinatura', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    status: { 
        type: DataTypes.ENUM('active', 'expired', 'canceled', 'pending'), 
        defaultValue: 'pending' 
    },
    planoId: { type: DataTypes.STRING }, // ex: 'mensal_vito_01'
    dataExpiracao: { type: DataTypes.DATE },
    platform: { type: DataTypes.ENUM('ios', 'android', 'stripe', 'pix') },
    externalId: { type: DataTypes.STRING, unique: true } // ID da transação na Apple/Google
}, { tableName: 'assinaturas' });

export default Assinatura;