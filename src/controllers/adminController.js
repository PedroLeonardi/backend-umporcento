import { User, Progresso, Mentoria, Capitulo, Assinatura, FinancasConfig } from '../models/index.js';
import db from '../config/database.js';
import { Op } from 'sequelize';

export default class AdminController {

    // 👇 NOVA FUNÇÃO: Ler os custos atuais
    static async getFinancas(req, res) {
        try {
            // findOrCreate garante que, se a linha 1 não existir, o Sequelize cria-a com zeros!
            const [financas] = await FinancasConfig.findOrCreate({
                where: { id: 1 },
                defaults: { custoServidor: 0, custoMarketing: 0, outrosCustos: 0 }
            });
            return res.status(200).json(financas);
        } catch (error) {
            console.error("Erro ao ler finanças:", error);
            res.status(500).json({ error: "Erro interno do servidor." });
        }
    }

    // 👇 NOVA FUNÇÃO: Atualizar os custos pelo telemóvel
    static async updateFinancas(req, res) {
        try {
            const { custoServidor, custoMarketing, outrosCustos } = req.body;
            
            const [financas] = await FinancasConfig.findOrCreate({ where: { id: 1 } });
            
            if (custoServidor !== undefined) financas.custoServidor = parseFloat(custoServidor);
            if (custoMarketing !== undefined) financas.custoMarketing = parseFloat(custoMarketing);
            if (outrosCustos !== undefined) financas.outrosCustos = parseFloat(outrosCustos);
            
            await financas.save();
            return res.status(200).json({ message: "Custos atualizados com sucesso!", financas });
        } catch (error) {
            console.error("Erro ao atualizar finanças:", error);
            res.status(500).json({ error: "Erro interno do servidor." });
        }
    }

    // 👇 A Dashboard Atualizada
    static async getDashboardStats(req, res) {
        console.log("📊 [ADMIN] Gerando Dashboard de Inteligência de Negócios...");
        try {
            const trintaDiasAtras = new Date(new Date().setDate(new Date().getDate() - 30));

            // [MANTÉM-SE A MESMA rawStatsQuery AQUI...]
            const rawStatsQuery = `
                WITH TopMentorias AS (
                    SELECT m.titulo, COUNT(DISTINCT pu."userId") as ouvintes
                    FROM progresso_usuarios pu
                    JOIN capitulos c ON pu."capituloId" = c.id
                    JOIN mentorias m ON c."mentoriaId" = m.id
                    GROUP BY m.titulo
                    ORDER BY ouvintes DESC
                    LIMIT 5
                ),
                TopCategorias AS (
                    SELECT cat.nome as categoria, COUNT(DISTINCT pu."userId") as ouvintes
                    FROM progresso_usuarios pu
                    JOIN capitulos c ON pu."capituloId" = c.id
                    JOIN mentorias m ON c."mentoriaId" = m.id
                    JOIN mentoria_categorias mc ON mc."mentoriaId" = m.id
                    JOIN categorias cat ON mc."categoriaId" = cat.id
                    GROUP BY cat.nome
                    ORDER BY ouvintes DESC
                    LIMIT 5
                ),
                CalculoTempo AS (
                    SELECT 
                        -- 👇 TRAVA AQUI: AND pu."segundoAtual" > 0
                        COALESCE(SUM(CASE WHEN pu.concluido = false AND pu."segundoAtual" > 0 THEN pu."segundoAtual" ELSE 0 END), 0) +
                        -- 👇 TRAVA AQUI: AND c."duracaoSegundos" > 0
                        COALESCE(SUM(CASE WHEN pu.concluido = true AND c."duracaoSegundos" > 0 THEN c."duracaoSegundos" ELSE 0 END), 0) as tempo_total_segundos,
                        COUNT(DISTINCT pu."userId") as total_ouvintes
                    FROM progresso_usuarios pu
                    JOIN capitulos c ON pu."capituloId" = c.id
                )
                SELECT 
                    (SELECT json_agg(TopMentorias) FROM TopMentorias) as ranking_mentorias,
                    (SELECT json_agg(TopCategorias) FROM TopCategorias) as ranking_categorias,
                    (SELECT tempo_total_segundos FROM CalculoTempo) as tempo_total_segundos,
                    (SELECT total_ouvintes FROM CalculoTempo) as total_ouvintes;
            `;

            // Executa tudo em paralelo, incluindo a leitura dos gastos (FinancasConfig)
            const [rawStatsResult, totalUsers, activeUsers, payingUsers, financasResult] = await Promise.all([
                db.query(rawStatsQuery, { type: db.QueryTypes.SELECT }),
                User.count(),
                User.count({ where: { updatedAt: { [Op.gte]: trintaDiasAtras } } }), 
                Assinatura.count({ where: { status: 'active' } }),
                FinancasConfig.findOrCreate({ where: { id: 1 }, defaults: { custoServidor: 0, custoMarketing: 0, outrosCustos: 0 } })
            ]);

            const useStats = rawStatsResult[0] || {};
            const financas = financasResult[0]; // Extrai o objeto da tabela

            let tempoMedioMinutos = 0;
            if (useStats.total_ouvintes > 0) {
                const tempoTotalMinutos = (useStats.tempo_total_segundos || 0) / 60;
                tempoMedioMinutos = Math.round(tempoTotalMinutos / useStats.total_ouvintes);
            }
            
            const ticketMedioPresumido = 24.90;
            const lucroBrutoPresumido = payingUsers * ticketMedioPresumido;
            
            // 👇 A MÁGICA FINANCEIRA ACONTECE AQUI 👇
            const gastosFixos = (financas.custoServidor || 0) + (financas.custoMarketing || 0) + (financas.outrosCustos || 0);
            const lucroLiquidoPresumido = lucroBrutoPresumido - gastosFixos;

            return res.status(200).json({
                kpis: {
                    totalUsers,
                    activeUsers,
                    activeUsersPercentage: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
                    payingUsers,
                    payingUsersPercentage: totalUsers > 0 ? Math.round((payingUsers / totalUsers) * 100) : 0,
                    tempoMedioMinutos,
                    lucroBrutoPresumido,
                    lucroLiquidoPresumido, // Agora com o cálculo real!
                    gastosTotais: gastosFixos // Enviamos os gastos para o ecrã caso queira mostrar
                },
                rankings: {
                    mentorias: useStats.ranking_mentorias || [],
                    categorias: useStats.ranking_categorias || []
                }
            });

        } catch (error) {
            console.error("Erro ao gerar dashboard:", error);
            res.status(500).json({ error: "Erro interno do servidor." });
        }
    }
}