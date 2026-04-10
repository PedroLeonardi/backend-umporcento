import User from '../models/user.js';
import { put } from '@vercel/blob';
import admin from 'firebase-admin';

// Função para limpar o nome da foto e evitar erros em URLs
const sanitize = (name) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");

export default class AuthController {

    static async syncUser(req, res) {
        try {
            const { uid, email, name, picture, firebase } = req.user;
            const providerId = firebase.sign_in_provider;

            // Verifica se a Master Key foi enviada no Header de uma requisição específica
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

            // Lógica de Trial de 3 dias para novos usuários
            if (created) {
                const trialDays = 3;
                const expiration = new Date();
                expiration.setDate(expiration.getDate() + trialDays);

                user.trialExpiration = expiration;
                await user.save();
                console.log(`🎁 [TRIAL] 3 dias concedidos para ${user.email}`);
            }

            // Se o usuário já existia mas você enviou a chave agora, ele vira admin
            if (!created && isMaster && user.role !== 'admin') {
                user.role = 'admin';
                await user.save();
            }

            // AQUI ESTÁ A ALTERAÇÃO: Enviando o trialExpiration e isPremium no JSON
            return res.status(200).json({
                message: isMaster ? "Acesso administrativo sincronizado" : "Usuário sincronizado",
                user: {
                    id: user.id,
                    nome: user.nome,
                    email: user.email,
                    role: user.role,
                    foto: user.foto,
                    isPremium: user.isPremium, // Importante para o front saber se é Pro
                    trialExpiration: user.trialExpiration // <--- CAMPO ADICIONADO AQUI
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

            // TAMBÉM ATUALIZADO AQUI para manter a consistência no retorno do perfil
            return res.status(200).json({
                message: "Perfil atualizado com sucesso",
                user: {
                    id: user.id,
                    nome: user.nome,
                    email: user.email,
                    role: user.role,
                    foto: user.foto,
                    isPremium: user.isPremium,
                    trialExpiration: user.trialExpiration // <--- CAMPO ADICIONADO AQUI
                }
            });

        } catch (error) {
            console.error("Erro ao atualizar perfil:", error);
            return res.status(500).json({ error: "Erro interno ao atualizar perfil" });
        }
    }

    static async sendPasswordReset(req, res) {
        try {
            const { email } = req.user; // Pega o e-mail do token autenticado

            // O Firebase Admin gera um link, mas o jeito mais seguro para o usuário 
            // é usar o método do Client SDK (Mobile). 
            // Mas via Admin, podemos gerar o link:
            const link = await admin.auth().generatePasswordResetLink(email);

            // Aqui você poderia enviar um e-mail via SendGrid/Nodemailer
            // Por simplicidade e segurança, retornamos sucesso para o Mobile disparar o método nativo.
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

            // Verifica no banco Neon se o usuário existe
            const user = await User.findOne({ where: { email } });

            if (!user) {
                return res.status(404).json({ exists: false, message: "E-mail não encontrado no sistema." });
            }

            // Impede redefinição de quem loga só pelo Google
            if (user.provedor === 'google.com') {
                return res.status(400).json({
                    exists: true,
                    message: "Esta conta usa login do Google. Altere sua senha diretamente no Google."
                });
            }

            // Retorna um JSON bonitinho confirmando que está tudo certo
            return res.status(200).json({ exists: true });
        } catch (error) {
            console.error("Erro ao checar e-mail:", error);
            return res.status(500).json({ error: "Erro interno do servidor" });
        }
    }

    // 👇 NOVA FUNÇÃO AQUI: Responsável por apagar os dados do usuário para a LGPD
    static async deleteUser(req, res) {
        try {
            const { uid } = req.user; // Vem do token do Firebase validado pelo middleware

            const user = await User.findOne({ where: { firebaseUid: uid } });

            if (!user) {
                return res.status(404).json({ message: "Usuário não encontrado no banco de dados." });
            }

            // O destroy vai apagar o usuário e acionar o CASCADE para limpar Progressos, Views e Assinaturas.
            await user.destroy();

            return res.status(200).json({ message: "Dados do usuário excluídos com sucesso do banco." });

        } catch (error) {
            console.error("Erro ao excluir usuário do banco:", error);
            return res.status(500).json({ error: "Erro interno ao excluir dados do usuário." });
        }
    }
    static async promoteToAdmin(req, res) {
        try {
            const { targetUserId } = req.params; // ID do usuário que vai virar admin

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