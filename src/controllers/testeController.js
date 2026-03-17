import Teste from '../models/teste.js';

export const health = (req, res) => {
  return res.status(200).json({ 
    status: 'OK', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
};

export const getTest = async (req, res) => {
  try {
    const dados = await Teste.findAll();
    return res.json(dados);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const postTest = async (req, res) => {
  try {
    const { campoUnico, campoObrigatorio, campoOpcional } = req.body;
    const novo = await Teste.create({ campoUnico, campoObrigatorio, campoOpcional });
    return res.status(201).json(novo);
  } catch (error) {
    return res.status(400).json({ error: 'Erro ao criar: Verifique se o campo único já existe.' });
  }
};