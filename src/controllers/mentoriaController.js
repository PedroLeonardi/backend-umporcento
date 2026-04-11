import { put, del } from '@vercel/blob';
import { Mentoria, Capitulo, Categoria } from '../models/index.js';
import { Op } from 'sequelize';
import * as mm from 'music-metadata';
import db from '../config/database.js';

const sanitize = (name) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");

export default class MentoriaController {

    // Função interna para padronizar o JSON (Não é uma rota)
    static formatResponse(instance) {
        if (!instance) return null;
        const plain = instance.get({ plain: true });
        if (plain.categorias && Array.isArray(plain.categorias)) {
            plain.categorias = plain.categorias.map(cat => typeof cat === 'string' ? cat : (cat.nome || ''));
        } else {
            plain.categorias = [];
        }
        return plain;
    }

    static async create(req, res) {
        try {
            const { titulo, subText, textoDescritivo, categorias } = req.body;
            const files = req.files;
            let fotoUrl = null;
            if (files?.foto?.[0]) {
                const file = files.foto[0];
                fotoUrl = (await put(`mentorias/capas/${Date.now()}_${sanitize(file.originalname)}`, file.buffer, { access: 'public', contentType: file.mimetype })).url;
            }
            const novaMentoria = await Mentoria.create({ titulo, subText, textoDescritivo, fotoUrl });
            if (categorias) {
                const lista = typeof categorias === 'string' ? JSON.parse(categorias) : categorias;
                const catPromises = lista.map(nome => Categoria.findOrCreate({ where: { nome: nome.toLowerCase().trim() } }));
                const catsResolvidas = await Promise.all(catPromises);
                await novaMentoria.setCategorias(catsResolvidas.map(c => c[0].id));
            }
            res.status(201).json(novaMentoria);
        } catch (error) { res.status(500).json({ error: error.message }); }
    }

    static async getAll(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const { count, rows } = await Mentoria.findAndCountAll({
                where: { status: 'ativo' },
                limit, offset, order: [['createdAt', 'DESC']],
                include: [{ model: Categoria, as: 'categorias', through: { attributes: [] } }],
                distinct: true
            });
            const data = rows.map(m => MentoriaController.formatResponse(m));
            res.status(200).json({ totalItens: count, totalPages: Math.ceil(count / limit), currentPage: page, data });
        } catch (error) { res.status(500).json({ error: error.message }); }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;
            const mentoria = await Mentoria.findByPk(id, {
                include: [{ model: Capitulo, as: 'capitulos' }, { model: Categoria, as: 'categorias', through: { attributes: [] } }],
                order: [[ { model: Capitulo, as: 'capitulos' }, 'ordem', 'ASC' ]]
            });
            if (!mentoria) return res.status(404).json({ error: "Não encontrada" });
            res.status(200).json(MentoriaController.formatResponse(mentoria));
        } catch (error) { res.status(500).json({ error: "Erro interno" }); }
    }

    static async search(req, res) {
        try {
            const { titulo, categoria, includeInactive, page = 1, limit = 10 } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const whereClause = {};
            if (includeInactive !== 'true') whereClause.status = 'ativo';
            if (titulo) {
                whereClause[Op.and] = [db.where(db.fn('unaccent', db.col('Mentoria.titulo')), { [Op.iLike]: db.fn('unaccent', `%${titulo}%`) })];
            }
            const { count, rows } = await Mentoria.findAndCountAll({
                where: whereClause, limit: parseInt(limit), offset, order: [['createdAt', 'DESC']], distinct: true,
                include: [{ model: Categoria, as: 'categorias', where: categoria ? { nome: { [Op.iLike]: categoria.trim() } } : undefined, required: !!categoria, through: { attributes: [] } }]
            });
            const data = rows.map(m => MentoriaController.formatResponse(m));
            res.status(200).json({ totalItens: count, data });
        } catch (error) { res.status(500).json({ error: error.message }); }
    }

    static async getCapitulosByMentoria(req, res) {
        try {
            const { mentoriaId } = req.params;
            const rows = await Capitulo.findAll({ where: { mentoriaId }, order: [['ordem', 'ASC']] });
            res.status(200).json({ data: rows });
        } catch (error) { res.status(500).json({ error: error.message }); }
    }

    static async addCapitulo(req, res) {
        try {
            const { mentoriaId } = req.params;
            const { titulo, textoConteudo, usarFotoPrincipal, ordem } = req.body;
            const files = req.files;
            const mentoria = await Mentoria.findByPk(mentoriaId);
            if (!mentoria) return res.status(404).json({ message: "Mentoria não encontrada" });
            let audioUrl = "";
            let duracaoSegundos = 0;
            if (files?.audio?.[0]) {
                const audioFile = files.audio[0];
                try {
                    const metadata = await mm.parseBuffer(audioFile.buffer, audioFile.mimetype, { duration: true });
                    duracaoSegundos = Math.round(metadata.format.duration || 0);
                } catch (e) { duracaoSegundos = 0; }
                audioUrl = (await put(`mentorias/capitulos/audios/${Date.now()}_${sanitize(audioFile.originalname)}`, audioFile.buffer, { access: 'public', contentType: audioFile.mimetype })).url;
            }
            const novoCapitulo = await Capitulo.create({
                titulo, textoConteudo, audioUrl, ordem: parseInt(ordem) || 0, duracaoSegundos, mentoriaId: parseInt(mentoriaId),
                fotoUrl: (usarFotoPrincipal === 'true') ? mentoria.fotoUrl : null
            });
            res.status(201).json(novoCapitulo);
        } catch (error) { res.status(500).json({ error: error.message }); }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const mentoria = await Mentoria.findByPk(id);
            if (!mentoria) return res.status(404).json({ message: "Não encontrada" });
            await mentoria.update(req.body);
            res.status(200).json({ message: "Atualizado!" });
        } catch (error) { res.status(500).json({ error: error.message }); }
    }

    static async updateCapituloText(req, res) {
        try {
            const capitulo = await Capitulo.findByPk(req.params.id);
            if (!capitulo) return res.status(404).json({ message: "Não encontrado" });
            await capitulo.update(req.body);
            res.status(200).json({ message: "Atualizado!" });
        } catch (error) { res.status(500).json({ error: error.message }); }
    }

    static async listAllCategories(req, res) {
        try {
            const categorias = await Categoria.findAll({ order: [['nome', 'ASC']] });
            res.status(200).json(categorias);
        } catch (error) { res.status(500).json({ error: error.message }); }
    }

    static async getExistingCategories(req, res) {
        try {
            const results = await db.query(`SELECT DISTINCT unnest(categorias) as categoria FROM mentorias`, { type: db.QueryTypes.SELECT });
            res.status(200).json(results.map(r => r.categoria));
        } catch (error) { res.status(500).json({ error: error.message }); }
    }

    static async deleteFull(req, res) {
        try {
            const mentoria = await Mentoria.findByPk(req.params.id);
            if (mentoria) await mentoria.destroy();
            res.status(200).json({ message: "Excluído" });
        } catch (error) { res.status(500).json({ error: error.message }); }
    }
}