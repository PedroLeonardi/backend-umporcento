import User from '../models/user.js';
import { put } from '@vercel/blob';
import admin from 'firebase-admin';

// Função para limpar o nome da foto e evitar erros em URLs
const sanitize = (name) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");

export default class AuthController {

    static async syncUser(req, res) {
        try {
            const { uid, email, name, picture, firebase } = req.user;

            if (uid === 'guest') {
                return res.status(403).json({ message: "Visitantes não podem sincronizar dados." });
            }
            const providerId = firebase.sign_in_provider;

            const adminKey = req.headers['x-admin-key'];
            const isMaster = adminKey === process.env.ADMIN_MASTER_KEY;

            const [user, created] = await User.findOrCreate({
                where: { firebaseUid: uid },
                defaults: {
                    nome: name || "Usuário do Sistema",
                    email: email,
                    foto: picture || null,
                    provedor: providerId,
                    role: isMaster ? 'admin' : 'user'
                }
            });

            if (created) {
                const trialDays = 3;
                const expiration = new Date();
                expiration.setDate(expiration.getDate() + trialDays);

                user.trialExpiration = expiration;
                await user.save();
                console.log(`🎁 [TRIAL] 3 dias concedidos para ${user.email}`);
            }

            if (!created && isMaster && user.role !== 'admin') {
                user.role = 'admin';
                await user.save();
            }

            return res.status(200).json({
                message: isMaster ? "Acesso administrativo sincronizado" : "Usuário sincronizado",
                user: {
                    id: user.id,
                    nome: user.nome,
                    email: user.email,
                    role: user.role,
                    foto: user.foto,
                    // 👇 A MÁGICA: O Front-end acha que o Admin é premium!
                    isPremium: user.isPremium || user.role === 'admin', 
                    trialExpiration: user.trialExpiration 
                }
            });
        } catch (error) {
            console.error("Erro na sincronia:", error);
            return res.status(500).json({ error: "Erro interno" });
        }
    }

    static async updateProfile(req, res) {
        try {
            const { uid } = req.user;
            const { nome } = req.body;
            const file = req.file;

            const user = await User.findOne({ where: { firebaseUid: uid } });

            if (!user) {
                return res.status(404).json({ message: "Usuário não encontrado." });
            }

            if (nome) user.nome = nome;

            if (file) {
                const path = `usuarios/perfil/${Date.now()}_${sanitize(file.originalname)}`;
                const blobOptions = { access: 'public', addRandomSuffix: false };

                const blob = await put(path, file.buffer, {
                    ...blobOptions,
                    contentType: file.mimetype
                });

                user.foto = blob.url;
            }

            await user.save();

            return res.status(200).json({
                message: "Perfil atualizado com sucesso",
                user: {
                    id: user.id,
                    nome: user.nome,
                    email: user.email,
                    role: user.role,
                    foto: user.foto,
                    // 👇 Aplicado aqui também para manter consistência
                    isPremium: user.isPremium || user.role === 'admin',
                    trialExpiration: user.trialExpiration 
                }
            });

        } catch (error) {
            console.error("Erro ao atualizar perfil:", error);
            return res.status(500).json({ error: "Erro interno ao atualizar perfil" });
        }
    }

    static async sendPasswordReset(req, res) {
        try {
            const { email } = req.user; 
            const link = await admin.auth().generatePasswordResetLink(email);
            return res.status(200).json({ message: "Link de redefinição gerado", link });
        } catch (error) {
            return res.status(500).json({ error: "Erro ao solicitar redefinição" });
        }
    }

    static async checkEmailExists(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ message: "E-mail não fornecido." });
            }

            const user = await User.findOne({ where: { email } });

            if (!user) {
                return res.status(404).json({ exists: false, message: "E-mail não encontrado no sistema." });
            }

            if (user.provedor === 'google.com') {
                return res.status(400).json({
                    exists: true,
                    message: "Esta conta usa login do Google. Altere sua senha diretamente no Google."
                });
            }

            return res.status(200).json({ exists: true });
        } catch (error) {
            console.error("Erro ao checar e-mail:", error);
            return res.status(500).json({ error: "Erro interno do servidor" });
        }
    }

    static async deleteUser(req, res) {
        try {
            const { uid } = req.user; 

            const user = await User.findOne({ where: { firebaseUid: uid } });

            if (!user) {
                return res.status(404).json({ message: "Usuário não encontrado no banco de dados." });
            }

            await user.destroy();

            return res.status(200).json({ message: "Dados do usuário excluídos com sucesso do banco." });

        } catch (error) {
            console.error("Erro ao excluir usuário do banco:", error);
            return res.status(500).json({ error: "Erro interno ao excluir dados do usuário." });
        }
    }
    
    static async promoteToAdmin(req, res) {
        try {
            const { targetUserId } = req.params; 

            const userToPromote = await User.findByPk(targetUserId);

            if (!userToPromote) {
                return res.status(404).json({ message: "Usuário alvo não encontrado." });
            }

            userToPromote.role = 'admin';
            await userToPromote.save();

            return res.status(200).json({
                message: `${userToPromote.nome} agora é um administrador.`
            });

        } catch (error) {
            console.error("Erro ao promover usuário:", error);
            return res.status(500).json({ error: "Erro interno do servidor." });
        }
    }
}