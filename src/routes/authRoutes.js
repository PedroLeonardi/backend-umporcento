import { Router } from 'express';
import multer from 'multer';
import AuthController from '../controllers/authController.js';
import { checkAuth } from '../middlewares/authMiddleware.js';

const router = Router();

// Configuração do multer para manter a foto na memória antes de ir para o Vercel Blob
const upload = multer({ storage: multer.memoryStorage() });

// Rota que o App chama logo após logar no Firebase (Mobile)
router.post('/sync', checkAuth, AuthController.syncUser);

// Nova rota para atualizar os dados e a foto de perfil
router.put('/profile', checkAuth, upload.single('foto'), AuthController.updateProfile);

export default router;