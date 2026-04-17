import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// 👇 Importando o nosso novo middleware de proteção XSS
import { xssProtect } from './middlewares/xssMiddleware.js';



import routesTeste from './routes/testeRoutes.js';
import questao from './routes/questaoRoutes.js'
import Mentoria from './routes/mentoriaRoutes.js'
import authRoutes from './routes/authRoutes.js'; 
import progressoRoutes from './routes/progressoRoutes.js'
import recomendacaoRoutes from './routes/recomendacaoRoutes.js';

import WebhookController from './controllers/webhookController.js';

import { checkAuth } from './middlewares/authMiddleware.js';
import { checkSubscription } from './middlewares/subscriptionMiddleware.js';

import teste from './routes/testeRoutes.js';

const app = express();

// Diz ao Express para confiar no Proxy (Ngrok/Vercel/Render)
app.set('trust proxy', 1);

// ==========================================
// 🛡️ MIDDLEWARES DE SEGURANÇA
// ==========================================

// 1. Helmet: Adiciona proteções HTTP e esconde o Express
app.use(helmet());

// 2. Rate Limiting: Trava de força bruta
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: "Muitas requisições deste IP, tente novamente mais tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(apiLimiter); 

// 3. CORS: Permitir apenas origens seguras
const corsOptions = {
  origin: process.env.WEB_ADMIN_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key']
};
app.use(cors(corsOptions));

// Transforma o corpo da requisição em JSON
app.use(express.json());

// 👇 4. XSS Protect: Nossa trava personalizada e moderna
app.use(xssProtect);

// ==========================================

// Rota de Webhook
app.post('/webhooks/revenuecat', WebhookController.handleRevenueCat);

app.use(routesTeste);
app.use("/auth", authRoutes);
app.use("/", teste);
app.use("/questoes", checkAuth, questao); 
app.use("/mentorias", Mentoria); 
app.use("/progresso", progressoRoutes); 
app.use("/recomendacoes", recomendacaoRoutes); 

export default app;