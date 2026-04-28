# Funcio — Guia de Deploy

Stack: HTML estático (sem build) · Supabase (PostgreSQL + Auth) · Vercel / Netlify

---

## 1. Supabase — criar projeto e banco

### 1.1 Criar conta e projeto
1. Acesse **https://supabase.com** → "Start your project"
2. Crie uma organização e um projeto. Escolha a região mais próxima do Brasil: **South America (São Paulo)**.
3. Anote:
   - **Project URL** → `https://SEU_PROJETO.supabase.co`
   - **anon public key** → chave longa que começa com `eyJ...`
   - Ambos disponíveis em: Projeto → Settings → API

### 1.2 Executar o schema
1. No painel do Supabase, vá em **SQL Editor → New query**
2. Cole o conteúdo completo de `funcio/schema.sql`
3. Clique em **Run**
4. Confirme que as tabelas `avaliacoes` e `contatos_opt_in` foram criadas (Table Editor)

### 1.3 Verificar Row Level Security
No SQL Editor, execute:
```sql
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('avaliacoes', 'contatos_opt_in');
```
Deve retornar as políticas `anon_insert_only` e `anon_insert_contato`.  
Nenhuma política SELECT para `anon` = dados protegidos por padrão. ✅

---

## 2. Conectar app.html ao Supabase

Abra `funcio/app.html` e localize as linhas ~243-244:

```javascript
const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';
const SUPABASE_KEY = 'SUA_CHAVE_ANONIMA_AQUI';
```

Substitua pelos valores reais copiados no passo 1.1:

```javascript
const SUPABASE_URL = 'https://abcdefghijkl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

> **Segurança**: a `anon key` é segura para uso público no frontend — ela só permite INSERT nas tabelas que configuramos. Nunca use a `service_role key` no frontend.

---

## 3. Deploy no Vercel (recomendado)

### 3.1 Via drag-and-drop (mais rápido)
1. Acesse **https://vercel.com** → Log in com GitHub ou e-mail
2. Na dashboard, clique em **"Add New → Project"**
3. Escolha **"Deploy without a repository"** → arraste a pasta `funcio/` inteira
4. Vercel detecta HTML estático automaticamente
5. Clique em **Deploy**
6. Em ~30 segundos seu app estará em `https://funcio-xxxx.vercel.app`

### 3.2 Via GitHub (recomendado para manutenção)
```bash
# No terminal, dentro da pasta funcio/
git init
git add .
git commit -m "Funcio v1 — launch"
# Crie repo no GitHub, depois:
git remote add origin https://github.com/SEU_USER/funcio.git
git push -u origin main
```
1. No Vercel: **"Add New → Project"** → importe o repo do GitHub
2. Framework Preset: **Other** (sem build step)
3. Root Directory: `/` (ou `funcio/` se o repo for maior)
4. Deploy

### 3.3 Configurar domínio personalizado
1. No Vercel: projeto → **Settings → Domains**
2. Adicione `funcio.app` (ou seu domínio)
3. Aponte o DNS: no seu registrar, adicione um registro CNAME:
   ```
   www  CNAME  cname.vercel-dns.com
   ```
   E para o apex (`@`), use os nameservers do Vercel ou um registro A.
4. Vercel provisiona SSL automaticamente (Let's Encrypt).

---

## 4. Deploy no Netlify (alternativa)

```bash
# Instale o CLI
npm install -g netlify-cli

# Na pasta funcio/
netlify deploy --dir . --prod
```
Ou via drag-and-drop em **https://app.netlify.com/drop**.

---

## 5. Estrutura de arquivos

```
funcio/
├── index.html      ← Landing page (SEO, CTA → app.html)
├── app.html        ← Aplicativo IFBRM completo (1.125 linhas)
├── schema.sql      ← Schema Supabase (execute 1x)
└── DEPLOY.md       ← Este arquivo
```

> Todos os arquivos são estáticos. Sem Node, sem build, sem dependências locais.  
> As CDNs (Supabase JS, jsPDF) são carregadas em runtime pelo browser.

---

## 6. Variáveis a substituir (checklist pré-launch)

| Arquivo | Linha | Substituir por |
|---------|-------|----------------|
| `app.html` | ~243 | URL real do projeto Supabase |
| `app.html` | ~244 | Chave `anon` real do Supabase |
| `index.html` | `href="app.html"` | URL final do app (ex: `https://funcio.app/app.html`) |
| `index.html` | meta og:url | URL do domínio real |

---

## 7. Testar antes de publicar

1. Abra `app.html` localmente (duplo clique ou `python3 -m http.server 8080`)
2. Preencha uma avaliação completa
3. Na tela de resultado:
   - Teste **"Exportar Laudo PDF"** — deve baixar um PDF
   - Teste **"Exportar JSON"** — deve baixar um JSON
4. No Supabase → Table Editor → `avaliacoes` — verifique se o registro apareceu
5. Confirme que **nenhum dado pessoal** (nome, CPF, e-mail) está na tabela `avaliacoes`

---

## 8. Dashboard de dados (admin)

Para visualizar os dados coletados, use o **Supabase Studio** (nativo):

- **Table Editor → avaliacoes** — registros individuais
- **SQL Editor** — execute as views:
  ```sql
  SELECT * FROM estatisticas_publicas;
  SELECT * FROM avaliacoes_por_mes ORDER BY mes DESC;
  ```

Para um dashboard mais elaborado, conecte o Supabase ao **Metabase** (gratuito) ou **Retool**.

---

## 9. LGPD — conformidade

| Requisito | Implementação |
|-----------|---------------|
| Consentimento explícito | Checkbox obrigatório no modal de boas-vindas |
| Dado anonimizado | Sem nome, CPF, endereço ou qualquer identificador — Art. 12 LGPD |
| Isolamento PII | Tabela `contatos_opt_in` sem FK com `avaliacoes` |
| Direito de exclusão | Registros são anônimos — não há como identificar para excluir (by design) |
| RLS | Usuário anônimo: INSERT only. SELECT: apenas `service_role` |

---

## 10. Próximos passos sugeridos

- [ ] Registrar domínio `funcio.app` (ou similar)
- [ ] Configurar Google Analytics / Plausible para métricas de uso
- [ ] Criar e-mail `contato@funcio.app` para suporte
- [ ] Adicionar página `/sobre` com metodologia IFBRM e referências
- [ ] Integrar envio de e-mail via Resend ou SendGrid (para opt-in de histórico)
- [ ] Montar deck para venda de dados: academia, seguradoras, INSS, Ministério da Saúde

---

*Funcio — o primeiro e único aplicador online do IFBRM no Brasil.*
