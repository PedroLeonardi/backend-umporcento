import { Mentoria, User, Progresso, Capitulo, UserMentoriaView, Categoria } from '../models/index.js';
import { Op } from 'sequelize';
import db from '../config/database.js';

export default class RecomendacaoController {
    
    // 1. Registrar View (Permanece igual, pois usa IDs)
    static async registrarView(req, res) {
        try {
            const { mentoriaId } = req.params;
            const uid = req.user.uid; 

            // 👇 Ignora o registro se for visitante para não crachar o BD
            if (uid === 'guest') {
                return res.status(200).json({ success: true, message: "View não registrada para visitante." });
            }

            const user = await User.findOne({ where: { firebaseUid: uid } });
            if (!user) return res.status(404).json({ message: "Usuário não encontrado." });

            const [view] = await UserMentoriaView.findOrCreate({
                where: { userId: user.id, mentoriaId: mentoriaId },
                defaults: { dataVisualizacao: new Date() }
            });

            view.dataVisualizacao = new Date();
            await view.save();

            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // 2. Recomendação por PLAY (Adaptado para N:N)
    static async recomendacoesPorPlay(req, res) {
    console.log("👉 [ALG-PLAY] Iniciando via N:N...");
    try {
        // 👇 Proteção para visitante
        if (req.user.uid === 'guest') {
            console.log("   [ALG-PLAY] Visitante: Retornando vazio.");
            return res.status(200).json({ titulo: '', data: [] });
        }

        const user = await User.findOne({ where: { firebaseUid: req.user.uid } });
        if (!user) return res.status(404).json({ message: "User not found" });

        const progressos = await Progresso.findAll({
            where: { userId: user.id },
            subQuery: false, // 👈 O SEGREDO ESTÁ AQUI: Impede o erro de alias no Postgres
            include: [{ 
                model: Capitulo, 
                as: 'capitulo', 
                required: true,
                include: [{ 
                    model: Mentoria, 
                    as: 'mentoria', 
                    required: true,
                    include: [{ 
                        model: Categoria, 
                        as: 'categorias', 
                        attributes: ['nome'],
                        through: { attributes: [] }
                    }] 
                }] 
            }],
            order: [['ultimaEscuta', 'DESC']],
            limit: 15
        });

        if (progressos.length === 0) {
            console.log("   [ALG-PLAY] Histórico vazio.");
            return res.status(200).json({ titulo: '', data: [] });
        }

        let categoriasGostadas = new Set();
        let mentoriasIgnorar = new Set();

        progressos.forEach(p => {
            if (p.capitulo && p.capitulo.mentoria) {
                const m = p.capitulo.mentoria;
                mentoriasIgnorar.add(m.id);
                // No N:N, categorias é um array de objetos [{nome: '...'}, ...]
                if (m.categorias) {
                    m.categorias.forEach(cat => categoriasGostadas.add(cat.nome));
                }
            }
        });

        const arrayNomesCategorias = Array.from(categoriasGostadas);
        if (arrayNomesCategorias.length === 0) return res.status(200).json({ titulo: '', data: [] });

        // Busca as recomendadas (essa parte costuma não dar erro de subquery)
        const recomendadas = await Mentoria.findAll({
            where: {
                id: { [Op.notIn]: Array.from(mentoriasIgnorar) },
                status: 'ativo'
            },
            include: [{
                model: Categoria,
                as: 'categorias',
                where: { nome: { [Op.in]: arrayNomesCategorias } },
                through: { attributes: [] }
            }],
            limit: 5,
            order: db.random(),
            distinct: true
        });

        return res.status(200).json({ 
            tituloPrateleira: "Porque você ouviu categorias similares", 
            data: recomendadas 
        });

    } catch (error) {
        console.error("   [ALG-PLAY] Erro fatal:", error);
        return res.status(500).json({ error: error.message });
    }
}

    // 3. Recomendação por VIEW (Adaptado para N:N)
    static async recomendacoesPorView(req, res) {
        console.log("👉 [ALG-VIEW] Iniciando via N:N...");
        try {
            // 👇 Proteção para visitante
            if (req.user.uid === 'guest') {
                console.log("   [ALG-VIEW] Visitante: Retornando vazio.");
                return res.status(200).json({ titulo: '', data: [] });
            }

            const user = await User.findOne({ where: { firebaseUid: req.user.uid } });
            
            const ultimaView = await UserMentoriaView.findOne({
                where: { userId: user.id },
                order: [['dataVisualizacao', 'DESC']]
            });

            if (!ultimaView) return res.status(200).json({ titulo: '', data: [] });

            // Busca a mentoria alvo e suas categorias (N:N)
            const mentoriaAlvo = await Mentoria.findByPk(ultimaView.mentoriaId, {
                include: [{ model: Categoria, as: 'categorias', attributes: ['nome'] }]
            });

            if (!mentoriaAlvo || !mentoriaAlvo.categorias.length) {
                return res.status(200).json({ titulo: '', data: [] });
            }

            const nomesCategoriasAlvo = mentoriaAlvo.categorias.map(c => c.nome);

            // Busca similares baseadas nos nomes das categorias da mentoria alvo
            const similares = await Mentoria.findAll({
                where: {
                    id: { [Op.ne]: mentoriaAlvo.id },
                    status: 'ativo'
                },
                include: [{
                    model: Categoria,
                    as: 'categorias',
                    where: { nome: { [Op.in]: nomesCategoriasAlvo } },
                    through: { attributes: [] }
                }],
                limit: 5,
                distinct: true
            });

            return res.status(200).json({ 
                titulo: `Porque você viu "${mentoriaAlvo.titulo}"`, 
                data: similares 
            });

        } catch (error) {
            console.error("   [ALG-VIEW] Erro Crítico:", error);
            return res.status(500).json({ error: error.message });
        }
    }
}