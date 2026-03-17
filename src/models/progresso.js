import { DataTypes } from 'sequelize';
import db from '../config/database.js';

const Progresso = db.define('Progresso', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    // --- CORREÇÃO: Chaves explícitas são obrigatórias para N:M com "through" ---
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE'
    },
    capituloId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'capitulos', key: 'id' },
        onDelete: 'CASCADE'
    },
    // --------------------------------------------------------------------------
    segundoAtual: { 
        type: DataTypes.INTEGER, 
        defaultValue: 0,
        allowNull: false
    },
    concluido: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: false 
    },
    ultimaEscuta: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    capituloLeituraId: { 
      type: DataTypes.INTEGER, 
      allowNull: true,
      comment: "Guarda qual capítulo estava expandido na tela de texto"
  },
  scrollLeitura: { 
      type: DataTypes.INTEGER, 
      defaultValue: 0,
      comment: "Guarda a posição exata do scroll Y"
  }
}, { 
    tableName: 'progresso_usuarios',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['userId', 'capituloId']
        }
    ]
});

export default Progresso;