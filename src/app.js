import express from 'express';
import cors from 'cors';
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

// app.use((req, res, next) => {
//   console.log(`[${new Date().toLocaleTimeString()}] 📥 Chamada recebida: ${req.method} ${req.url}`);
//   console.log(`   Origem: ${req.headers['user-agent']}`);
//   next();
// });

app.use(cors());
app.use(express.json());
app.use(routesTeste);
app.use("/auth", authRoutes);
app.use("/", teste);
app.use("/questoes",checkAuth, questao); // Precisa do "checkSubscription"
app.use("/mentorias", Mentoria) // Precisa do "checkSubscription" dentro do seu route.
app.use("/progresso", progressoRoutes); // Precisa do "checkSubscription" 
app.use("/recomendacoes", recomendacaoRoutes); // <-- NOVO
app.post('/webhooks/revenuecat', WebhookController.handleRevenueCat);


export default app;