import { Progresso, User, Capitulo, Mentoria } from '../models/index.js';

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
        console.log("📚 [BIBLIOTECA] Calculando progresso real...");
        try {
            const { status = 'andamento', page = 1, limit = 5 } = req.query;
            const limitNum = parseInt(limit);
            const pageNum = parseInt(page);

            const user = await User.findOne({ where: { firebaseUid: req.user.uid } });
            
            // 1. Busca TODO o histórico do usuário
            const progressos = await Progresso.findAll({
                where: { userId: user.id },
                include: [{
                    model: Capitulo,
                    as: 'capitulo',
                    required: true,
                    include: [{ model: Mentoria, as: 'mentoria', required: true }]
                }],
                order: [['ultimaEscuta', 'DESC']] // O primeiro da lista é o que ele ouviu por último
            });

            // 2. Agrupamento e Contagem
            const mapaMentorias = new Map();

            // Precisamos saber o total de capítulos de cada mentoria.
            // Para não fazer queries dentro de loop (lento), vamos pegar os IDs das mentorias encontradas.
            const mentoriaIds = new Set();
            progressos.forEach(p => {
                if (p.capitulo?.mentoria) mentoriaIds.add(p.capitulo.mentoria.id);
            });

            // Busca contagem total de capítulos para essas mentorias
            const mentoriasInfos = await Mentoria.findAll({
                where: { id: Array.from(mentoriaIds) },
                include: [{ model: Capitulo, as: 'capitulos', attributes: ['id'] }]
            });

            // Cria um dicionário: ID da Mentoria -> Total de Capítulos
            const totaisPorMentoria = {};
            mentoriasInfos.forEach(m => {
                totaisPorMentoria[m.id] = m.capitulos.length;
            });

            // 3. Processa o status real
            progressos.forEach(p => {
                const m = p.capitulo.mentoria;
                
                if (!mapaMentorias.has(m.id)) {
                    // Inicializa o objeto da mentoria na primeira vez que a encontramos
                    mapaMentorias.set(m.id, {
                        id: m.id,
                        titulo: m.titulo,
                        subText: m.subText,
                        fotoUrl: m.fotoUrl,
                        // Como a lista está ordenada por data DESC, o primeiro registro é onde ele parou
                        ultimoCapitulo: p.capitulo.titulo, 
                        progressoCapitulo: p.segundoAtual,
                        data: p.ultimaEscuta,
                        capitulosConcluidos: new Set(), // Usamos Set para não contar o mesmo capitulo 2x
                        totalCapitulos: totaisPorMentoria[m.id] || 0
                    });
                }

                // Adiciona o capítulo ao Set de concluídos se for true
                if (p.concluido) {
                    mapaMentorias.get(m.id).capitulosConcluidos.add(p.capitulo.id);
                }
            });

            // 4. Decide se é 'andamento' ou 'concluido'
            const listaFinal = [];
            
            mapaMentorias.forEach(item => {
                const totalConcluidos = item.capitulosConcluidos.size;
                const totalExistentes = item.totalCapitulos;

                // Regra de Ouro: Só é concluído se ouviu TODOS os capítulos
                // Se totalExistentes for 0 (erro de cadastro), assumimos concluído para não travar
                const isCompleto = totalExistentes > 0 && totalConcluidos >= totalExistentes;

                const statusCalculado = isCompleto ? 'concluido' : 'andamento';

                // Filtra pelo que o Front-end pediu na query (?status=...)
                if (statusCalculado === status) {
                    listaFinal.push({
                        ...item,
                        // Removemos o Set antes de enviar o JSON
                        capitulosConcluidos: totalConcluidos, 
                        status: statusCalculado
                    });
                }
            });

            // 5. Paginação Manual
            const startIndex = (pageNum - 1) * limitNum;
            const endIndex = pageNum * limitNum;
            const dadosPaginados = listaFinal.slice(startIndex, endIndex);

            return res.status(200).json({
                data: dadosPaginados,
                pagination: {
                    page: pageNum,
                    total: listaFinal.length,
                    hasMore: endIndex < listaFinal.length
                }
            });

        } catch (error) {
            console.error("Erro biblioteca:", error);
            res.status(500).json({ error: error.message });
        }
    }
}