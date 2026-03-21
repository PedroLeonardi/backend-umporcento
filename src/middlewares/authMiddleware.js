import admin from 'firebase-admin';

// Inicializa usando variáveis de ambiente
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
    });
}

export const checkAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    // 1. ATALHO PARA DESENVOLVIMENTO (LEITOR UNIVERSAL)
    if (process.env.NODE_ENV === 'development' && authHeader === 'Bearer dev-vito') {
        console.log("⚠️ TESTE: Acesso concedido via Leitor Universal (bypass Firebase)");
        
        req.user = {
            uid: "UztdlhJvjlN4Ey3UYh25k4zajj52", 
            email: "teste@email.com",
            name: "Usuário do Sistema",
            email_verified: true // Simulamos que o bypass também está verificado
        };
        return next();
    }

    // 2. VALIDAÇÃO REAL DO FIREBASE
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Acesso negado. Token não fornecido." });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // 👇 TRAVA DE SEGURANÇA DO BACKEND 👇
        // Verificamos se o email_verified é explicitamente falso.
        // E garantimos que isto se aplica a logins feitos com e-mail/palavra-passe, 
        // já que contas do Google costumam vir como 'true' por padrão.
        if (decodedToken.email_verified === false && decodedToken.firebase?.sign_in_provider === 'password') {
            console.log(`🔒 [BACKEND] Bloqueio de segurança: Tentativa de acesso com e-mail não verificado (${decodedToken.email}).`);
            return res.status(403).json({ 
                message: "Acesso bloqueado: O e-mail ainda não foi verificado.",
                code: "EMAIL_NOT_VERIFIED"
            });
        }
        // 👆 FIM DA TRAVA 👇

        req.user = decodedToken;
        next();
    } catch (error) {
        console.error("Erro na validação do token:", error);
        return res.status(403).json({ message: "Sessão inválida ou expirada." });
    }
};