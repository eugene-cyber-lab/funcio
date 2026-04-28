-- ══════════════════════════════════════════════════════════════════════════════
-- Funcio — Schema Supabase
-- Avaliações biopsicossociais anonimizadas (IFBRM)
-- ══════════════════════════════════════════════════════════════════════════════

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── TABELA PRINCIPAL ───────────────────────────────────────────────────────────
CREATE TABLE avaliacoes (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  criado_em        TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Perfil demográfico — nenhum dado pessoal identificável
  faixa_etaria     TEXT        CHECK (faixa_etaria IN ('0-4','5-10','11-17','18-59','60+')),
  sexo             TEXT        CHECK (sexo IN ('Feminino','Masculino','Outro/Prefiro não informar')),
  uf               CHAR(2),

  -- Tipo de impedimento
  tipos_deficiencia TEXT[],    -- ex: ['C1','C3']
  cid_principal     TEXT,      -- ex: 'G82'

  -- Resultados numéricos
  escore_bruto      INTEGER,
  escore_fuzzy      INTEGER,
  classificacao     TEXT        CHECK (classificacao IN ('Grave','Moderado','Leve','Insuficiente')),
  itens_preenchidos INTEGER,

  -- Escores por domínio: { "d1": { "mean": 75, "count": 9 }, ... }
  escores_dominio   JSONB,

  -- Itens brutos: { "i11": 100, "i12": 75, ... } — apenas valores numéricos
  itens_brutos      JSONB,

  -- Avaliação qualitativa
  percepcao_avaliador TEXT,
  conclusao           TEXT    CHECK (conclusao IN ('pcd','npcd')),

  -- Critérios Fuzzy ativos
  fuzzy_ativos      TEXT[],

  -- Metadados de sessão (sem identificação)
  duracao_segundos  INTEGER,
  versao_app        TEXT    DEFAULT 'funcio_v1'
);

-- ── ÍNDICES PARA ANÁLISE ───────────────────────────────────────────────────────
CREATE INDEX idx_av_faixa    ON avaliacoes (faixa_etaria);
CREATE INDEX idx_av_uf       ON avaliacoes (uf);
CREATE INDEX idx_av_classif  ON avaliacoes (classificacao);
CREATE INDEX idx_av_criado   ON avaliacoes (criado_em);
CREATE INDEX idx_av_tipos    ON avaliacoes USING GIN (tipos_deficiencia);
CREATE INDEX idx_av_mes      ON avaliacoes (DATE_TRUNC('month', (criado_em AT TIME ZONE 'UTC')));

-- ── ROW LEVEL SECURITY ─────────────────────────────────────────────────────────
-- Ninguém lê dados individuais via client anônimo.
-- Apenas INSERT é permitido (o app envia e nunca lê de volta).
ALTER TABLE avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_only"
  ON avaliacoes FOR INSERT
  TO anon
  WITH CHECK (true);

-- Leitura apenas para service_role (seu dashboard admin)
-- Nenhuma policy de SELECT para anon → bloqueado por default

-- ── VISTA PÚBLICA AGREGADA ─────────────────────────────────────────────────────
-- Pode ser exposta para dashboard público sem risco de privacidade
CREATE VIEW estatisticas_publicas AS
SELECT
  COUNT(*)                                                    AS total_avaliacoes,
  COUNT(DISTINCT uf)                                          AS total_estados,
  ROUND(AVG(duracao_segundos)::NUMERIC / 60, 1)               AS duracao_media_min,
  COUNT(*) FILTER (WHERE classificacao = 'Grave')             AS total_grave,
  COUNT(*) FILTER (WHERE classificacao = 'Moderado')          AS total_moderado,
  COUNT(*) FILTER (WHERE classificacao = 'Leve')              AS total_leve,
  COUNT(*) FILTER (WHERE classificacao = 'Insuficiente')      AS total_insuficiente,
  COUNT(*) FILTER (WHERE 'C1' = ANY(tipos_deficiencia))       AS deficiencia_fisica,
  COUNT(*) FILTER (WHERE 'C2' = ANY(tipos_deficiencia))       AS deficiencia_auditiva,
  COUNT(*) FILTER (WHERE 'C3' = ANY(tipos_deficiencia))       AS deficiencia_visual,
  COUNT(*) FILTER (WHERE 'C4' = ANY(tipos_deficiencia))       AS deficiencia_intelectual,
  COUNT(*) FILTER (WHERE 'C5' = ANY(tipos_deficiencia))       AS deficiencia_mental
FROM avaliacoes;

-- ── VISTA MENSAL PARA GRÁFICOS ─────────────────────────────────────────────────
CREATE VIEW avaliacoes_por_mes AS
SELECT
  DATE_TRUNC('month', criado_em)                              AS mes,
  COUNT(*)                                                    AS total,
  COUNT(*) FILTER (WHERE classificacao = 'Grave')             AS grave,
  COUNT(*) FILTER (WHERE classificacao = 'Moderado')          AS moderado,
  COUNT(*) FILTER (WHERE classificacao = 'Leve')              AS leve,
  COUNT(*) FILTER (WHERE classificacao = 'Insuficiente')      AS insuficiente
FROM avaliacoes
GROUP BY DATE_TRUNC('month', criado_em)
ORDER BY mes;

-- ── TABELA DE CONTATO OPCIONAL ─────────────────────────────────────────────────
-- Para avaliadores que escolhem receber histórico por e-mail.
-- Separada das avaliações para nunca haver JOIN entre PII e dados clínicos.
CREATE TABLE contatos_opt_in (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  criado_em  TIMESTAMPTZ DEFAULT NOW(),
  email      TEXT        NOT NULL UNIQUE,
  -- Referência NÃO vinculada à tabela avaliacoes (sem FK intencional)
  -- O app gera um token de sessão que associa localmente, nunca no banco
  ativo      BOOLEAN     DEFAULT TRUE
);

ALTER TABLE contatos_opt_in ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_contato"
  ON contatos_opt_in FOR INSERT
  TO anon
  WITH CHECK (true);

-- ── COMENTÁRIOS DE DOCUMENTAÇÃO ───────────────────────────────────────────────
COMMENT ON TABLE avaliacoes IS
  'Avaliações biopsicossociais IFBRM — dados 100% anonimizados, sem PII. '
  'Uso: pesquisa epidemiológica de funcionalidade. Política: LGPD Art. 12 (dado anonimizado).';

COMMENT ON TABLE contatos_opt_in IS
  'E-mails de avaliadores que optaram por histórico. '
  'NUNCA vincular com tabela avaliacoes via JOIN — isolamento intencional de PII.';
