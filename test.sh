#!/bin/bash

echo "--- Testando Rota de Health ---"
curl -X GET http://localhost:3000/health
echo -e "\n"

echo "--- Testando POST (Criar Registro) ---"
curl -X POST http://localhost:3000/teste \
     -H "Content-Type: application/json" \
     -d '{"campoUnico": "projeto_001", "campoObrigatorio": "Engenharia FESA", "campoOpcional": "Teste de sistemas"}'
echo -e "\n"

echo "--- Testando GET (Listar todos) ---"
curl -X GET http://localhost:3000/teste
echo -e "\n"