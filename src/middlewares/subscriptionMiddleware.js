import { User, Assinatura } from '../models/index.js';
import { Op } from 'sequelize';

export const checkSubscription = async (req, res, next) => {
    try {
        const { uid } = req.user;

        // 1. BARREIRA PARA VISITANTES (GUEST)
        // Se o uid for 'guest', ele nem vai no banco procurar usuário. 
        // Economiza processamento e protege contra spam de requests.
        if (uid === 'guest') {
            return res.status(403).json({ 
                message: "Acesso restrito. Crie uma conta gratuita para liberar 3 dias de conteúdo!", 
                code: "AUTH_REQUIRED" 
            });
        }

        // Busca o usuário no banco Neon
        const user = await User.findOne({ where: { firebaseUid: uid } });
        if (!user) {
            return res.status(404).json({ message: "Usuário não sincronizado no banco de dados." });
        }

        // 2. PASSE LIVRE PARA ADMIN
        // Se for admin, não importa assinatura ou trial. É acesso total pra sempre.
        if (user.role === 'admin') {
            return next();
        }

        // 3. VERIFICAÇÃO DE ASSINATURA ATIVA (RevenueCat/Stripe)
        // Se a flag isPremium estiver ativa (vinda do Webhook), libera.
        if (user.isPremium) {
            return next();
        }

        // Fallback: Verifica na tabela de assinaturas (Segurança extra)
        const assinaturaAtiva = await Assinatura.findOne({
            where: {
                userId: user.id,
                status: 'active',
                dataExpiracao: { [Op.gt]: new Date() }
            }
        });

        if (assinaturaAtiva) {
            return next();
        }

        // 4. VERIFICAÇÃO DE TRIAL (DEGUSTAÇÃO DE 3 DIAS)
        // Se o usuário ainda estiver dentro do prazo de trial concedido no registro.
        if (user.trialExpiration && new Date() < new Date(user.trialExpiration)) {
            console.log(`💡 [SUBSCRIPTION] Usuário ${user.email} acessando via Trial.`);
            return next();
        }

        // 5. BLOQUEIO FINAL
        // Se chegou aqui em produção, não é admin, não pagou e o trial venceu.
        return res.status(403).json({ 
            message: "Seu período de teste terminou. Assine um plano para continuar sua evolução!", 
            code: "SUBSCRIPTION_REQUIRED"
        });

    } catch (error) {
        console.error("Erro no Subscription Middleware:", error);
        res.status(500).json({ error: "Erro interno ao verificar permissões de acesso." });
    }
};