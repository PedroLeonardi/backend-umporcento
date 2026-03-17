import { DataTypes } from 'sequelize';
import db from '../config/database.js';

const UserMentoriaView = db.define('UserMentoriaView', {
    id: { 
        type: DataTypes.INTEGER, 
        autoIncrement: true, 
        primaryKey: true 
    },
    userId: { 
        type: DataTypes.INTEGER, 
        allowNull: false 
    },
    mentoriaId: { 
        type: DataTypes.INTEGER, 
        allowNull: false 
    },
    dataVisualizacao: { 
        type: DataTypes.DATE, 
        defaultValue: DataTypes.NOW 
    }
}, { 
    tableName: 'user_mentoria_views', 
    timestamps: false 
});

export default UserMentoriaView;