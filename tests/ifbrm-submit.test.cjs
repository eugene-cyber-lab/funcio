// S2 PR-1 — fluxo de envio do app.html (Playwright, rotas interceptadas, sem rede externa).
// Execução: NODE_PATH=<dir com playwright-core> PW_CHROMIUM=<executável> node --test tests/ifbrm-submit.test.cjs
// A biblioteca supabase-js da CDN é substituída por um cliente mínimo que usa fetch para o host interceptado;
// o teste cobre a lógica do app, não a biblioteca real.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
// Host real do app: toda requisição a ele é interceptada e respondida localmente (nada sai da máquina).
const API = APP.match(/SUPABASE_URL\s*=\s*'([^']*)'/)[1];
const STUB_LIB = `window.supabase={createClient:function(u,k){
  async function call(p,b){var r=await fetch(u+p,{method:'POST',headers:{apikey:k,'Content-Type':'application/json'},body:JSON.stringify(b)});
    return r.ok?{error:null}:{error:{code:String(r.status),message:'http '+r.status}};}
  return {from:function(t){return {insert:function(rows){return call('/rest/v1/'+t,rows);}};},
          rpc:function(fn,a){return call('/rest/v1/rpc/'+fn,a);}};}};`;

let server, base, browser;
before(async () => {
  server = http.createServer((q, r) => { r.setHeader('content-type', 'text/html; charset=utf-8'); r.end(APP); });
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  base = 'http://127.0.0.1:' + server.address().port + '/app.html';
  browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, headless: true });
});
after(async () => { await browser.close(); server.close(); });

async function novaPagina({ status = 201, emailStatus = 200 } = {}) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const reqs = [];
  const externas = [];
  page.on('console', m => { if (m.type() === 'error') reqs.consoleErrors = (reqs.consoleErrors || []).concat(m.text()); });
  await page.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith(base.replace('/app.html', ''))) return route.continue();
    if (u.includes('cdn.jsdelivr.net/npm/@supabase')) return route.fulfill({ contentType: 'application/javascript', body: STUB_LIB });
    if (u.includes('cdnjs.cloudflare.com')) return route.fulfill({ contentType: 'application/javascript', body: '' });
    if (u.startsWith(API)) {
      const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST,OPTIONS' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      const path = new URL(u).pathname;
      reqs.push({ path, apikey: route.request().headers()['apikey'], body: route.request().postData() });
      if (path.startsWith('/functions/')) return route.fulfill({ status: emailStatus, body: '{}', contentType: 'application/json', headers: cors });
      return route.fulfill({ status: path.includes('avaliacoes') ? status : 200, body: '{}', contentType: 'application/json', headers: cors });
    }
    externas.push(u);
    return route.abort();
  });
  await page.goto(base);
  page.reqs = reqs; page.externas = externas;
  return page;
}
const avaliacoesReqs = p => p.reqs.filter(r => r.path === '/rest/v1/avaliacoes');

async function preencher(page, { completa = true, obs = '', email = '' } = {}) {
  await page.evaluate(({ completa, obs, email }) => {
    sv('lgpd_ok', true); sv('faixa', '18-59'); sv('sexo', 'Feminino'); sv('uf', 'SP'); sv('C1', true);
    setCids(['G82', 'I69']);
    if (obs) { sv('obs', obs); sv('concl_obs', obs); }
    if (email) sv('email_opt', email);
    IFBRM.forEach((d, di) => d.items.forEach((it, ii) => { if (completa || (di === 0 && ii === 0)) sv(it.id, 75); }));
    sv('perc_av', 'Moderada'); sv('concl', 'pcd');
    S.startedAt = Date.now() - 60000;
    document.getElementById('welcome').style.display = 'none';
  }, { completa, obs, email });
}
const irParaResultado = page => page.evaluate(() => { goTo(TOTAL - 1); });

test('chave do Supabase é um JWT bem formado (sem ";")', () => {
  const m = APP.match(/SUPABASE_KEY\s*=\s*'([^']*)'/);
  assert.ok(m, 'constante encontrada');
  assert.match(m[1], /^[\w-]+\.[\w-]+\.[\w-]+$/);
});

test('sucesso: 1 insert com cids, versão do payload, sem texto livre; mensagem de sucesso', async () => {
  const page = await novaPagina({ status: 201 });
  await preencher(page, { obs: 'TEXTO-LIVRE-SECRETO' });
  await irParaResultado(page);
  await page.waitForSelector('#send_status:has-text("Dados enviados")');
  const r = avaliacoesReqs(page);
  assert.equal(r.length, 1);
  assert.ok(r[0].apikey && !r[0].apikey.endsWith(';'));
  const row = JSON.parse(r[0].body)[0];
  assert.deepEqual(row.cids, ['G82', 'I69']);
  assert.equal(row.cid_principal, 'G82');
  assert.equal(row.versao_app, 'funcio_v2');
  assert.notEqual(row.classificacao, 'Incompleto');
  assert.ok(!r[0].body.includes('TEXTO-LIVRE-SECRETO'), 'texto livre não é enviado');
  assert.ok(!('email' in row));
  assert.deepEqual(page.externas, [], 'nenhuma requisição externa inesperada');
});

test('falha 401: 2 tentativas, erro visível, botão de reenvio; reenvio faz nova tentativa', async () => {
  const page = await novaPagina({ status: 401 });
  await preencher(page);
  await irParaResultado(page);
  await page.waitForSelector('#send_status:has-text("Não foi possível enviar")', { timeout: 8000 });
  assert.equal(avaliacoesReqs(page).length, 2);
  await page.waitForSelector('button:has-text("Tentar enviar novamente")');
  await page.click('button:has-text("Tentar enviar novamente")');
  await page.waitForFunction(() => document.querySelector('#send_status').textContent.includes('Não foi possível'), null, { timeout: 8000 });
  assert.equal(avaliacoesReqs(page).length, 4);
});

test('avaliação sem classificação (Incompleto): nenhuma requisição a avaliacoes e aviso ao usuário', async () => {
  const page = await novaPagina();
  await page.evaluate(() => { sv('lgpd_ok', true); document.getElementById('welcome').style.display = 'none'; });
  assert.equal(await page.evaluate(() => buildPayload().resultado.classificacao), 'Incompleto');
  await irParaResultado(page);
  await page.waitForSelector('#send_status:has-text("incompleta")');
  assert.equal(avaliacoesReqs(page).length, 0);
});

test('submitAnonData com classificacao "Incompleto" não envia', async () => {
  const page = await novaPagina();
  await preencher(page);
  const ok = await page.evaluate(async () => {
    const p = buildPayload(); p.resultado.classificacao = 'Incompleto';
    return await submitAnonData(p);
  });
  assert.equal(ok, true);
  assert.equal(avaliacoesReqs(page).length, 0);
});

test('sem consentimento: nenhuma requisição ao Supabase', async () => {
  const page = await novaPagina();
  await preencher(page);
  await page.evaluate(() => { sv('lgpd_ok', false); goTo(TOTAL - 1); });
  await page.waitForTimeout(500);
  assert.equal(page.reqs.length, 0);
});

test('opt-in usa RPC registrar_contato (não insere direto em contatos_opt_in)', async () => {
  const page = await novaPagina();
  await page.evaluate(() => { sv('lgpd_ok', true); sv('email_opt', 'teste@example.invalid'); startApp(); });
  await page.waitForTimeout(500);
  const paths = page.reqs.map(r => r.path);
  assert.ok(paths.includes('/rest/v1/rpc/registrar_contato'), paths.join(','));
  assert.ok(!paths.includes('/rest/v1/contatos_opt_in'));
  assert.deepEqual(JSON.parse(page.reqs.find(r => r.path.endsWith('registrar_contato')).body), { p_email: 'teste@example.invalid' });
});

test('e-mail: falha da Edge Function é mostrada ao usuário', async () => {
  const page = await novaPagina({ emailStatus: 500 });
  await preencher(page, { email: 'teste@example.invalid' });
  await irParaResultado(page);
  await page.waitForSelector('#email_status:has-text("Não foi possível enviar o resumo")');
});

test('e-mail: sucesso da Edge Function', async () => {
  const page = await novaPagina({ emailStatus: 200 });
  await preencher(page, { email: 'teste@example.invalid' });
  await irParaResultado(page);
  await page.waitForSelector('#email_status:has-text("Resumo enviado")');
});

test('XSS: texto livre com </textarea> não injeta HTML', async () => {
  const page = await novaPagina();
  const payload = '</textarea><img src=x onerror="window.__xss=1">';
  await preencher(page, { obs: payload });
  await page.evaluate(() => goTo(8)); // Critérios Fuzzy (obs)
  await page.evaluate(() => goTo(9 - 1)); // Conclusão
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  assert.equal(await page.evaluate(() => document.querySelector('textarea[oninput*="concl_obs"]').value), payload);
});
