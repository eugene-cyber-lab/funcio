/*!
 * DADOS DE TESTE — NÃO VALIDADOS.
 * Subconjunto demonstrativo transcrito manualmente da Tabela Brasileira para a
 * Apuração do Dano Corporal (ABMLPM, 1ª ed., 2024) para testar o motor e a UI.
 * - Cada registro aponta para a página impressa (= página do PDF fornecido).
 * - "texto_original": rótulo da linha da tabela, transcrito.
 * - "derivado": metadados atribuídos pelo engenheiro (segmento, grupos).
 * - "interpretativo": regras de aplicação que dependem de validação pericial.
 * Reprodução pública depende de verificação de direitos/autorização (ver docs/DECISIONS.md, D-007).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FuncioDanoDemoCatalog = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PROV = { metodo: 'transcricao_manual', responsavel: 'engineer', data: '2026-10-21' };
  var NV = { status: 'nao_validado', validado_por: null, data: null };

  function item(o) {
    o.proveniencia = PROV;
    o.validacao = NV;
    return o;
  }
  function dom(d, nd) {
    return { dominante: d, nao_dominante: nd };
  }
  function r(min, max) {
    return { min: min, max: max === undefined ? min : max };
  }

  var C1 = { n: 1, titulo: 'Sistema Nervoso' };
  var C3 = { n: 3, titulo: 'Sistema Musculoesquelético' };

  var itens = [
    // ── Capítulo 1 ──────────────────────────────────────────────────────────
    item({
      id: 'c1.a1.n1.c1c4', capitulo: C1, subcapitulo: 'I – Neurologia', titulo: 'I – Sistema Nervoso Central',
      artigo: '1.º', numero: '1', caminho: 'Cap. 1 › Art. 1.º › Nº 1',
      sistema: 'nervoso', estrutura: 'medula espinal',
      rotulo: 'Dano medular completo (ASIA A) C1–C4', texto_original: 'C1 - C4',
      valoracao: { tipo: 'fixo', min: 99, max: 99 },
      segmento: null, fonte: { pagina: 24 },
    }),
    item({
      id: 'c1.a1.n3.hemiparesia_moderada', capitulo: C1, subcapitulo: 'I – Neurologia', titulo: 'I – Sistema Nervoso Central',
      artigo: '1.º', numero: '3', caminho: 'Cap. 1 › Art. 1.º › Nº 3',
      sistema: 'nervoso', estrutura: 'sistema nervoso central',
      rotulo: 'Hemiparesia moderada (força muscular global 3)', texto_original: 'Moderado (força muscular global 3)',
      valoracao: { tipo: 'intervalo', min: 35, max: 45 },
      condicoes: [{ texto: 'Valorar considerando a dominância lateral e a gravidade do prejuízo funcional (escala MRC).', origem: 'fonte_parafraseada' }],
      segmento: null, fonte: { pagina: 25 },
    }),
    item({
      id: 'c1.a1.n4.espasticidade', capitulo: C1, subcapitulo: 'I – Neurologia', titulo: 'I – Sistema Nervoso Central',
      artigo: '1.º', numero: '4', caminho: 'Cap. 1 › Art. 1.º › Nº 4',
      sistema: 'nervoso', estrutura: 'sistema nervoso central',
      rotulo: 'Espasticidade irredutível refratária (acréscimo)', texto_original: 'Espasticidade irredutível (não controlável, apesar de tratamento) — Acrescentar 7%',
      valoracao: { tipo: 'acrescimo', min: 7, max: 7 },
      regra_acrescimo: 'interpretativa',
      segmento: null, fonte: { pagina: 25 },
    }),
    item({
      id: 'c1.a2.n1a.trigemeo_neuralgia', capitulo: C1, subcapitulo: 'I – Neurologia', titulo: 'II – Sistema Nervoso Periférico',
      artigo: '2.º', numero: '1', alinea: 'a', caminho: 'Cap. 1 › Art. 2.º › Nº 1 › a)',
      sistema: 'nervoso', estrutura: 'nervo trigêmeo (V)',
      rotulo: 'Nervo trigêmeo — neuralgia', texto_original: 'Neuralgia',
      valoracao: { tipo: 'intervalo', min: 5, max: 25 },
      condicoes: [{ texto: 'Considerar número de ramos afetados e gravidade da repercussão clínica.', origem: 'fonte_parafraseada' }],
      segmento: null, fonte: { pagina: 26 },
    }),
    item({
      id: 'c1.a2.n2a.plexo_completo', capitulo: C1, subcapitulo: 'I – Neurologia', titulo: 'II – Sistema Nervoso Periférico',
      artigo: '2.º', numero: '2', alinea: 'a', caminho: 'Cap. 1 › Art. 2.º › Nº 2 › a)',
      sistema: 'nervoso', estrutura: 'plexo braquial',
      rotulo: 'Plexo braquial — lesão completa C5–T1', texto_original: 'Lesão completa C5 - T1',
      valoracao: { tipo: 'intervalo', por_dominancia: dom(r(50, 60), r(45, 55)) },
      segmento: 'membro_superior', segmento_lateral: true, fonte: { pagina: 27 },
      possivel_sobreposicao: ['c1.a2.n2e.mediano_punho', 'c1.a2.n2g.ulnar_antebraco'],
    }),
    item({
      id: 'c1.a2.n2e.mediano_punho', capitulo: C1, subcapitulo: 'I – Neurologia', titulo: 'II – Sistema Nervoso Periférico',
      artigo: '2.º', numero: '2', alinea: 'e', caminho: 'Cap. 1 › Art. 2.º › Nº 2 › e)',
      sistema: 'nervoso', estrutura: 'nervo mediano',
      rotulo: 'Nervo mediano — paresia/paralisia ao nível do punho', texto_original: 'nível do punho',
      valoracao: { tipo: 'intervalo', por_dominancia: dom(r(5, 20), r(4, 15)) },
      segmento: 'membro_superior', segmento_lateral: true, fonte: { pagina: 28 },
    }),
    item({
      id: 'c1.a2.n2g.ulnar_antebraco', capitulo: C1, subcapitulo: 'I – Neurologia', titulo: 'II – Sistema Nervoso Periférico',
      artigo: '2.º', numero: '2', alinea: 'g', caminho: 'Cap. 1 › Art. 2.º › Nº 2 › g)',
      sistema: 'nervoso', estrutura: 'nervo ulnar',
      rotulo: 'Nervo ulnar — paresia/paralisia ao nível do antebraço e punho', texto_original: 'nível do antebraço e punho',
      valoracao: { tipo: 'intervalo', por_dominancia: dom(r(8, 20), r(5, 18)) },
      segmento: 'membro_superior', segmento_lateral: true, fonte: { pagina: 28 },
    }),

    // ── Capítulo 3 · Membro superior ────────────────────────────────────────
    item({
      id: 'c3.a27.n1.amp_ms_total', capitulo: C3, subcapitulo: 'I – Membro Superior', titulo: null,
      artigo: '27.º', numero: '1', caminho: 'Cap. 3 › Art. 27.º › Nº 1',
      sistema: 'musculoesqueletico', estrutura: 'membro superior',
      rotulo: 'Amputação total do membro superior (desarticulação do ombro)', texto_original: 'Amputação total do membro superior (desarticulação do ombro)',
      valoracao: { tipo: 'fixo', por_dominancia: dom(r(65), r(60)) },
      segmento: 'membro_superior', segmento_lateral: true, fonte: { pagina: 63 },
    }),
    item({
      id: 'c3.a27.n1.amp_antebraco', capitulo: C3, subcapitulo: 'I – Membro Superior', titulo: null,
      artigo: '27.º', numero: '1', caminho: 'Cap. 3 › Art. 27.º › Nº 1',
      sistema: 'musculoesqueletico', estrutura: 'antebraço',
      rotulo: 'Amputação do antebraço (transradial)', texto_original: 'Amputação do antebraço (transradial)',
      valoracao: { tipo: 'fixo', por_dominancia: dom(r(55), r(50)) },
      segmento: 'membro_superior', segmento_lateral: true, fonte: { pagina: 63 },
      possivel_sobreposicao: ['c3.a30b.extensao', 'c3.a30b.flexao', 'c3.a30b.pronacao', 'c1.a2.n2e.mediano_punho', 'c3.a27.n3a.polegar_fd'],
    }),
    item({
      id: 'c3.a27.n3a.polegar_fd', capitulo: C3, subcapitulo: 'I – Membro Superior', titulo: null,
      artigo: '27.º', numero: '3', alinea: 'a', caminho: 'Cap. 3 › Art. 27.º › Nº 3 › a)',
      sistema: 'musculoesqueletico', estrutura: 'polegar',
      rotulo: 'Polegar — amputação completa da falange distal', texto_original: 'Amputação completa da falange distal',
      valoracao: { tipo: 'fixo', por_dominancia: dom(r(10), r(8)) },
      segmento: 'membro_superior', segmento_lateral: true, fonte: { pagina: 64 },
    }),
    item({
      id: 'c3.a28a.ombro_artrodese', capitulo: C3, subcapitulo: 'I – Membro Superior', titulo: 'I – Cintura Escapular',
      artigo: '28.º', alinea: 'a', caminho: 'Cap. 3 › Art. 28.º › a)',
      sistema: 'musculoesqueletico', estrutura: 'ombro',
      rotulo: 'Ombro — artrodese ou anquilose', texto_original: 'Artrodese ou anquilose',
      valoracao: { tipo: 'fixo', por_dominancia: dom(r(25), r(22)) },
      segmento: 'membro_superior', segmento_lateral: true, fonte: { pagina: 66 },
      possivel_sobreposicao: ['c3.a28b.ombro_rot_ext'],
    }),
    item({
      id: 'c3.a28b.ombro_rot_ext', capitulo: C3, subcapitulo: 'I – Membro Superior', titulo: 'I – Cintura Escapular',
      artigo: '28.º', alinea: 'b', caminho: 'Cap. 3 › Art. 28.º › b)',
      sistema: 'musculoesqueletico', estrutura: 'ombro',
      rotulo: 'Ombro — perda isolada da rotação externa', texto_original: 'Perda isolada da rotação externa',
      valoracao: { tipo: 'fixo', por_dominancia: dom(r(4), r(3)) },
      segmento: 'membro_superior', segmento_lateral: true, fonte: { pagina: 66 },
    }),
    item({
      id: 'c3.a29a.cotovelo_artrodese', capitulo: C3, subcapitulo: 'I – Membro Superior', titulo: 'II – Cotovelo',
      artigo: '29.º', alinea: 'a', caminho: 'Cap. 3 › Art. 29.º › a)',
      sistema: 'musculoesqueletico', estrutura: 'cotovelo',
      rotulo: 'Cotovelo — artrodese ou anquilose', texto_original: 'Artrodese ou anquilose',
      valoracao: { tipo: 'intervalo', por_dominancia: dom(r(20, 25), r(18, 22)) },
      condicoes: [{ texto: 'Valorar conforme a posição funcional (70°–90° de flexão) e a preservação da pronossupinação.', origem: 'fonte_parafraseada' }],
      segmento: 'membro_superior', segmento_lateral: true, fonte: { pagina: 68 },
    }),
    item({
      id: 'c3.a29b.cotovelo_pronossup', capitulo: C3, subcapitulo: 'I – Membro Superior', titulo: 'II – Cotovelo',
      artigo: '29.º', alinea: 'b', caminho: 'Cap. 3 › Art. 29.º › b)',
      sistema: 'musculoesqueletico', estrutura: 'cotovelo',
      rotulo: 'Cotovelo — prejuízo da pronação e/ou supinação (acréscimo)', texto_original: 'Prejuízo da pronação e/ou supinação — Acrescentar',
      valoracao: { tipo: 'acrescimo', por_dominancia: dom(r(5), r(4)) },
      regra_acrescimo: 'interpretativa',
      segmento: 'membro_superior', segmento_lateral: true, fonte: { pagina: 68 },
    }),
    item({
      id: 'c3.a30b.extensao', capitulo: C3, subcapitulo: 'I – Membro Superior', titulo: 'III – Punho',
      artigo: '30.º', alinea: 'b', caminho: 'Cap. 3 › Art. 30.º › b)',
      sistema: 'musculoesqueletico', estrutura: 'punho',
      rotulo: 'Punho — prejuízo da extensão', texto_original: 'Extensão',
      valoracao: { tipo: 'fixo', por_dominancia: dom(r(4), r(3)) },
      combinacao: { grupo_soma_direta: 'c3.a30b', rotulo_grupo: 'Punho, Art. 30.º b) — "Somar os percentuais para cada movimento"', origem: 'fonte' },
      segmento: 'membro_superior', segmento_lateral: true, fonte: { pagina: 70 },
    }),
    item({
      id: 'c3.a30b.flexao', capitulo: C3, subcapitulo: 'I – Membro Superior', titulo: 'III – Punho',
      artigo: '30.º', alinea: 'b', caminho: 'Cap. 3 › Art. 30.º › b)',
      sistema: 'musculoesqueletico', estrutura: 'punho',
      rotulo: 'Punho — prejuízo da flexão', texto_original: 'Flexão',
      valoracao: { tipo: 'fixo', por_dominancia: dom(r(4), r(3)) },
      combinacao: { grupo_soma_direta: 'c3.a30b', rotulo_grupo: 'Punho, Art. 30.º b) — "Somar os percentuais para cada movimento"', origem: 'fonte' },
      segmento: 'membro_superior', segmento_lateral: true, fonte: { pagina: 70 },
    }),
    item({
      id: 'c3.a30b.pronacao', capitulo: C3, subcapitulo: 'I – Membro Superior', titulo: 'III – Punho',
      artigo: '30.º', alinea: 'b', caminho: 'Cap. 3 › Art. 30.º › b)',
      sistema: 'musculoesqueletico', estrutura: 'punho',
      rotulo: 'Punho — prejuízo da pronação', texto_original: 'Pronação',
      valoracao: { tipo: 'fixo', por_dominancia: dom(r(5), r(4)) },
      combinacao: { grupo_soma_direta: 'c3.a30b', rotulo_grupo: 'Punho, Art. 30.º b) — "Somar os percentuais para cada movimento"', origem: 'fonte' },
      segmento: 'membro_superior', segmento_lateral: true, fonte: { pagina: 70 },
    }),

    // ── Capítulo 3 · Membro inferior ────────────────────────────────────────
    item({
      id: 'c3.a33.desart_quadril', capitulo: C3, subcapitulo: 'III – Membro Inferior', titulo: null,
      artigo: '33.º', caminho: 'Cap. 3 › Art. 33.º',
      sistema: 'musculoesqueletico', estrutura: 'membro inferior',
      rotulo: 'Desarticulação do quadril', texto_original: 'Desarticulação do quadril',
      valoracao: { tipo: 'fixo', min: 65, max: 65 },
      segmento: 'membro_inferior', segmento_lateral: true, fonte: { pagina: 74 },
    }),
    item({
      id: 'c3.a33.transfemoral', capitulo: C3, subcapitulo: 'III – Membro Inferior', titulo: null,
      artigo: '33.º', caminho: 'Cap. 3 › Art. 33.º',
      sistema: 'musculoesqueletico', estrutura: 'coxa',
      rotulo: 'Amputação transfemoral da coxa', texto_original: 'Amputação transfemoral da coxa',
      valoracao: { tipo: 'fixo', min: 60, max: 60 },
      segmento: 'membro_inferior', segmento_lateral: true, fonte: { pagina: 74 },
      possivel_sobreposicao: ['c3.a35c.lca'],
    }),
    item({
      id: 'c3.a34a.quadril_artrodese', capitulo: C3, subcapitulo: 'III – Membro Inferior', titulo: 'I – Quadril',
      artigo: '34.º', alinea: 'a', caminho: 'Cap. 3 › Art. 34.º › a)',
      sistema: 'musculoesqueletico', estrutura: 'quadril',
      rotulo: 'Quadril — artrodese ou anquilose', texto_original: 'Artrodese ou anquilose',
      valoracao: { tipo: 'fixo', min: 25, max: 25 },
      segmento: 'membro_inferior', segmento_lateral: true, fonte: { pagina: 75 },
      possivel_sobreposicao: ['c3.a34b.flexao_30', 'c3.a34b.extensao', 'c3.a34b.abducao'],
    }),
    item({
      id: 'c3.a34b.flexao_30', capitulo: C3, subcapitulo: 'III – Membro Inferior', titulo: 'I – Quadril',
      artigo: '34.º', alinea: 'b', caminho: 'Cap. 3 › Art. 34.º › b)',
      sistema: 'musculoesqueletico', estrutura: 'quadril',
      rotulo: 'Quadril — flexão até 30°', texto_original: 'Flexão — Até 30°',
      valoracao: { tipo: 'fixo', min: 12, max: 12 },
      combinacao: { grupo_soma_direta: 'c3.a34b', rotulo_grupo: 'Quadril, Art. 34.º b) — "Somar o percentual de cada movimento"', origem: 'fonte' },
      segmento: 'membro_inferior', segmento_lateral: true, fonte: { pagina: 75 },
    }),
    item({
      id: 'c3.a34b.extensao', capitulo: C3, subcapitulo: 'III – Membro Inferior', titulo: 'I – Quadril',
      artigo: '34.º', alinea: 'b', caminho: 'Cap. 3 › Art. 34.º › b)',
      sistema: 'musculoesqueletico', estrutura: 'quadril',
      rotulo: 'Quadril — prejuízo da extensão', texto_original: 'Prejuízo da extensão',
      valoracao: { tipo: 'fixo', min: 3, max: 3 },
      combinacao: { grupo_soma_direta: 'c3.a34b', rotulo_grupo: 'Quadril, Art. 34.º b) — "Somar o percentual de cada movimento"', origem: 'fonte' },
      segmento: 'membro_inferior', segmento_lateral: true, fonte: { pagina: 75 },
    }),
    item({
      id: 'c3.a34b.abducao', capitulo: C3, subcapitulo: 'III – Membro Inferior', titulo: 'I – Quadril',
      artigo: '34.º', alinea: 'b', caminho: 'Cap. 3 › Art. 34.º › b)',
      sistema: 'musculoesqueletico', estrutura: 'quadril',
      rotulo: 'Quadril — prejuízo da abdução', texto_original: 'Prejuízo da abdução',
      valoracao: { tipo: 'fixo', min: 4, max: 4 },
      combinacao: { grupo_soma_direta: 'c3.a34b', rotulo_grupo: 'Quadril, Art. 34.º b) — "Somar o percentual de cada movimento"', origem: 'fonte' },
      segmento: 'membro_inferior', segmento_lateral: true, fonte: { pagina: 75 },
    }),
    item({
      id: 'c3.a35c.lca', capitulo: C3, subcapitulo: 'III – Membro Inferior', titulo: 'II – Joelho',
      artigo: '35.º', alinea: 'c', caminho: 'Cap. 3 › Art. 35.º › c)',
      sistema: 'musculoesqueletico', estrutura: 'joelho',
      rotulo: 'Joelho — instabilidade de ligamento cruzado (anterior ou posterior)', texto_original: 'Ligamentos cruzados (anterior ou posterior)',
      valoracao: { tipo: 'intervalo', min: 5, max: 10 },
      segmento: 'membro_inferior', segmento_lateral: true, fonte: { pagina: 77 },
    }),
  ];

  // Limites por segmento (Orientação 7, p. 22; Cap. 3, p. 60).
  // O valor de "perda completa" é DERIVADO do item de amputação total — regra interpretativa.
  var limites = [
    { segmento: 'membro_superior', rotulo: 'amputação total do membro superior, Art. 27.º Nº 1', por_dominancia: dom(65, 60), fonte: { pagina: 63 }, origem: 'interpretativo', validacao: NV },
    { segmento: 'membro_inferior', rotulo: 'desarticulação do quadril, Art. 33.º', valor: 65, fonte: { pagina: 74 }, origem: 'interpretativo', validacao: NV },
  ];

  return {
    meta: {
      obra: 'Tabela Brasileira para a Apuração do Dano Corporal, ABMLPM, 1ª ed., 2024',
      isbn: '978-85-5327-252-5',
      schema: 'funcio.dano.catalogo/0.1',
      status: 'dados_de_teste',
      nota: 'Subconjunto demonstrativo. Não validado contra o PDF por revisor pericial. Não utilizar em laudo.',
    },
    itens: itens,
    limites: limites,
  };
});
