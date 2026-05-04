#!/bin/bash
# Script de configuração do repositório Funcio
# Execute no Terminal: bash SETUP-GIT.sh
# Substitua a URL abaixo pelo seu repositório GitHub ANTES de rodar

GITHUB_REPO="https://github.com/SEU_USUARIO/funcio.git"  # <-- edite aqui

set -e

echo "=== Configurando repositório Funcio ==="

# Remove .git existente se houver (do git init do sandbox)
rm -rf .git

# Inicializa limpo
git init
git branch -M main

# Configura identidade (só neste repo)
git config user.email "myyamamo@gmail.com"
git config user.name "Marcos Yudi Yamamoto"

# Adiciona todos os arquivos
git add .

# Commit inicial
git commit -m "feat: launch Funcio — IFBRM online tool

- index.html: homepage
- app.html: ferramenta IFBRM gratuita
- ifbrm.html: guia SEO (CONADE, CIF, Fuzzy, escala 100/75/50/25)
- vercel.json: rewrites /ifbrm e /app
- sitemap.xml: sitemap para Google"

# Adiciona remote e faz push
git remote add origin "$GITHUB_REPO"
git push -u origin main

echo ""
echo "=== Pronto! Repositório publicado no GitHub ==="
echo "Próximo passo: importar no Vercel em https://vercel.com/new"
