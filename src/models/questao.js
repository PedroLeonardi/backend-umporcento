import { DataTypes } from 'sequelize';
import db from '../config/database.js'; 
const Questao = db.define('Questao', {
    texto: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    fotoUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    audioUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
});

export default Questao;