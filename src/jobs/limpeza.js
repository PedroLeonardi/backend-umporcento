import cron from 'node-cron';
import { Op } from 'sequelize';
import { Progresso } from '../models/index.js';

// Roda todo dia à meia-noite (00:00)
// A string '0 0 * * *' significa minuto 0, hora 0, todo dia
const iniciarLimpeza = () => {
    cron.schedule('0 0 * * *', async () => {
        console.log('🧹 [JOB] Iniciando limpeza de progressos antigos...');
        
        try {
            // Data limite: Hoje menos 6 meses
            const dataLimite = new Date();
            dataLimite.setMonth(dataLimite.getMonth() - 12); // Subtrai 12 meses (1 ano)

            const deletados = await Progresso.destroy({
                where: {
                    ultimaEscuta: {
                        [Op.lt]: dataLimite // "lt" = Less Than (Menor que)
                    }
                }
            });

            if (deletados > 0) {
                console.log(`🗑️ [JOB] Sucesso! ${deletados} registros de progresso antigos foram apagados.`);
            } else {
                console.log('✨ [JOB] Nenhum registro antigo para limpar hoje.');
            }

        } catch (error) {
            console.error('❌ [JOB] Erro ao limpar banco:', error);
        }
    });
};

export default iniciarLimpeza;