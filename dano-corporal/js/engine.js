/*!
 * Funcio · Dano Corporal · Motor de cálculo v0.1.0
 * Independente da interface. Sem dependências. Sem I/O. Determinístico.
 * Referência normativa: Tabela Brasileira para a Apuração do Dano Corporal,
 * ABMLPM, 1ª ed., 2024 — "Orientações para o uso da Tabela" (p. 21–22).
 *
 * O motor NÃO decide o percentual dentro de um intervalo: esse valor é
 * escolha fundamentada do perito (Orientação 2). O motor valida, combina,
 * aplica limites e documenta.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FuncioDanoEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '0.1.0';
  var EPS = 1e-9;

  // ── utilitários numéricos ────────────────────────────────────────────────
  /** Arredondamento aritmético (meio para cima) com tolerância a erro binário. */
  function roundHalfUp(x) {
    return Math.floor(x + 0.5 + EPS);
  }
  /** Regra de Balthazard (capacidade restante): 100·(1 − Π(1 − pᵢ/100)). */
  function balthazard(values) {
    var rest = 1;
    for (var i = 0; i < values.length; i++) rest *= 1 - values[i] / 100;
    return 100 * (1 - rest);
  }
  function fmt(x) {
    // exibição apenas; o cálculo preserva precisão integral
    return (Math.round(x * 10000) / 10000).toString().replace('.', ',');
  }
  function isNum(v) {
    return typeof v === 'number' && isFinite(v);
  }

  // ── catálogo ─────────────────────────────────────────────────────────────
  function indexCatalog(catalog) {
    var byId = {};
    (catalog.itens || []).forEach(function (it) {
      byId[it.id] = it;
    });
    var limites = {};
    (catalog.limites || []).forEach(function (l) {
      limites[l.segmento] = l;
    });
    return { byId: byId, limites: limites };
  }

  /** Faixa aplicável para um item, considerando lateralidade/dominância. */
  function faixaDoItem(item, dominante) {
    var v = item.valoracao;
    if (v.por_dominancia) {
      if (dominante === true) return v.por_dominancia.dominante;
      if (dominante === false) return v.por_dominancia.nao_dominante;
      return null;
    }
    return { min: v.min, max: v.max };
  }

  function requerDominancia(item) {
    return !!item.valoracao.por_dominancia;
  }
  function requerLado(item) {
    return requerDominancia(item) || !!item.segmento_lateral;
  }

  // ── validação de uma seleção ─────────────────────────────────────────────
  /**
   * @param {object} item  registro do catálogo
   * @param {object} sel   {uid,itemId,lado?:'D'|'E',valor:number,justificativa?:string,vinculo?:uid}
   * @param {object} ctx   {dominancia:'D'|'E'|null}
   * @returns {{ok:boolean, erros:string[], faixa:object|null, dominante:boolean|null}}
   */
  function validarSelecao(item, sel, ctx) {
    var erros = [];
    if (!item) return { ok: false, erros: ['Item inexistente no catálogo: ' + sel.itemId], faixa: null, dominante: null };

    var dominante = null;
    if (requerLado(item)) {
      if (sel.lado !== 'D' && sel.lado !== 'E') erros.push('Informe o lado (D/E).');
    }
    if (requerDominancia(item)) {
      if (ctx.dominancia !== 'D' && ctx.dominancia !== 'E') {
        erros.push('Informe a dominância lateral do periciando: o item distingue lado dominante e não dominante.');
      } else if (sel.lado === 'D' || sel.lado === 'E') {
        dominante = sel.lado === ctx.dominancia;
      }
    }

    var faixa = faixaDoItem(item, dominante);
    if (!isNum(sel.valor)) {
      erros.push('Percentual ausente ou não numérico.');
    } else {
      if (sel.valor <= 0 || sel.valor > 100) erros.push('Percentual deve estar no intervalo (0, 100].');
      if (Math.round(sel.valor * 100) !== sel.valor * 100) erros.push('Use no máximo duas casas decimais.');
      if (faixa) {
        if (sel.valor < faixa.min - EPS || sel.valor > faixa.max + EPS) {
          erros.push(
            faixa.min === faixa.max
              ? 'Valor fixo da tabela: ' + faixa.min + '%. Valor informado: ' + sel.valor + '%.'
              : 'Fora do intervalo da tabela (' + faixa.min + ' a ' + faixa.max + '%): ' + sel.valor + '%.'
          );
        }
      }
    }
    if (faixa && faixa.min !== faixa.max && !(sel.justificativa && sel.justificativa.trim())) {
      erros.push('Intervalo exige justificativa do valor atribuído (Orientação 2).');
    }
    if (item.valoracao.tipo === 'acrescimo' && !sel.vinculo) {
      erros.push('Acréscimo deve estar vinculado a uma sequela principal.');
    }
    return { ok: erros.length === 0, erros: erros, faixa: faixa, dominante: dominante };
  }

  // ── cálculo ──────────────────────────────────────────────────────────────
  /**
   * @param {object} input {catalog, selecoes:[], dominancia:'D'|'E'|null}
   * @returns resultado com final, bruto, unidades, grupos, passos, alertas, erros
   */
  function calcular(input) {
    var catalog = input.catalog || { itens: [] };
    var idx = indexCatalog(catalog);
    var ctx = { dominancia: input.dominancia || null };
    var selecoes = (input.selecoes || []).slice();
    var passos = [];
    var alertas = [];
    var errosPorSel = {};
    var bloqueante = false;

    function alerta(nivel, codigo, msg, refs) {
      alertas.push({ nivel: nivel, codigo: codigo, mensagem: msg, refs: refs || [] });
      if (nivel === 'erro') bloqueante = true;
    }

    // 1. validação individual
    var validas = [];
    var porUid = {};
    selecoes.forEach(function (s) {
      var it = idx.byId[s.itemId];
      var v = validarSelecao(it, s, ctx);
      if (!v.ok) {
        errosPorSel[s.uid] = v.erros;
        alerta('erro', 'SELECAO_INVALIDA', (it ? it.rotulo : s.itemId) + ': ' + v.erros.join(' '), [s.uid]);
        return;
      }
      var rec = { sel: s, item: it, valor: s.valor, dominante: v.dominante, faixa: v.faixa };
      validas.push(rec);
      porUid[s.uid] = rec;
    });

    // 2. duplicidade estrita (Orientação 3: sequela mensurada uma única vez)
    var vistos = {};
    validas.forEach(function (r) {
      var k = r.item.id + '|' + (r.sel.lado || '-');
      if (vistos[k]) {
        alerta('erro', 'DUPLICIDADE', 'Mesmo item selecionado mais de uma vez (' + r.item.rotulo + (r.sel.lado ? ', lado ' + r.sel.lado : '') + '). Orientação 3.', [vistos[k], r.sel.uid]);
      } else vistos[k] = r.sel.uid;
    });

    // 3. possíveis sobreposições declaradas no catálogo (aviso — decisão do perito)
    var paresVistos = {};
    validas.forEach(function (r) {
      (r.item.possivel_sobreposicao || []).forEach(function (outroId) {
        validas.forEach(function (o) {
          var par = [r.sel.uid, o.sel.uid].sort().join('§');
          if (o.item.id === outroId && o !== r && (o.sel.lado || '-') === (r.sel.lado || '-') && !paresVistos[par]) {
            paresVistos[par] = true;
            alerta('aviso', 'POSSIVEL_SOBREPOSICAO', 'Possível dupla valoração: "' + r.item.rotulo + '" e "' + o.item.rotulo + '". Confirme se representam danos distintos (Orientação 3).', [r.sel.uid, o.sel.uid]);
          }
        });
      });
    });

    // 4. acréscimos: soma direta ao valor da sequela vinculada
    var acrescimos = validas.filter(function (r) { return r.item.valoracao.tipo === 'acrescimo'; });
    var principais = validas.filter(function (r) { return r.item.valoracao.tipo !== 'acrescimo'; });
    var ajustado = {};
    principais.forEach(function (r) { ajustado[r.sel.uid] = r.valor; });
    acrescimos.forEach(function (a) {
      var alvo = porUid[a.sel.vinculo];
      if (!alvo || alvo.item.valoracao.tipo === 'acrescimo') {
        alerta('erro', 'ACRESCIMO_SEM_ALVO', 'Acréscimo "' + a.item.rotulo + '" vinculado a sequela inexistente ou inválida.', [a.sel.uid]);
        return;
      }
      if (alvo.item.segmento && a.item.segmento && alvo.item.segmento !== a.item.segmento) {
        alerta('aviso', 'ACRESCIMO_SEGMENTO', 'Acréscimo "' + a.item.rotulo + '" vinculado a sequela de outro segmento.', [a.sel.uid, alvo.sel.uid]);
      }
      var antes = ajustado[alvo.sel.uid];
      ajustado[alvo.sel.uid] = antes + a.valor;
      passos.push({ tipo: 'acrescimo', texto: 'Acréscimo direto: ' + alvo.item.rotulo + ' ' + fmt(antes) + '% + ' + a.item.rotulo + ' ' + fmt(a.valor) + '% = ' + fmt(ajustado[alvo.sel.uid]) + '%', fonte: a.item.fonte });
      if (a.item.regra_acrescimo !== 'expressa') {
        alerta('aviso', 'REGRA_INTERPRETATIVA', 'A soma direta de "' + a.item.rotulo + '" é interpretação da expressão "Acrescentar" da tabela; validar.', [a.sel.uid]);
      }
    });

    // 5. unidades: grupos de soma direta expressa (mesmo grupo + mesmo lado) ou sequela isolada
    var unidades = [];
    var gruposSoma = {};
    principais.forEach(function (r) {
      var g = r.item.combinacao && r.item.combinacao.grupo_soma_direta;
      if (g) {
        var k = g + '|' + (r.sel.lado || '-');
        if (!gruposSoma[k]) {
          gruposSoma[k] = { chave: k, rotulo: r.item.combinacao.rotulo_grupo || g, membros: [], item: r.item, lado: r.sel.lado || null };
          unidades.push(gruposSoma[k]);
        }
        gruposSoma[k].membros.push(r);
      } else {
        unidades.push({ chave: r.sel.uid, rotulo: r.item.rotulo, membros: [r], item: r.item, lado: r.sel.lado || null });
      }
    });
    unidades.forEach(function (u) {
      u.valor = u.membros.reduce(function (acc, r) { return acc + ajustado[r.sel.uid]; }, 0);
      if (u.membros.length > 1) {
        passos.push({ tipo: 'soma_direta', texto: 'Soma direta expressa (' + u.rotulo + '): ' + u.membros.map(function (r) { return fmt(ajustado[r.sel.uid]) + '%'; }).join(' + ') + ' = ' + fmt(u.valor) + '%', fonte: u.item.fonte });
      }
      u.segmento = u.item.segmento || null;
      u.chaveSegmento = u.segmento ? u.segmento + (u.item.segmento_lateral ? '|' + (u.lado || '-') : '') : null;
    });

    // 6. combinação por segmento (Balthazard) + limite da perda total (Orientação 7)
    var grupos = [];
    var porSeg = {};
    unidades.forEach(function (u) {
      var k = u.chaveSegmento || ('__isolada__' + u.chave);
      if (!porSeg[k]) {
        porSeg[k] = { chave: k, segmento: u.segmento, lado: u.lado, unidades: [] };
        grupos.push(porSeg[k]);
      }
      porSeg[k].unidades.push(u);
    });
    grupos.forEach(function (g) {
      var vals = g.unidades.map(function (u) { return u.valor; }).sort(function (a, b) { return b - a; });
      g.valorBruto = g.unidades.length > 1 ? balthazard(vals) : vals[0];
      if (g.unidades.length > 1) {
        passos.push({ tipo: 'balthazard_segmento', texto: 'Balthazard no segmento ' + g.segmento + (g.lado ? ' (' + g.lado + ')' : '') + ': ' + vals.map(fmt).join('% ⊕ ') + '% = ' + fmt(g.valorBruto) + '%' });
      }
      g.valor = g.valorBruto;
      var lim = g.segmento ? idx.limites[g.segmento] : null;
      if (lim) {
        var teto = null;
        if (lim.por_dominancia) {
          if (ctx.dominancia && g.lado) teto = (g.lado === ctx.dominancia) ? lim.por_dominancia.dominante : lim.por_dominancia.nao_dominante;
        } else teto = lim.valor;
        if (teto === null) {
          alerta('aviso', 'LIMITE_INDETERMINADO', 'Não foi possível aplicar o limite do segmento ' + g.segmento + ' sem lado/dominância.', []);
        } else if (g.valor > teto + EPS) {
          passos.push({ tipo: 'limite', texto: 'Limite do segmento ' + g.segmento + (g.lado ? ' (' + g.lado + ')' : '') + ': ' + fmt(g.valor) + '% reduzido a ' + fmt(teto) + '% (perda total — ' + lim.rotulo + ')', fonte: lim.fonte });
          alerta('aviso', 'LIMITE_APLICADO', 'Valor do segmento ' + g.segmento + ' limitado a ' + teto + '% (Orientação 7). Mapeamento do limite é interpretativo; validar.', []);
          g.valor = teto;
          g.limitado = true;
        }
      }
    });

    // 7. combinação global (Balthazard) — Orientação 5; teto 100 (Orientação 6)
    var valsGlob = grupos.map(function (g) { return g.valor; }).sort(function (a, b) { return b - a; });
    var bruto = valsGlob.length === 0 ? 0 : (valsGlob.length === 1 ? valsGlob[0] : balthazard(valsGlob));
    if (valsGlob.length > 1) {
      passos.push({ tipo: 'balthazard_global', texto: 'Balthazard global: ' + valsGlob.map(fmt).join('% ⊕ ') + '% = ' + fmt(bruto) + '%' });
    }
    if (bruto > 100) bruto = 100;
    var final = roundHalfUp(bruto);
    passos.push({ tipo: 'arredondamento', texto: 'Arredondamento aritmético para inteiro (Orientação 8): ' + fmt(bruto) + '% → ' + final + '%' });

    if (catalog.meta && catalog.meta.status !== 'validado') {
      alerta('aviso', 'DADOS_NAO_VALIDADOS', 'Catálogo em estado "' + (catalog.meta.status || 'desconhecido') + '". Resultado não utilizável em laudo.', []);
    }

    return {
      versao_motor: VERSION,
      valido: !bloqueante,
      final: bloqueante ? null : final,
      bruto: bloqueante ? null : bruto,
      unidades: unidades,
      grupos: grupos,
      passos: passos,
      alertas: alertas,
      errosPorSelecao: errosPorSel,
    };
  }

  // ── memória de cálculo / texto para laudo ────────────────────────────────
  function textoLaudo(input, res) {
    var idx = indexCatalog(input.catalog);
    var L = [];
    L.push('APURAÇÃO DO DANO CORPORAL — MEMÓRIA DE CÁLCULO');
    L.push('Referência: ' + ((input.catalog.meta && input.catalog.meta.obra) || 'Tabela Brasileira para a Apuração do Dano Corporal, ABMLPM, 1ª ed., 2024'));
    if (input.catalog.meta && input.catalog.meta.status !== 'validado') {
      L.push('*** DADOS DE TESTE — NÃO VALIDADOS CONTRA A FONTE — NÃO UTILIZAR EM LAUDO ***');
    }
    if (input.dominancia) L.push('Dominância lateral: ' + (input.dominancia === 'D' ? 'direita' : 'esquerda'));
    L.push('');
    L.push('Sequelas valoradas:');
    (input.selecoes || []).forEach(function (s, i) {
      var it = idx.byId[s.itemId];
      if (!it) return;
      var f = it.fonte || {};
      L.push((i + 1) + '. ' + it.caminho + ' — ' + it.rotulo + (s.lado ? ' (lado ' + (s.lado === 'D' ? 'direito' : 'esquerdo') + ')' : '') +
        ': ' + String(s.valor).replace('.', ',') + '% [p. ' + (f.pagina || '?') + ']' +
        (s.justificativa ? ' — Fundamentação: ' + s.justificativa.trim() : ''));
    });
    L.push('');
    L.push('Cálculo:');
    res.passos.forEach(function (p) { L.push('- ' + p.texto); });
    L.push('');
    if (res.valido) {
      L.push('Dano corporal (déficit funcional permanente) global: ' + res.final + '%.');
    } else {
      L.push('Cálculo bloqueado por inconsistências: ' + res.alertas.filter(function (a) { return a.nivel === 'erro'; }).map(function (a) { return a.mensagem; }).join(' | '));
    }
    L.push('Nota: o percentual refere-se ao dano corporal e não infere incapacidade laboral (Princípio IV). Motor v' + VERSION + '.');
    return L.join('\n');
  }

  return {
    VERSION: VERSION,
    roundHalfUp: roundHalfUp,
    balthazard: balthazard,
    validarSelecao: validarSelecao,
    calcular: calcular,
    textoLaudo: textoLaudo,
  };
});
