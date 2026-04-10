import { put, del } from '@vercel/blob';
import { Mentoria, Capitulo, Categoria } from '../models/index.js';
import { Op } from 'sequelize';
import * as mm from 'music-metadata';
import db from '../config/database.js';

const sanitize = (name) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");

export default class MentoriaController {

    // Função auxiliar para garantir que o JSON de saída seja sempre estável
    static formatMentoria(mentoriaInstance) {
        if (!mentoriaInstance) return null;
        const plain = mentoriaInstance.get({ plain: true });
        
        // Garante que categorias seja sempre um array de strings
        plain.categorias = mentoriaInstance.categorias 
            ? mentoriaInstance.categorias.map(c => typeof c === 'string' ? c : c.nome) 
            : [];
            
        return plain;
    }

    static async create(req, res) {
        try {
            const { titulo, subText, textoDescritivo, categorias } = req.body;
            const files = req.files;
            let fotoUrl = null;
            const blobOptions = { access: 'public', addRandomSuffix: false };

            if (files?.foto?.[0]) {
                const file = files.foto[0];
                const path = `mentorias/capas/${Date.now()}_${sanitize(file.originalname)}`;
                const blob = await put(path, file.buffer, { ...blobOptions, contentType: file.mimetype });
                fotoUrl = blob.url;
            }

            const novaMentoria = await Mentoria.create({ titulo, subText, textoDescritivo, fotoUrl });

            if (categorias) {
                const listaCategorias = typeof categorias === 'string' ? JSON.parse(categorias) : categorias;
                const catPromises = listaCategorias.map(nome => 
                    Categoria.findOrCreate({ where: { nome: nome.toLowerCase().trim() } })
                );
                const catsResolvidas = await Promise.all(catPromises);
                await novaMentoria.setCategorias(catsResolvidas.map(c => c[0].id));
            }

            res.status(201).json(novaMentoria);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getAll(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            const { count, rows } = await Mentoria.findAndCountAll({
                where: { status: 'ativo' },
                limit,
                offset,
                order: [['createdAt', 'DESC']],
                include: [{ model: Categoria, as: 'categorias', through: { attributes: [] } }],
                distinct: true
            });

            const data = rows.map(m => MentoriaController.formatMentoria(m));

            res.status(200).json({
                totalItens: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                data
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;
            if (!id || id === 'undefined') return res.status(400).json({ error: "ID inválido" });

            const mentoria = await Mentoria.findByPk(id, {
                include: [
                    { model: Capitulo, as: 'capitulos' },
                    { model: Categoria, as: 'categorias', through: { attributes: [] } }
                ],
                order: [[ { model: Capitulo, as: 'capitulos' }, 'ordem', 'ASC' ]]
            });

            if (!mentoria) return res.status(404).json({ error: "Mentoria não encontrada" });

            res.status(200).json(MentoriaController.formatMentoria(mentoria));
        } catch (error) {
            console.error("ERRO GET_BY_ID:", error);
            res.status(500).json({ error: "Erro interno ao buscar mentoria" });
        }
    }

    static async search(req, res) {
        try {
            const { titulo, categoria, includeInactive, page = 1, limit = 10 } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            
            const whereClause = {};
            if (includeInactive !== 'true') whereClause.status = 'ativo';

            if (titulo) {
                whereClause[Op.and] = [
                    db.where(db.fn('unaccent', db.col('Mentoria.titulo')), { 
                        [Op.iLike]: db.fn('unaccent', `%${titulo}%`) 
                    })
                ];
            }

            const { count, rows } = await Mentoria.findAndCountAll({
                where: whereClause,
                limit: parseInt(limit),
                offset: offset,
                order: [['createdAt', 'DESC']],
                distinct: true, 
                include: [{
                    model: Categoria,
                    as: 'categorias',
                    where: categoria ? { nome: { [Op.iLike]: categoria.trim() } } : undefined,
                    required: !!categoria,
                    through: { attributes: [] }
                }]
            });

            const data = rows.map(m => MentoriaController.formatMentoria(m));
            res.status(200).json({ totalItens: count, data });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async addCapitulo(req, res) {
        try {
            const { mentoriaId } = req.params;
            const { titulo, textoConteudo, usarFotoPrincipal, ordem } = req.body;
            const files = req.files;

            const mentoria = await Mentoria.findByPk(mentoriaId);
            if (!mentoria) return res.status(404).json({ message: "Mentoria não encontrada" });

            let fotoUrlCapitulo = null;
            let audioUrl = null;
            let duracaoSegundos = 0;

            if (files?.audio?.[0]) {
                const audioFile = files.audio[0];
                try {
                    const metadata = await mm.parseBuffer(audioFile.buffer, audioFile.mimetype, { duration: true });
                    duracaoSegundos = metadata.format.duration ? Math.round(metadata.format.duration) : 0;
                } catch (e) { duracaoSegundos = 0; }

                const blob = await put(`mentorias/capitulos/audios/${Date.now()}_${sanitize(audioFile.originalname)}`, audioFile.buffer, { 
                    access: 'public', contentType: audioFile.mimetype 
                });
                audioUrl = blob.url;
            }

            if (usarFotoPrincipal === 'true' || usarFotoPrincipal === true) {
                fotoUrlCapitulo = mentoria.fotoUrl;
            } else if (files?.foto?.[0]) {
                const blob = await put(`mentorias/capitulos/fotos/${Date.now()}_${sanitize(files.foto[0].originalname)}`, files.foto[0].buffer, { access: 'public' });
                fotoUrlCapitulo = blob.url;
            }

            const novoCapitulo = await Capitulo.create({
                titulo, textoConteudo, fotoUrl: fotoUrlCapitulo, audioUrl,
                ordem: parseInt(ordem) || 0, duracaoSegundos, mentoriaId: parseInt(mentoriaId)
            });

            res.status(201).json(novoCapitulo);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const { titulo, subText, textoDescritivo, categorias, status } = req.body;
            const files = req.files;

            const mentoria = await Mentoria.findByPk(id);
            if (!mentoria) return res.status(404).json({ message: "Mentoria não encontrada" });

            let fotoUrl = mentoria.fotoUrl;
            if (files?.foto?.[0]) {
                const blob = await put(`mentorias/capas/${Date.now()}_${sanitize(files.foto[0].originalname)}`, files.foto[0].buffer, { access: 'public' });
                fotoUrl = blob.url;
            }

            await mentoria.update({ titulo, subText, textoDescritivo, fotoUrl, status });

            if (categorias) {
                const lista = typeof categorias === 'string' ? JSON.parse(categorias) : categorias;
                const catPromises = lista.map(nome => Categoria.findOrCreate({ where: { nome: nome.toLowerCase().trim() } }));
                const catsResolvidas = await Promise.all(catPromises);
                await mentoria.setCategorias(catsResolvidas.map(c => c[0].id));
            }

            res.status(200).json({ message: "Atualizado!", data: mentoria });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async deleteFull(req, res) {
        try {
            const mentoria = await Mentoria.findByPk(req.params.id, { include: [{ model: Capitulo, as: 'capitulos' }] });
            if (!mentoria) return res.status(404).json({ message: "Mentoria não encontrada." });
            const urls = [mentoria.fotoUrl, ...mentoria.capitulos.map(c => c.audioUrl), ...mentoria.capitulos.map(c => c.fotoUrl)].filter(u => u && u !== mentoria.fotoUrl);
            await Promise.allSettled(urls.map(url => del(url)));
            await mentoria.destroy();
            res.status(200).json({ message: "Excluído com sucesso" });
        } catch (error) { res.status(500).json({ error: error.message }); }
    }

    static async listAllCategories(req, res) {
        try {
            const { nome } = req.query;
            const whereClause = nome ? { nome: { [Op.iLike]: `%${nome}%` } } : {};
            const categorias = await Categoria.findAll({ where: whereClause, attributes: ['id', 'nome'], order: [['nome', 'ASC']] });
            res.status(200).json(categorias);
        } catch (error) { res.status(500).json({ error: error.message }); }
    }
}