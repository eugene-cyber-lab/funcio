/* Funcio · Dano Corporal · camada de apresentação.
 * Não contém regras de cálculo: delega ao FuncioDanoEngine.
 * Estado apenas em memória (sem storage, sem rede). */
(function () {
  'use strict';
  var E = window.FuncioDanoEngine;
  var CAT = window.FuncioDanoCatalog || window.FuncioDanoDemoCatalog;
  var byId = {};
  CAT.itens.forEach(function (it) { byId[it.id] = it; });

  var SISTEMAS = {
    nervoso: 'Nervoso', psiquiatrico: 'Psiquiátrico',
    oftalmologico: 'Oftalmológico', otorrinolaringologico: 'ORL', estomatologico: 'Estomatológico',
    musculoesqueletico: 'Musculoesquelético',
    cardiaco: 'Cardíaco', respiratorio: 'Respiratório',
    vascular: 'Vascular', digestivo: 'Digestivo',
    urinario: 'Urinário', sexual_reprodutor: 'Sexual/Reprodutor',
    endocrino: 'Endócrino', cutaneo: 'Cutâneo',
  };
  var st = { q: '', sistema: null, atual: null, dominancia: '', selecoes: [], seq: 0 };

  function $(id) { return document.getElementById(id); }
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') el.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function norm(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function pct(f) { return f.min === f.max ? f.min + '%' : f.min + ' a ' + f.max + '%'; }

  // ── navegação ─────────────────────────────────────────────────────────────
  function renderChips() {
    var box = $('chips'); box.textContent = '';
    [[null, 'Todos']].concat(Object.keys(SISTEMAS).map(function (k) { return [k, SISTEMAS[k]]; })).forEach(function (p) {
      box.appendChild(h('button', { type: 'button', class: 'chip', 'aria-pressed': String(st.sistema === p[0]), text: p[1],
        onclick: function () { st.sistema = p[0]; renderChips(); renderTree(); } }));
    });
  }
  function renderTree() {
    var tree = $('tree'); tree.textContent = '';
    var q = norm(st.q);
    var itens = CAT.itens.filter(function (it) {
      if (st.sistema && it.sistema !== st.sistema) return false;
      if (!q) return true;
      return norm([it.rotulo, it.estrutura, it.caminho, it.texto_original, it.titulo, it.subcapitulo].join(' ')).indexOf(q) >= 0;
    });
    if (!itens.length) { tree.appendChild(h('p', { class: 'empty', text: 'Nenhuma sequela encontrada no conjunto de teste.' })); return; }
    var grupo = null;
    itens.forEach(function (it) {
      var g = 'Cap. ' + it.capitulo.n + ' · ' + it.capitulo.titulo + (it.subcapitulo ? ' · ' + it.subcapitulo.replace(/^.*– /, '') : '');
      if (g !== grupo) { grupo = g; tree.appendChild(h('div', { class: 'grp', text: g })); }
      tree.appendChild(h('button', { type: 'button', class: 'it', role: 'listitem', 'aria-current': String(st.atual === it.id),
        onclick: function () { st.atual = it.id; renderTree(); renderAval(); $('p-aval').focus({ preventScroll: true }); } },
        [it.rotulo, h('small', { text: it.caminho + ' · p. ' + it.fonte.pagina })]));
    });
  }

  // ── avaliação ─────────────────────────────────────────────────────────────
  function renderAval() {
    var box = $('aval'); box.textContent = '';
    var it = byId[st.atual];
    if (!it) { box.appendChild(h('p', { class: 'empty', text: 'Selecione uma sequela na navegação.' })); return; }
    var v = it.valoracao;
    var precisaLado = !!(v.por_dominancia || it.segmento_lateral);

    box.appendChild(h('h3', { style: 'margin:0 0 4px;font-size:17px', text: it.rotulo }));
    box.appendChild(h('div', null, [
      h('span', { class: 'tag', text: v.tipo }),
      h('span', { class: 'tag', text: 'p. ' + it.fonte.pagina }),
      h('span', { class: 'tag', text: ({ nao_validado: 'não validado', em_revisao: 'em revisão', validado: 'validado' })[it.validacao.status] || it.validacao.status }),
      v.tipo === 'acrescimo' && it.regra_acrescimo !== 'expressa' ? h('span', { class: 'tag interp', text: 'regra interpretativa' }) : null,
      it.combinacao && it.combinacao.grupo_soma_direta ? h('span', { class: 'tag', text: 'soma direta expressa' }) : null,
    ]));
    box.appendChild(h('dl', { class: 'kv' }, [
      h('dt', { text: 'Localização' }), h('dd', { text: it.caminho + (it.titulo ? ' · ' + it.titulo : '') }),
      h('dt', { text: 'Estrutura' }), h('dd', { text: it.estrutura }),
    ]));
    box.appendChild(h('div', { class: 'orig', title: 'Texto transcrito da tabela', text: '“' + it.texto_original + '”' }));
    (it.condicoes || []).forEach(function (c) {
      box.appendChild(h('p', { style: 'font-size:13.5px;margin:8px 0 0' }, [h('strong', { text: 'Critério: ' }), c.texto, h('span', { class: 'tag', style: 'margin-left:6px', text: 'paráfrase da fonte' })]));
    });
    if (it.combinacao && it.combinacao.rotulo_grupo) box.appendChild(h('p', { style: 'font-size:13px;color:var(--muted)', text: it.combinacao.rotulo_grupo }));

    var faixaTxt = v.por_dominancia
      ? 'Dominante ' + pct(v.por_dominancia.dominante) + ' · Não dominante ' + pct(v.por_dominancia.nao_dominante)
      : pct(v);
    box.appendChild(h('div', { class: 'faixa', text: (v.tipo === 'acrescimo' ? 'Acrescentar ' : '') + faixaTxt }));

    var lado = null;
    if (precisaLado) {
      var r = h('div', { class: 'radio', role: 'radiogroup', 'aria-label': 'Lado acometido' });
      ['D', 'E'].forEach(function (s) {
        var inp = h('input', { type: 'radio', name: 'lado', value: s, onchange: sync });
        r.appendChild(h('label', null, [inp, s === 'D' ? 'Direito' : 'Esquerdo']));
      });
      box.appendChild(h('label', { text: 'Lado acometido' })); box.appendChild(r);
    }

    var valor = h('input', { id: 'valor', type: 'number', step: '0.01', min: '0', max: '100', inputmode: 'decimal', oninput: sync });
    var just = h('textarea', { id: 'just', placeholder: 'Gravidade, repercussão funcional, achados de exame que fundamentam o valor', oninput: sync });
    box.appendChild(h('div', { class: 'row' }, [h('div', null, [h('label', { for: 'valor', text: 'Percentual atribuído (%)' }), valor])]));
    box.appendChild(h('label', { for: 'just', text: 'Fundamentação' })); box.appendChild(just);

    var vinc = null;
    if (v.tipo === 'acrescimo') {
      vinc = h('select', { id: 'vinc', onchange: sync }, [h('option', { value: '', text: '— sequela principal —' })]);
      st.selecoes.forEach(function (s) {
        var p = byId[s.itemId];
        if (p.valoracao.tipo !== 'acrescimo') vinc.appendChild(h('option', { value: s.uid, text: p.rotulo + (s.lado ? ' (' + s.lado + ')' : '') + ' — ' + s.valor + '%' }));
      });
      box.appendChild(h('label', { for: 'vinc', text: 'Acrescentar à sequela' })); box.appendChild(vinc);
    }
    var errs = h('ul', { class: 'errs', 'aria-live': 'polite' });
    var add = h('button', { type: 'button', class: 'primary', text: 'Incluir na avaliação', onclick: incluir });
    box.appendChild(errs); box.appendChild(add);

    function montar() {
      var l = box.querySelector('input[name=lado]:checked');
      lado = l ? l.value : null;
      return { uid: 'u' + (st.seq + 1), itemId: it.id, lado: lado || undefined,
        valor: valor.value === '' ? NaN : Number(valor.value), justificativa: just.value, vinculo: vinc ? vinc.value || undefined : undefined };
    }
    function sync() {
      // fixa automaticamente o valor quando a faixa aplicável é um valor único
      var s = montar();
      var f = null;
      if (v.por_dominancia && s.lado && st.dominancia) f = s.lado === st.dominancia ? v.por_dominancia.dominante : v.por_dominancia.nao_dominante;
      else if (!v.por_dominancia) f = v;
      if (f && f.min === f.max && valor.value === '') valor.value = f.min;
      var res = E.validarSelecao(it, montar(), { dominancia: st.dominancia || null });
      errs.textContent = '';
      if (valor.value !== '' || s.lado) res.erros.forEach(function (e) { errs.appendChild(h('li', { text: e })); });
      add.disabled = !res.ok;
    }
    function incluir() {
      var s = montar();
      if (!E.validarSelecao(it, s, { dominancia: st.dominancia || null }).ok) return;
      st.seq++; st.selecoes.push(s);
      renderAval(); renderResultado();
    }
    sync();
  }

  // ── resultado ─────────────────────────────────────────────────────────────
  function renderResultado() {
    var input = { catalog: CAT, selecoes: st.selecoes, dominancia: st.dominancia || null };
    var res = E.calcular(input);
    $('total').textContent = st.selecoes.length ? (res.valido ? res.final + '%' : '—') : '—';
    $('total-l').textContent = !st.selecoes.length ? 'Sem sequelas' : (res.valido ? 'Dano corporal global (déficit funcional permanente)' : 'Cálculo bloqueado — corrija os erros');

    var ul = $('lista'); ul.textContent = '';
    st.selecoes.forEach(function (s) {
      var it = byId[s.itemId];
      var alvo = s.vinculo ? st.selecoes.filter(function (x) { return x.uid === s.vinculo; })[0] : null;
      ul.appendChild(h('li', null, [
        h('span', { class: 'v', text: (it.valoracao.tipo === 'acrescimo' ? '+' : '') + String(s.valor).replace('.', ',') + '%' }),
        h('span', { class: 't' }, [it.rotulo + (s.lado ? ' (' + (s.lado === 'D' ? 'D' : 'E') + ')' : ''),
          h('small', { text: it.caminho + ' · p. ' + it.fonte.pagina + (alvo ? ' · acréscimo a ' + byId[alvo.itemId].rotulo : '') + (s.justificativa ? ' · ' + s.justificativa : '') })]),
        h('button', { type: 'button', class: 'ghost', 'aria-label': 'Remover ' + it.rotulo, text: 'Remover', onclick: function () { remover(s.uid); } }),
      ]));
    });

    var al = $('alerts'); al.textContent = '';
    res.alertas.forEach(function (a) { al.appendChild(h('div', { class: 'alert ' + a.nivel, role: a.nivel === 'erro' ? 'alert' : null, text: a.mensagem })); });

    var ol = $('steps'); ol.textContent = '';
    res.passos.forEach(function (p) { ol.appendChild(h('li', { text: p.texto })); });
    $('laudo').value = st.selecoes.length ? E.textoLaudo(input, res) : '';
  }
  function remover(uid) {
    // remove também acréscimos vinculados, que perderiam o alvo
    st.selecoes = st.selecoes.filter(function (s) { return s.uid !== uid && s.vinculo !== uid; });
    renderAval(); renderResultado();
  }

  // ── eventos globais ───────────────────────────────────────────────────────
  $('q').addEventListener('input', function (e) { st.q = e.target.value; renderTree(); });
  $('dom').addEventListener('change', function (e) { st.dominancia = e.target.value; renderAval(); renderResultado(); });
  $('copy').addEventListener('click', function () {
    var t = $('laudo'); t.select();
    var done = function () { $('copy').textContent = 'Copiado'; setTimeout(function () { $('copy').textContent = 'Copiar texto'; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(t.value).then(done, function () { document.execCommand('copy'); done(); });
    else { document.execCommand('copy'); done(); }
  });
  $('clear').addEventListener('click', function () { st.selecoes = []; renderAval(); renderResultado(); });
  $('ver').textContent = 'v' + E.VERSION;

  renderChips(); renderTree(); renderAval(); renderResultado();
})();
