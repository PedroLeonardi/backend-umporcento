import {supabase} from "../config/supabase.js"
import Questao from '../models/questao.js';


// Inicializa o cliente do Supabase para o Storage

const sanitizeFileName = (name) => {
    return name
        .normalize("NFD")               // Decompõe caracteres acentuados (ã -> a + ~)
        .replace(/[\u0300-\u036f]/g, "") // Remove os acentos
        .replace(/\s+/g, "_")            // Substitui espaços por underscores
        .replace(/[^a-zA-Z0-9._-]/g, ""); // Remove qualquer coisa que não seja letra, número, ponto ou traço
};

export default class QuestaoController {
    
    // Método POST: Cria questão e faz upload dos arquivos
    static async createQuestao(req, res) {
        try {
            const { texto } = req.body;
            const files = req.files;

            if (!texto) {
                return res.status(400).json({ message: "O campo texto é obrigatório." });
            }

            
            let fotoUrl = null;
            let audioUrl = null;

            
            
            // Lógica de upload da Foto
           if (files && files.foto) {
    const fotoFile = files.foto[0];
    const cleanName = sanitizeFileName(fotoFile.originalname); // LIMPEZA AQUI
    const fileName = `fotos/${Date.now()}_${cleanName}`;
                
                const { data, error } = await supabase.storage
                    .from('questoes-bucket') // Certifique-se que o bucket é público no painel do Supabase
                    .upload(fileName, fotoFile.buffer, { contentType: fotoFile.mimetype });

                if (error) throw error;
                fotoUrl = supabase.storage.from('questoes-bucket').getPublicUrl(fileName).data.publicUrl;
            }

            // Lógica de upload do Áudio
if (files && files.audio) {
    const audioFile = files.audio[0];
    const cleanName = sanitizeFileName(audioFile.originalname); // LIMPEZA AQUI
    const fileName = `audios/${Date.now()}_${cleanName}`;
                
                const { data, error } = await supabase.storage
                    .from('questoes-bucket')
                    .upload(fileName, audioFile.buffer, { contentType: audioFile.mimetype });

                if (error) throw error;
                audioUrl = supabase.storage.from('questoes-bucket').getPublicUrl(fileName).data.publicUrl;
            }

            // Salva no banco de dados via Sequelize
            const novaQuestao = await Questao.create({
                texto,
                fotoUrl,
                audioUrl
            });

            return res.status(201).json(novaQuestao);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Erro ao criar questão", error: error.message });
        }
    }

    // Método GET: Busca uma questão pelo ID
    static async getQuestaoById(req, res) {
        const { id } = req.params;

        try {
            const questao = await Questao.findByPk(id);

            if (!questao) {
                return res.status(404).json({ message: "Questão não encontrada." });
            }

            return res.status(200).json(questao);
        } catch (error) {
            return res.status(500).json({ message: "Erro ao buscar questão", error: error.message });
        }
    }
}