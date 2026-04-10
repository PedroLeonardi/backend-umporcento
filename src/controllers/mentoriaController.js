import { put , del} from '@vercel/blob';
// import Mentoria from '../models/mentoria.js';
import { Mentoria, Capitulo, Categoria } from '../models/index.js';
import { Op, fn, col, where as sequelizeWhere } from 'sequelize';
import * as mm from 'music-metadata';
import db from '../config/database.js';

const sanitize = (name) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");

export default class MentoriaController {
    
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

            // 1. Cria a mentoria sem a coluna categorias
            const novaMentoria = await Mentoria.create({
                titulo, subText, textoDescritivo, fotoUrl
            });

            // 2. Lógica de Categorias N:N
            if (categorias) {
                const listaCategorias = typeof categorias === 'string' ? JSON.parse(categorias) : categorias;
                const catPromises = listaCategorias.map(nome => 
                    Categoria.findOrCreate({ where: { nome: nome.toLowerCase().trim() } })
                );
                const catsResolvidas = await Promise.all(catPromises);
                // Associa os IDs à mentoria na tabela intermediária
                await novaMentoria.setCategorias(catsResolvidas.map(c => c[0].id));
            }

            res.status(201).json(novaMentoria);
        } catch (error) {
            res.status(500).json({ message: "Erro ao criar", error: error.message });
        }
    }

    static async updateCapituloText(req, res) {
        try {
            const { id } = req.params;
            const { titulo, textoConteudo } = req.body;

            const capitulo = await Capitulo.findByPk(id);
            if (!capitulo) return res.status(404).json({ message: "Capítulo não encontrado." });

            await capitulo.update({ titulo, textoConteudo });
            return res.status(200).json({ message: "Capítulo atualizado!", data: capitulo });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async update(req, res) {
        try {
            const { id } = req.params;
            const { titulo, subText, textoDescritivo, categorias, status } = req.body;
            const files = req.files;

            const mentoria = await Mentoria.findByPk(id);
            if (!mentoria) return res.status(404).json({ message: "Mentoria não encontrada." });

            let fotoUrl = mentoria.fotoUrl;
            if (files?.foto?.[0]) {
                const file = files.foto[0];
                const blob = await put(`mentorias/capas/${Date.now()}_${sanitize(file.originalname)}`, file.buffer, { access: 'public', contentType: file.mimetype });
                fotoUrl = blob.url;
            }

            // Atualiza campos básicos
            await mentoria.update({ titulo, subText, textoDescritivo, fotoUrl, status });

            // Atualiza Categorias N:N
            if (categorias) {
                const lista = typeof categorias === 'string' ? JSON.parse(categorias) : categorias;
                const catPromises = lista.map(nome => 
                    Categoria.findOrCreate({ where: { nome: nome.toLowerCase().trim() } })
                );
                const catsResolvidas = await Promise.all(catPromises);
                await mentoria.setCategorias(catsResolvidas.map(c => c[0].id));
            }

            res.status(200).json({ message: "Atualizado!", data: mentoria });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async reorderCapitulos(req, res) {
        try {
            const { mentoriaId } = req.params;
            const { capitulos } = req.body; // Espera um array de { id, ordem }

            // 1. Atualiza a ordem de cada capítulo enviado
            const updates = capitulos.map(cap => 
                Capitulo.update({ ordem: cap.ordem }, { where: { id: cap.id, mentoriaId } })
            );

            await Promise.all(updates);

            res.status(200).json({ message: "Ordem atualizada com sucesso!" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async getCapitulosByMentoria(req, res) {
    try {
        const { mentoriaId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows } = await Capitulo.findAndCountAll({
            where: { mentoriaId },
            limit,
            offset,
            order: [['ordem', 'ASC']]
        });

        res.status(200).json({
            totalCapitulos: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            data: rows
        });
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

                // --- 🛡️ CORREÇÃO DE DURAÇÃO (OGG/MP3) ---
                try {
                    // 1. Passamos { duration: true } para forçar o scan do arquivo se necessário
                    const metadata = await mm.parseBuffer(audioFile.buffer, audioFile.mimetype, { duration: true });
                    
                    if (metadata.format.duration) {
                        // Cenário Ideal: Metadados encontrados
                        duracaoSegundos = Math.round(metadata.format.duration);
                    } else if (metadata.format.bitrate && audioFile.size) {
                        // Cenário 2 (Fallback): OGG/VBR sem header de duração.
                        // Cálculo: (Tamanho em bits) / (Bits por segundo)
                        const sizeInBits = audioFile.size * 8;
                        duracaoSegundos = Math.round(sizeInBits / metadata.format.bitrate);
                        console.log(`⚠️ Duração estimada por bitrate: ${duracaoSegundos}s`);
                    } else {
                        // Cenário 3: Arquivo muito corrompido ou formato desconhecido
                        console.warn("⚠️ Não foi possível determinar a duração. Definindo padrão.");
                        duracaoSegundos = 0; 
                    }

                } catch (metaError) {
                    console.error("Erro crítico ao ler metadados:", metaError);
                    duracaoSegundos = 0;
                }

                // 🚨 PREVENÇÃO (Opcional): Se quiser bloquear uploads sem duração, descomente abaixo:
                /*
                if (duracaoSegundos === 0) {
                    return res.status(400).json({ message: "Não foi possível ler a duração deste áudio. Tente converter para MP3 padrão." });
                }
                */

                // Upload pro Vercel Blob
                const blob = await put(`mentorias/capitulos/audios/${Date.now()}_${sanitize(audioFile.originalname)}`, audioFile.buffer, { 
                    access: 'public', 
                    contentType: audioFile.mimetype 
                });
                audioUrl = blob.url;
            } else {
                return res.status(400).json({ message: "O arquivo de áudio é obrigatório." });
            }

            // Lógica da Foto
            if (usarFotoPrincipal === 'true' || usarFotoPrincipal === true) {
                fotoUrlCapitulo = mentoria.fotoUrl;
            } else if (files?.foto?.[0]) {
                const blob = await put(`mentorias/capitulos/fotos/${Date.now()}_${sanitize(files.foto[0].originalname)}`, files.foto[0].buffer, { access: 'public' });
                fotoUrlCapitulo = blob.url;
            }

            // SALVAMENTO NO BANCO
            const novoCapitulo = await Capitulo.create({
                titulo,
                textoConteudo,
                fotoUrl: fotoUrlCapitulo,
                audioUrl,
                ordem: parseInt(ordem) || 0,
                duracaoSegundos: duracaoSegundos, // Agora com fallback
                mentoriaId: parseInt(mentoriaId)
            });

            res.status(201).json(novoCapitulo);
        } catch (error) {
            console.error("Erro fatal ao criar capítulo:", error);
            res.status(500).json({ error: error.message });
        }
    }
    static async getExistingCategories(req, res) {
    try {
        // Essa query mágica do Sequelize/Postgres busca todos os itens 
        // dentro dos arrays JSONB e remove os duplicados.
        const results = await db.query(`
            SELECT DISTINCT unnest(categorias) as categoria 
            FROM mentorias 
            ORDER BY categoria ASC
        `, { type: db.QueryTypes.SELECT });

        const listaLimpa = results.map(r => r.categoria);
        res.status(200).json(listaLimpa);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
    static async getAll(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 5;
            const offset = (page - 1) * limit;

            const { count, rows } = await Mentoria.findAndCountAll({
                attributes: ['id', 'titulo', 'fotoUrl'],
                limit,
                offset,
                order: [['createdAt', 'DESC']]
            });

            res.status(200).json({
                totalItens: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                data: rows
            });
        } catch (error) {
            res.status(500).json({ message: "Erro ao buscar mentorias", error: error.message });
        }
    }

static async getById(req, res) {
        try {
            const { id } = req.params;
            const mentoria = await Mentoria.findByPk(id, {
                include: [
                    { model: Capitulo, as: 'capitulos' },
                    { 
                        model: Categoria, 
                        as: 'categorias', 
                        through: { attributes: [] } 
                    }
                ],
                order: [[ { model: Capitulo, as: 'capitulos' }, 'ordem', 'ASC' ]]
            });

            // 👇 Se não achar a mentoria, devolve um erro JSON bonitinho
            if (!mentoria) {
                return res.status(404).json({ message: "Mentoria não encontrada." });
            }

            const mentoriaFormatada = mentoria.toJSON();
            // Evita crash se a categoria vier nula
            mentoriaFormatada.categorias = mentoria.categorias ? mentoria.categorias.map(c => c.nome) : [];

            return res.status(200).json(mentoriaFormatada);
            
        } catch (error) {
            console.error("🔴 Erro fatal na rota getById:", error);
            // Se o banco cair, devolve JSON em vez da maldita página HTML
            return res.status(500).json({ error: "Erro interno do servidor." });
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
            include: [
                {
                    model: Categoria,
                    as: 'categorias',
                    attributes: ['nome'],
                    through: { attributes: [] },
                    // FILTRO DE CATEGORIA POR NOME
                    where: categoria ? { nome: { [Op.iLike]: categoria.trim() } } : undefined,
                    required: categoria ? true : false 
                }
            ]
        });

        const formatadas = rows.map(m => {
            const item = m.toJSON();
            item.categorias = m.categorias.map(c => c.nome);
            return item;
        });

        res.status(200).json({ totalItens: count, data: formatadas });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
static async listAllCategories(req, res) {
    try {
        const { nome } = req.query;
        const whereClause = {};

        // Se o ADM estiver digitando, filtra por aproximação
        if (nome) {
            whereClause.nome = { [Op.iLike]: `%${nome}%` };
        }

        const categorias = await Categoria.findAll({
            where: whereClause,
            attributes: ['id', 'nome'],
            order: [['nome', 'ASC']]
        });

        res.status(200).json(categorias);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
static async deleteFull(req, res) {
        const { id } = req.params;

        try {
            // 1. Buscar a mentoria com os capítulos para pegar as URLs de arquivos
            const mentoria = await Mentoria.findByPk(id, {
                include: [{ model: Capitulo, as: 'capitulos' }]
            });

            if (!mentoria) return res.status(404).json({ message: "Mentoria não encontrada." });

            const urlsToDelete = [];

            // Adiciona a foto da mentoria
            if (mentoria.fotoUrl) urlsToDelete.push(mentoria.fotoUrl);

            // Adiciona áudios e fotos customizadas dos capítulos
            mentoria.capitulos.forEach(cap => {
                if (cap.audioUrl) urlsToDelete.push(cap.audioUrl);
                if (cap.fotoUrl && cap.fotoUrl !== mentoria.fotoUrl) {
                    urlsToDelete.push(cap.fotoUrl);
                }
            });

            // 2. Deletar arquivos físicos no Vercel Blob
            // Usamos Promise.allSettled para que, se um arquivo já não existir, o processo não trave
            if (urlsToDelete.length > 0) {
                await Promise.allSettled(urlsToDelete.map(url => del(url)));
                console.log(`🧹 Arquivos deletados do storage para a mentoria ${id}`);
            }

            // 3. Excluir do Banco de Dados
            // Graças ao onDelete: 'CASCADE' configurado no seu models/index.js, 
            // deletar a mentoria apagará automaticamente os Capítulos e as Views.
            // O Progresso também será limpo pois depende do CapituloId.
            await mentoria.destroy();

            return res.status(200).json({ 
                message: "Mentoria e todos os dados vinculados excluídos com sucesso (Categorias preservadas)." 
            });

        } catch (error) {
            console.error("Erro na exclusão total:", error);
            return res.status(500).json({ error: error.message });
        }
    }

}