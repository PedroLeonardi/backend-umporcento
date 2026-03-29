import { Progresso, User, Capitulo, Mentoria } from '../models/index.js';
import db from '../config/database.js'; // 👈 ADICIONE ESTA LINHA AQUI

export default class ProgressoController {
    
    // Salva o segundo exato onde o usuário parou
    static async atualizar(req, res) {
        try {
            const { capituloId, segundoAtual, concluido } = req.body;
            
            const user = await User.findOne({ where: { firebaseUid: req.user.uid } });
            if (!user) return res.status(404).json({ message: "Usuário não sincronizado." });

            // Busca o capítulo para saber a duração total
            const capitulo = await Capitulo.findByPk(capituloId);
            
            let tempoParaSalvar = segundoAtual;
            let statusConcluido = concluido;

            // 🛡️ LÓGICA DE RESET CORRIGIDA: 
            // Só faz a verificação matemática se a duração gravada no banco for maior que ZERO
            const temDuracaoValida = capitulo && capitulo.duracaoSegundos > 0;
            const chegouNoFinal = temDuracaoValida && (segundoAtual >= capitulo.duracaoSegundos - 2);

            // Marca como concluído se o frontend mandou true OU se a matemática bater
            if (concluido === true || chegouNoFinal) {
                tempoParaSalvar = 0; // Reseta para o início para a próxima vez
                statusConcluido = true;
            }

            const [registro, created] = await Progresso.upsert({
                userId: user.id,
                capituloId,
                segundoAtual: tempoParaSalvar,
                concluido: statusConcluido,
                ultimaEscuta: new Date()
            });

            return res.status(200).json(registro);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // Busca o progresso exato para o Player (Lógica dos -10s será no front)
    static async buscarPorCapitulo(req, res) {
        try {
            const { capituloId } = req.params;
            const user = await User.findOne({ where: { firebaseUid: req.user.uid } });
            
            const progresso = await Progresso.findOne({
                where: { userId: user.id, capituloId }
            });

            // Se o progresso existe e está marcado como concluído, 
            // forçamos o segundoAtual para 0 para ele ouvir do começo
            if (progresso && progresso.concluido) {
                return res.status(200).json({ ...progresso.toJSON(), segundoAtual: 0 });
            }

            res.status(200).json(progresso || { segundoAtual: 0, concluido: false });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }


    
    static async atualizarLeitura(req, res) {
        console.log("📥 [LEITURA] Recebendo requisição para salvar scroll...");
        try {
            const { mentoriaId, capituloLeituraId, scrollLeitura } = req.body;
            console.log(`📊 [LEITURA] Dados recebidos -> Mentoria: ${mentoriaId}, CapAberto: ${capituloLeituraId}, Y: ${scrollLeitura}`);

            const user = await User.findOne({ where: { firebaseUid: req.user.uid } });
            if (!user) {
                console.log("❌ [LEITURA] Usuário não encontrado.");
                return res.status(404).json({ message: "Usuário não encontrado." });
            }
            
            // Busca se ele já tem QUALQUER progresso de áudio ou leitura nessa mentoria
            let progresso = await Progresso.findOne({
                where: { userId: user.id },
                include: [{ model: Capitulo, as: 'capitulo', where: { mentoriaId } }],
                order: [['ultimaEscuta', 'DESC']]
            });

            if (progresso) {
                console.log("✅ [LEITURA] Progresso existente. Atualizando...");
                progresso.capituloLeituraId = capituloLeituraId;
                progresso.scrollLeitura = scrollLeitura;
                await progresso.save();
            } else {
                console.log("⚠️ [LEITURA] Nenhum progresso prévio. Criando primeiro registro focado na leitura...");
                progresso = await Progresso.create({
                    userId: user.id,
                    capituloId: capituloLeituraId, // Exige FK, então vinculamos ao cap de leitura
                    capituloLeituraId: capituloLeituraId,
                    scrollLeitura: scrollLeitura,
                    segundoAtual: 0,
                    concluido: false
                });
            }

            console.log("🚀 [LEITURA] Salvo com sucesso!");
            return res.status(200).json({ success: true, progresso });
        } catch (error) {
            console.error("❌ [LEITURA] Erro interno:", error);
            return res.status(500).json({ error: error.message });
        }
    }

    

    // Busca o resumo para o botão da tela de detalhes
    // Busca o resumo para o botão da tela de detalhes
    static async getResumoMentoria(req, res) {
        console.log(`🔍 [RESUMO] Buscando dados de retorno da mentoria ${req.params.mentoriaId}...`);
        try {
            const { mentoriaId } = req.params;
            const user = await User.findOne({ where: { firebaseUid: req.user.uid } });

            const ultimoProgresso = await Progresso.findOne({
                where: { userId: user.id },
                include: [{
                    model: Capitulo,
                    as: 'capitulo',
                    where: { mentoriaId },
                    required: true,
                    attributes: ['id', 'titulo', 'ordem']
                }],
                order: [['ultimaEscuta', 'DESC']]
            });

            if (!ultimoProgresso) {
                console.log("   -> Nenhum progresso encontrado.");
                const primeiroCapitulo = await Capitulo.findOne({
                    where: { mentoriaId },
                    order: [['ordem', 'ASC']]
                });

                return res.status(200).json({
                    estado: 'comecar',
                    capituloId: primeiroCapitulo ? primeiroCapitulo.id : null,
                    tituloCapitulo: primeiroCapitulo ? primeiroCapitulo.titulo : null,
                    progresso: 0,
                    capituloLeituraId: null, // <-- Faltava isso!
                    scrollLeitura: 0         // <-- Faltava isso!
                });
            }

            console.log(`   -> Progresso encontrado! Cap Leitura: ${ultimoProgresso.capituloLeituraId} | Y: ${ultimoProgresso.scrollLeitura}`);
            return res.status(200).json({
                estado: 'continuar',
                capituloId: ultimoProgresso.capituloId,
                tituloCapitulo: ultimoProgresso.capitulo.titulo,
                progresso: ultimoProgresso.segundoAtual,
                capituloLeituraId: ultimoProgresso.capituloLeituraId, // <-- Devolvemos pro Front
                scrollLeitura: ultimoProgresso.scrollLeitura          // <-- Devolvemos pro Front
            });

        } catch (error) {
            console.error("Erro resumo mentoria:", error);
            res.status(500).json({ error: error.message });
        }
    }
    // Rota da Página "Minha Biblioteca"
static async getBiblioteca(req, res) {
        console.log("📚 [BIBLIOTECA] Processando progresso diretamente no banco (SQL Otimizado)...");
        try {
            const { status = 'andamento', page = 1, limit = 5 } = req.query;
            const limitNum = parseInt(limit);
            const pageNum = parseInt(page);
            const offset = (pageNum - 1) * limitNum;

            const user = await User.findOne({ where: { firebaseUid: req.user.uid } });
            if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

            // 1. Query Principal: O Postgres agrupa as mentorias, conta os capítulos, 
            // descobre onde o usuário parou e já filtra o status (andamento/concluido).
            const query = `
                SELECT 
                    m.id, 
                    m.titulo, 
                    m."subText", 
                    m."fotoUrl",
                    MAX(p."ultimaEscuta") as "data",
                    (SELECT c2.titulo FROM capitulos c2 JOIN progresso_usuarios pu ON pu."capituloId" = c2.id WHERE c2."mentoriaId" = m.id AND pu."userId" = :userId ORDER BY pu."ultimaEscuta" DESC LIMIT 1) as "ultimoCapitulo",
                    (SELECT pu."segundoAtual" FROM capitulos c2 JOIN progresso_usuarios pu ON pu."capituloId" = c2.id WHERE c2."mentoriaId" = m.id AND pu."userId" = :userId ORDER BY pu."ultimaEscuta" DESC LIMIT 1) as "progressoCapitulo",
                    COUNT(DISTINCT c.id) AS "totalCapitulos",
                    COUNT(DISTINCT CASE WHEN p.concluido = true THEN p."capituloId" END) AS "capitulosConcluidos"
                FROM mentorias m
                JOIN capitulos c ON c."mentoriaId" = m.id
                JOIN progresso_usuarios p ON p."capituloId" = c.id AND p."userId" = :userId
                GROUP BY m.id, m.titulo, m."subText", m."fotoUrl"
                HAVING 
                    (CASE 
                        WHEN COUNT(DISTINCT c.id) > 0 AND COUNT(DISTINCT CASE WHEN p.concluido = true THEN p."capituloId" END) >= COUNT(DISTINCT c.id) THEN 'concluido'
                        ELSE 'andamento'
                    END) = :status
                ORDER BY "data" DESC
                LIMIT :limit OFFSET :offset
            `;

            // 2. Query de Contagem: Necessária para o celular saber se ainda tem botão "Ver mais"
            const countQuery = `
                SELECT COUNT(*) as total
                FROM (
                    SELECT m.id
                    FROM mentorias m
                    JOIN capitulos c ON c."mentoriaId" = m.id
                    JOIN progresso_usuarios p ON p."capituloId" = c.id AND p."userId" = :userId
                    GROUP BY m.id
                    HAVING 
                        (CASE 
                            WHEN COUNT(DISTINCT c.id) > 0 AND COUNT(DISTINCT CASE WHEN p.concluido = true THEN p."capituloId" END) >= COUNT(DISTINCT c.id) THEN 'concluido'
                            ELSE 'andamento'
                        END) = :status
                ) as subquery
            `;

            // 3. Execução paralela e direta no motor do banco de dados
            const [data, countResult] = await Promise.all([
                db.query(query, {
                    replacements: { userId: user.id, status, limit: limitNum, offset },
                    type: db.QueryTypes.SELECT
                }),
                db.query(countQuery, {
                    replacements: { userId: user.id, status },
                    type: db.QueryTypes.SELECT
                })
            ]);

            const total = parseInt(countResult[0].total, 10);

            return res.status(200).json({
                data: data,
                pagination: {
                    page: pageNum,
                    total: total,
                    hasMore: offset + data.length < total
                }
            });

        } catch (error) {
            console.error("Erro na biblioteca otimizada:", error);
            res.status(500).json({ error: error.message });
        }
    }
}