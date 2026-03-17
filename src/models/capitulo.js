import { DataTypes } from 'sequelize';
import db from '../config/database.js';

const Capitulo = db.define('Capitulo', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    titulo: { type: DataTypes.STRING, allowNull: false },
    textoConteudo: { type: DataTypes.TEXT },
    audioUrl: { type: DataTypes.STRING, allowNull: false }, // Agora o áudio é obrigatório aqui
    fotoUrl: { type: DataTypes.STRING }, // Pode ser nulo se usar a da mentoria
    ordem: { 
        type: DataTypes.INTEGER, 
        defaultValue: 0,
        comment: 'Define a sequência dos capítulos (1, 2, 3...)'
    },
    duracaoSegundos: { 
        type: DataTypes.INTEGER, 
        comment: 'Duração total do áudio para o frontend calcular a barra de progresso'
    }
}, { tableName: 'capitulos', timestamps: true });

export default Capitulo;