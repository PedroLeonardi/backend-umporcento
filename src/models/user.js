import { DataTypes } from 'sequelize';
import db from '../config/database.js';

const User = db.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    firebaseUid: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
    },
    nome: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING, unique: true },
    foto: { type: DataTypes.STRING },
    provedor: { 
        type: DataTypes.STRING, // 'google.com' ou 'password'
        allowNull: false 
    },
    role: {
        type: DataTypes.ENUM('user', 'admin'),
        defaultValue: 'user'
    }
}, { 
    tableName: 'usuarios',
    timestamps: true 
});

export default User;