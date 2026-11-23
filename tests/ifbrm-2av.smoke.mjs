// Smoke do IFBRM com 2 avaliadores (Playwright). Uso: python3 -m http.server 8765 → node tests/ifbrm-2av.smoke.mjs (Supabase interceptado; nada é gravado).
import { chromium } from 'playwright';
const base = 'http://127.0.0.1:8765/app.html';
const out = []; let fails = 0;
const check = (n, c, extra = '') => { out.push((c ? 'PASS ' : 'FAIL ') + n + (extra ? '  ' + extra : '')); if (!c) fails++; };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const sb = []; const errs = [];
await page.route(/supabase\.co/, async (route) => {
  const r = route.request(); sb.push({ m: r.method(), u: r.url().replace(/\?.*/, ''), b: r.postData() });
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  if (r.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: h });
  return route.fulfill({ status: 201, headers: h, body: '' });
});
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('dialog', d => d.accept());
await page.goto(base);
await page.waitForFunction(() => typeof calcScores === 'function');

const res = await page.evaluate(() => {
  const faixas = ['0-4', '5-10', '11-17', '18-59', '60+'];
  const tipos = [[], ['C1'], ['C2'], ['C3'], ['C4'], ['C5'], ['C1', 'C3']];
  const pads = { c100: () => 100, c75: () => 75, c50: () => 50, c25: () => 25, mix: (i) => [100, 75, 50, 25][i % 4] };
  const o = [];
  for (const f of faixas) for (const t of tipos) for (const [pn, pf] of Object.entries(pads)) {
    S.data = { faixa: f }; t.forEach(x => S.data[x] = true); if (t.length > 1) S.data.tipo_prim = t[0]; S.scoreCache = null;
    let i = 0;
    IFBRM.forEach(d => d.items.forEach(it => { if (itemApplies(it.id, f)) { const v = pf(i++); S.data[it.id] = v; S.data['av2_' + it.id] = v; } }));
    S.scoreCache = null;
    const s = calcScores(); const r = getRegua(f, t);
    const c = classifyBySum(s.fuzzySum, f, t); const cf = applyPonderacao(classificarCompleto(s.fuzzySum, f, t), f, t, S.data);
    o.push({ f, t: t.join('+'), pn, raw: s.rawSum, fz: s.fuzzySum, filled: s.filled, total: s.total, completo: s.completo, min: r.min, max: r.max, cls: c && c.cls, fin: cf && cf.cls, pond: cf && cf.ponderado });
  }
  return o;
});
const bad = [];
const order = { Grave: 0, Moderado: 1, Leve: 2, Insuficiente: 3 };
for (const r of res) {
  if (!r.completo || r.filled !== r.total) bad.push(['incompleto', r]);
  if (r.fz > r.raw) bad.push(['fuzzy>bruto', r]);
  if (r.pn === 'c25' && r.t === '' && r.raw !== r.min) bad.push(['piso ≠ mín. da régua', r]);
  if (r.pn === 'c100' && r.raw !== r.max) bad.push(['teto ≠ máx. da régua', r]);
  if (r.raw < r.min || r.raw > r.max) bad.push(['fora da régua', r]);
  if (!r.cls) bad.push(['sem classificação', r]);
  if (r.pn === 'c100' && r.cls !== 'Insuficiente') bad.push(['todo 100 → Insuficiente', r]);
  if (r.pn === 'c25' && r.cls !== 'Grave') bad.push(['todo 25 → Grave', r]);
}
const k = {}; res.forEach(r => (k[r.f + '|' + r.t] = k[r.f + '|' + r.t] || {})[r.pn] = r);
for (const [kk, v] of Object.entries(k)) if (!(order[v.c25.cls] <= order[v.c50.cls] && order[v.c50.cls] <= order[v.c75.cls] && order[v.c75.cls] <= order[v.c100.cls])) bad.push(['não monotônico', kk]);
check(`motor: ${res.length} cenários (5 faixas × 7 tipos × 5 padrões, 2 avaliadores iguais)`, bad.length === 0, bad.length ? JSON.stringify(bad.slice(0, 4)) : '');
const lim = res.filter(r => r.t === '' && (r.pn === 'c25' || r.pn === 'c100')).map(r => `${r.f} ${r.pn}=${r.raw}`);
out.push('INFO piso/teto: ' + lim.join(' | '));
out.push('INFO exemplos 18-59 sem tipo: ' + res.filter(r => r.f === '18-59' && r.t === '').map(r => `${r.pn}:${r.raw}→${r.cls}`).join(' '));
out.push('INFO exemplos 60+ sem tipo: ' + res.filter(r => r.f === '60+' && r.t === '').map(r => `${r.pn}:${r.raw}→${r.cls}`).join(' '));
out.push('INFO ponderação rebaixou em ' + res.filter(r => r.pond).length + ' de ' + res.length);

// só avaliador 1 preenchido → sem classificação e sem envio
const inc = await page.evaluate(() => {
  S.data = { faixa: '60+' }; IFBRM.forEach(d => d.items.forEach(it => { S.data[it.id] = 50; })); S.scoreCache = null;
  const s = calcScores(); return { completo: s.completo, filled: s.filled, total: s.total, cls: classificarCompleto(s.fuzzySum, '60+', []) };
});
check('só avaliador 1 → incompleto, sem classificação', !inc.completo && inc.cls === null, JSON.stringify(inc));

// discordância entre avaliadores: soma dos dois
const dis = await page.evaluate(() => {
  S.data = { faixa: '60+' }; IFBRM.forEach(d => d.items.forEach(it => { S.data[it.id] = 100; S.data['av2_' + it.id] = 50; })); S.scoreCache = null;
  const s = calcScores(); return { raw: s.rawSum, a1: s.av[1].rawSum, a2: s.av[2].rawSum };
});
check('discordância: 12×100 + 12×50 = 1800', dis.raw === 1800 && dis.a1 === 1200 && dis.a2 === 600, JSON.stringify(dis));

// ponderação: qualquer um dos avaliadores atinge o limiar
const pond = await page.evaluate(() => {
  const set = (a1, a2) => { S.data = { faixa: '18-59', C1: true }; IFBRM.forEach(d => d.items.forEach(it => { S.data[it.id] = 25; S.data['av2_' + it.id] = 25; }));
    ['i51', 'i53', 'i56', 'i64', 'i77'].forEach(id => { S.data[id] = a1; S.data['av2_' + id] = a2; }); S.scoreCache = null; const c = classificarCompleto(calcScores().fuzzySum, '18-59', ['C1']); return applyPonderacao(c, '18-59', ['C1'], S.data); };
  return { ambos100: set(100, 100), um25: set(100, 25) };
});
check('ponderação: ambos 100 nas chaves → rebaixa', pond.ambos100.ponderado === true, pond.ambos100.clsAntes + '→' + pond.ambos100.cls);
check('ponderação: um avaliador com 25 → mantém', pond.um25.ponderado === false, pond.um25.cls);

// impedimento primário (D-030): vários tipos sem primário → incompleto; só o primário vale
const prim = await page.evaluate(() => {
  const fill = () => { IFBRM.forEach(d => d.items.forEach(it => { if (itemApplies(it.id, '18-59')) { S.data[it.id] = 50; S.data['av2_' + it.id] = 50; } })); S.scoreCache = null; };
  S.data = { faixa: '18-59', C1: true, C3: true }; fill(); const a = calcScores();
  S.data = { faixa: '18-59', C1: true, C3: true, tipo_prim: 'C3' }; fill(); const b = calcScores();
  S.data = { faixa: '18-59', C1: true }; fill(); const c = calcScores();
  S.data = { faixa: '18-59', C1: true, C3: true, tipo_prim: 'C2' }; fill(); const d = calcScores();
  return { a: [a.completo, a.types.length], b: [b.completo, b.types.join()], c: [c.completo, c.types.join()], d: d.completo };
});
check('primário: 2 tipos sem primário → incompleto', prim.a[0] === false && prim.a[1] === 0, JSON.stringify(prim.a));
check('primário: 2 tipos + primário C3 → só C3 vale', prim.b[0] === true && prim.b[1] === 'C3', JSON.stringify(prim.b));
check('primário: 1 tipo → é o primário', prim.c[0] === true && prim.c[1] === 'C1');
check('primário: primário não marcado → incompleto', prim.d === false);

// fluxo pela UI
await page.reload(); await page.waitForFunction(() => typeof calcScores === 'function');
await page.check('#lgpd_chk'); await page.evaluate(() => startApp());
await page.locator('.ri', { hasText: '60+' }).first().click();
await page.evaluate(() => { sv('sexo', 'F'); sv('uf', 'SP'); sv('C1', true); setCids(['G80']); });
for (let i = 0; i < 2; i++) await page.evaluate(() => nav(1));
const rows = await page.locator('.item-card').first().locator('.db-row').count();
check('UI: cartão tem linha do Avaliador 1 e do Avaliador 2', rows === 2);
check('UI: selo de atividade discriminante/informativa', (await page.locator('.disc-tag').count()) > 0);
// avaliador 1 pelo clique, avaliador 2 pelo clique, em todas as telas de itens
let clicks = 0;
for (let sc = 2; sc <= 8; sc++) {
  await page.evaluate((x) => goTo(x), sc);
  const cards = page.locator('.item-card');
  const n = await cards.count();
  for (let c = 0; c < n; c++) {
    const card = cards.nth(c);
    await card.locator('.db-row').nth(0).locator('.db').nth(2).click(); // 50
    await card.locator('.db-row').nth(1).locator('.db').nth(2).click(); // 50
    clicks += 2;
  }
}
const sc = await page.evaluate(() => { const s = calcScores(); return { completo: s.completo, filled: s.filled, total: s.total, raw: s.rawSum, fz: s.fuzzySum }; });
check('UI: pontuação por clique (2 avaliadores) completa', sc.completo, JSON.stringify(sc) + ' cliques=' + clicks);
check('UI: badge de domínio atualiza', (await page.evaluate(() => { goTo(2); return document.getElementById('ds-1')?.textContent; })) !== '—');
await page.evaluate(() => goTo(9)); await page.waitForTimeout(800);
const txt = await page.locator('#content').innerText();
check('UI: resultado classifica (60+, 12×2×50=1200 → Grave por régua ≤1400)', /GRAVE/.test(txt) && /Escore (ajustado|bruto)/.test(txt), txt.split('\n').slice(0, 5).join(' / ').slice(0, 200));
const ins = sb.filter(x => x.m === 'POST' && /avaliacoes/.test(x.u));
check('UI: 1 envio (interceptado) após completo', ins.length === 1);
if (ins[0]) { const row = JSON.parse(ins[0].b)[0]; check('UI: envio com 2 avaliadores, cids, versão', row.itens_brutos && row.itens_brutos.avaliador_1 && row.itens_brutos.avaliador_2 && row.cids[0] === 'G80' && row.versao_app === 'funcio_v3_2av' && row.classificacao === 'Grave', JSON.stringify({ cls: row.classificacao, bruto: row.escore_bruto, fuzzy: row.escore_fuzzy, itens: row.itens_preenchidos, v: row.versao_app })); }
// incompleto não envia
await page.evaluate(() => sessionStorage.clear());
await page.reload(); await page.waitForFunction(() => typeof calcScores === 'function');
const before = sb.length;
await page.check('#lgpd_chk'); await page.evaluate(() => { startApp(); sv('faixa', '18-59'); IFBRM.forEach(d => d.items.forEach(it => sv(it.id, 50))); goTo(9); });
await page.waitForTimeout(600);
check('UI: incompleto não envia ao banco e avisa', sb.slice(before).filter(x => /avaliacoes/.test(x.u)).length === 0 && /Avaliação incompleta/.test(await page.locator('#content').innerText()));
// exportações
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }).catch(() => null), page.evaluate(() => exportJSON())]);
check('UI: exportar JSON', !!dl);
for (const m of ['resumido', 'completo']) { const ok = await page.evaluate((m) => { try { gerarPDF(m); return true; } catch (e) { return String(e); } }, m); check('UI: PDF ' + m, ok === true, String(ok)); }
check('UI: sem erros de console', errs.length === 0, errs.slice(0, 3).join(' | '));
console.log(out.join('\n')); console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK');
await browser.close(); process.exit(fails ? 1 : 0);
