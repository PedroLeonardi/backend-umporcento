import { Router } from 'express';
import multer from 'multer';
import QuestaoController from '../controllers/questaoController.js';
import { checkAuth } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/adminMiddleware.js';

const router = Router();

// ==========================================
// 🛡️ BATERIA 2: Segurança no Upload (Questões)
// ==========================================
const uploadQuestao = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // Limite de 50MB
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
            const allowedAudios = [
                'audio/mpeg', 'audio/mp4', 'audio/mp3', 'audio/x-m4a', 
                'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/aac'
            ];
            if (allowedAudios.includes(file.mimetype)) return cb(null, true);
            return cb(new Error('FORMATO_AUDIO_INVALIDO'));
        }
        
        cb(null, true);
    }
});

const uploadFields = uploadQuestao.fields([
    { name: 'foto', maxCount: 1 },
    { name: 'audio', maxCount: 1 }
]);

// Rotas (Protegidas)
router.post('/', checkAuth, isAdmin, uploadFields, QuestaoController.createQuestao);
router.get('/:id', checkAuth, QuestaoController.getQuestaoById);

// 👇 Tratamento de Erros
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