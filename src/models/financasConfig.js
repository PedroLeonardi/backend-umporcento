import { DataTypes, Model } from 'sequelize';
import db from '../config/database.js';

class FinancasConfig extends Model {}

FinancasConfig.init({
    id: { 
        type: DataTypes.INTEGER, 
        primaryKey: true, 
        autoIncrement: true 
    },
    custoServidor: { 
        type: DataTypes.FLOAT, 
        defaultValue: 0 
    },
    custoMarketing: { 
        type: DataTypes.FLOAT, 
        defaultValue: 0 
    },
    outrosCustos: { 
        type: DataTypes.FLOAT, 
        defaultValue: 0 
    }
}, {
    sequelize: db,
    modelName: 'FinancasConfig',
    tableName: 'financas_config',
    timestamps: true
});

export default FinancasConfig;