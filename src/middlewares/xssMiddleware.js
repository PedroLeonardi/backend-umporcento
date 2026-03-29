import sanitizeHtml from 'sanitize-html';

export const xssProtect = (req, res, next) => {
    if (req.body) {
        // Varre tudo o que chega no corpo da requisição
        for (let key in req.body) {
            if (typeof req.body[key] === 'string') {
                // Limpa a string de qualquer tag maliciosa (<script>, <iframe>, etc)
                req.body[key] = sanitizeHtml(req.body[key], {
                    // Permitimos apenas tags básicas de formatação de texto (útil se seu admin web tiver um editor de texto rico)
                    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li', 'ol'],
                    allowedAttributes: {
                        'a': ['href'] // Permite apenas links normais
                    },
                    allowedSchemes: ['http', 'https'] // Impede links do tipo javascript:alert(1)
                });
            }
        }
    }
    next();
};