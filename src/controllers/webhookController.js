import { Assinatura, User } from '../models/index.js';

export default class WebhookController {
    static async handleRevenueCat(req, res) {
        try {
            // O RevenueCat envia os dados dentro de req.body.event
            const evento = req.body.event;
            
            // Segurança básica: validar o token (você define isso no painel do RC)
            const authToken = req.headers.authorization;
            if (authToken !== `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`) {
                return res.status(401).json({ error: "Não autorizado" });
            }

            // O app_user_id é o uid do Firebase
            const firebaseUid = evento.app_user_id; 
            const user = await User.findOne({ where: { firebaseUid } });
            
            if (!user) return res.status(200).send("Usuário não encontrado.");

            const externalId = evento.original_transaction_id;
            const dataExpiracao = new Date(evento.expiration_at_ms);

            switch (evento.type) {
                case 'INITIAL_PURCHASE':
                case 'RENEWAL':
                    await Assinatura.upsert({
                        userId: user.id,
                        status: 'active',
                        planoId: evento.product_id,
                        dataExpiracao: dataExpiracao,
                        platform: evento.store,
                        externalId: externalId
                    });
                    break;

                case 'EXPIRATION':
                    await Assinatura.update(
                        { status: 'expired' },
                        { where: { userId: user.id } }
                    );
                    break;
            }

            return res.status(200).send("Webhook recebido e processado.");
            
        } catch (error) {
            console.error("Erro no Webhook:", error);
            return res.status(500).send("Erro interno");
        }
    }
}