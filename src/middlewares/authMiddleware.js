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
    // Se você enviar 'Bearer dev-vito' no Insomnia, ele pula a validação real
    if (process.env.NODE_ENV === 'development' && authHeader === 'Bearer dev-vito') {
        console.log("⚠️ TESTE: Acesso concedido via Leitor Universal (bypass Firebase)");
        
        // Simulamos o payload do Firebase. 
        // IMPORTANTE: Esse 'uid' deve ser o mesmo que você salvou no banco Neon para o seu usuário de teste.
        req.user = {
            uid: "UztdlhJvjlN4Ey3UYh25k4zajj52", 
            email: "teste@email.com",
            name: "Usuário do Sistema"
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
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error("Erro na validação do token:", error);
        return res.status(403).json({ message: "Sessão inválida ou expirada." });
    }
};