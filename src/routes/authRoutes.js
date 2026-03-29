import { Router } from 'express';
import multer from 'multer';
import AuthController from '../controllers/authController.js';
import { checkAuth } from '../middlewares/authMiddleware.js';

const router = Router();

// ==========================================
// 🛡️ BATERIA 2: Segurança no Upload (Perfil)
// ==========================================
const uploadProfile = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 15 * 1024 * 1024, // Limite de 15MB (Aumentado para comportar RAW/HEIC)
    },
    fileFilter: (req, file, cb) => {
        // Aceita formatos web e mobile nativos (Apple e Android)
        const allowedMimes = [
            'image/jpeg', 'image/png', 'image/webp', 'image/jpg',
            'image/heic', 'image/heif', // Formatos Apple/Android modernos
            'image/dng', 'image/x-adobe-dng', 'image/raw' // Formatos Crus (Alta Qualidade)
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('FORMATO_INVALIDO'));
        }
    }
});

// Rota que o App chama logo após logar no Firebase (Mobile)
router.post('/sync', checkAuth, AuthController.syncUser);

// Rota para atualizar os dados e a foto de perfil
router.put('/profile', checkAuth, uploadProfile.single('foto'), AuthController.updateProfile);

// Verifica se o e-mail existe no banco antes de redefinir a senha
router.post('/check-email', AuthController.checkEmailExists);

// Excluir dados do usuário
router.delete('/delete', checkAuth, AuthController.deleteUser);

// 👇 Tratamento de Erros do Multer
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: "A foto é muito pesada. O limite máximo é 15MB." });
        }
    } else if (err.message === 'FORMATO_INVALIDO') {
        return res.status(400).json({ message: "Formato inválido. Envie JPG, PNG, WEBP, HEIC ou RAW." });
    }
    next(err);
});

export default router;