import { Router } from 'express';
import multer from 'multer';
import MentoriaController from '../controllers/mentoriaController.js';
import { checkAuth } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/adminMiddleware.js';
import { checkMasterKey } from '../middlewares/masterKeyMiddleware.js';

const router = Router();

// ==========================================
// 🛡️ BATERIA 2: Segurança no Upload (Mentorias)
// ==========================================
const uploadMentoria = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // Limite de 50MB para áudios longos e imagens RAW
    },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'foto') {
            const allowedImages = [
                'image/jpeg', 'image/png', 'image/webp', 'image/jpg',
                'image/heic', 'image/heif', 'image/dng', 'image/x-adobe-dng', 'image/raw'
            ];
            if (allowedImages.includes(file.mimetype)) return cb(null, true);
            return cb(new Error('FORMATO_FOTO_INVALIDO'));
        }
        
        if (file.fieldname === 'audio') {
            // Aceita MP3, M4A, MP4, OGG, WAV e AAC (Gravadores nativos mobile)
            const allowedAudios = [
                'audio/mpeg', 'audio/mp4', 'audio/mp3', 'audio/x-m4a', 
                'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/aac'
            ];
            if (allowedAudios.includes(file.mimetype)) return cb(null, true);
            return cb(new Error('FORMATO_AUDIO_INVALIDO'));
        }
        
        cb(new Error('CAMPO_DESCONHECIDO'));
    }
});

// Rotas
router.put('/capitulos/:id', checkAuth, isAdmin, MentoriaController.updateCapituloText);
router.get('/search', MentoriaController.search); 
router.get('/:mentoriaId/capitulos', MentoriaController.getCapitulosByMentoria); 
router.put('/:id', checkAuth, isAdmin, uploadMentoria.fields([{ name: 'foto' }]), MentoriaController.update); 
router.post('/', checkAuth, isAdmin, uploadMentoria.fields([{ name: 'foto' }]), MentoriaController.create); 
router.get('/', MentoriaController.getAll); 
router.get('/categorias/todas', MentoriaController.getExistingCategories);
router.get('/mentoriaBase/:id', MentoriaController.getById); 
router.post('/:mentoriaId/capitulos', checkAuth, isAdmin, uploadMentoria.fields([{ name: 'foto' }, { name: 'audio' }]), MentoriaController.addCapitulo);
router.get('/categorias', MentoriaController.listAllCategories);
router.delete('/full-delete/:id', checkMasterKey, MentoriaController.deleteFull);

router.delete('/capitulos/:id', checkAuth, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await Capitulo.destroy({ where: { id } });
        res.status(200).json({ message: "Capítulo removido com sucesso." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.get('/forcar-sincronia', async (req, res) => {
    await MentoriaController.syncCategoryCounts();
    res.json({ message: "Robô acordou e contou tudo!" });
});
// 👇 Tratamento de Erros de Upload
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: "O arquivo excedeu o limite máximo de 50MB." });
        }
    } else if (err.message === 'FORMATO_FOTO_INVALIDO') {
        return res.status(400).json({ message: "Formato de foto inválido (Use JPG, PNG, WEBP, HEIC, RAW)." });
    } else if (err.message === 'FORMATO_AUDIO_INVALIDO') {
        return res.status(400).json({ message: "Formato de áudio inválido (Use MP3, M4A, OGG, WAV, AAC)." });
    }
    next(err);
});

export default router;