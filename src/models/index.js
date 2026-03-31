import User from './user.js';
import Mentoria from './mentoria.js';
import Capitulo from './capitulo.js';
import Progresso from './progresso.js';
import Assinatura from './assinatura.js';
import UserMentoriaView from './userMentoriaView.js';
import Categoria from './categoria.js'; 
import FinancasConfig from './financasConfig.js';

// 1. Mentoria <-> Capitulos
Mentoria.hasMany(Capitulo, { foreignKey: 'mentoriaId', as: 'capitulos', onDelete: 'CASCADE' });
Capitulo.belongsTo(Mentoria, { foreignKey: 'mentoriaId', as: 'mentoria' });

// 2. Progresso
Progresso.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Progresso.belongsTo(Capitulo, { foreignKey: 'capituloId', as: 'capitulo' });
User.hasMany(Progresso, { foreignKey: 'userId', as: 'progressos' });

// 3. Assinaturas
User.hasMany(Assinatura, { foreignKey: 'userId', as: 'historicoAssinaturas' });
Assinatura.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 4. Views
User.hasMany(UserMentoriaView, { foreignKey: 'userId', as: 'visualizacoes' });
UserMentoriaView.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Mentoria.hasMany(UserMentoriaView, { foreignKey: 'mentoriaId', as: 'visualizacoes' });
UserMentoriaView.belongsTo(Mentoria, { foreignKey: 'mentoriaId', as: 'mentoria' });

// 5. Relacionamento N:N (Muitos para Muitos)
// Agora que removemos o campo 'categorias' do model Mentoria, o 'as: categorias' não dará erro.
Mentoria.belongsToMany(Categoria, { 
    through: 'mentoria_categorias', 
    as: 'categorias', // Nome que aparecerá no JSON e nos métodos (getCategorias, setCategorias)
    foreignKey: 'mentoriaId' 
});
Categoria.belongsToMany(Mentoria, { 
    through: 'mentoria_categorias', 
    as: 'mentorias', 
    foreignKey: 'categoriaId' 
});

export { User, Mentoria, Capitulo, Progresso, Assinatura, UserMentoriaView, Categoria, FinancasConfig };