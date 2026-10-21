// S2 PR-1 — fluxo completo de 10 telas pela UI contra um Supabase de STAGING real.
// Não roda sem STAGING_URL e STAGING_KEY (chave anon do staging; nunca commitar).
// Uso: STAGING_URL=https://<ref>.supabase.co STAGING_KEY=<anon> NODE_PATH=<playwright-core> PW_CHROMIUM=<exe> node tests/ifbrm-staging.e2e.cjs
// Usa a supabase-js real da CDN. O host e a chave do app.html são trocados em memória (o arquivo não é alterado).
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright-core');
const { STAGING_URL, STAGING_KEY } = process.env;
if (!STAGING_URL || !STAGING_KEY) { console.log('SKIP: defina STAGING_URL e STAGING_KEY'); process.exit(0); }
if (/plyqitplulyfgevxsyoh/.test(STAGING_URL)) { console.error('RECUSADO: este é o host de produção'); process.exit(2); }

const email = `e2e-${Date.now()}@example.invalid`;
const OBS = 'OBS-E2E-NAO-ENVIAR';
let html = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8')
  .replace(/(SUPABASE_URL\s*=\s*')[^']*(')/, `$1${STAGING_URL}$2`)
  .replace(/(SUPABASE_KEY\s*=\s*')[^']*(')/, `$1${STAGING_KEY}$2`);
const results = []; const check = (nome, ok, det = '') => { results.push({ nome, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + nome + (det ? '  ' + det : '')); };

(async () => {
  const server = http.createServer((q, r) => { r.setHeader('content-type', 'text/html; charset=utf-8'); r.end(html); });
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = 'http://127.0.0.1:' + server.address().port + '/app.html';
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const net = []; const errs = [];
  page.on('response', r => { if (r.url().startsWith(STAGING_URL)) net.push({ m: r.request().method(), p: new URL(r.url()).pathname, s: r.status(), body: r.request().postData() }); });
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror ' + e.message));
  await page.goto(base);

  // Boas-vindas
  await page.fill('#email_input', email);
  await page.check('#lgpd_chk');
  await page.click('#start_btn');
  await page.waitForTimeout(1500);
  check('opt-in via RPC registrar_contato retornou 2xx', net.some(n => n.p === '/rest/v1/rpc/registrar_contato' && n.s >= 200 && n.s < 300), JSON.stringify(net.filter(n => n.p.includes('contato')).map(n => [n.m, n.p, n.s])));
  check('nenhum POST direto em contatos_opt_in', !net.some(n => n.p === '/rest/v1/contatos_opt_in'));

  const titulo = async () => (await page.textContent('#content .pg-title')) || '';
  const telas = [];
  // 0 Dados básicos
  telas.push(await titulo());
  await page.click('.ri:has-text("18-59")');
  await page.selectOption('select >> nth=0', 'Feminino');
  await page.selectOption('select >> nth=1', 'SP');
  await page.click('#bn');
  // 1 Tipo + CIDs
  telas.push(await titulo());
  await page.click('.ci:has-text("Deficiência Física")');
  for (const q of ['G80', 'I69']) {
    await page.fill('#cid_search', q);
    await page.waitForSelector('.cid-item');
    await page.click('.cid-item >> nth=0');
  }
  check('2 CIDs selecionados na UI', (await page.locator('.cid-tag').count()) === 2);
  await page.click('#bn');
  // 2..6 Domínios
  for (let s = 2; s <= 6; s++) {
    telas.push(await titulo());
    const cards = page.locator('.item-card');
    const n = await cards.count();
    for (let i = 0; i < n; i++) await cards.nth(i).locator('.db:has-text("75 —")').click();
    await page.click('#bn');
  }
  // 7 Fuzzy
  telas.push(await titulo());
  await page.click('#bn');
  // 8 Conclusão
  telas.push(await titulo());
  await page.click('.ri:has-text("Pessoa com Deficiência (PcD)")');
  await page.fill('textarea', OBS);
  await page.click('#bn');
  // 9 Resultado
  telas.push(await titulo());
  await page.waitForFunction(() => /Dados enviados|Não foi possível enviar os dados/.test(document.querySelector('#send_status')?.textContent || ''), null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  const send = await page.textContent('#send_status');
  const mail = await page.textContent('#email_status');
  console.log('Telas percorridas:', telas.length, JSON.stringify(telas));
  check('10 telas percorridas', telas.length === 10);
  check('mensagem de sucesso do envio', /Dados enviados/.test(send), send.trim());
  const ins = net.filter(n => n.p === '/rest/v1/avaliacoes');
  check('exatamente 1 POST em avaliacoes com 201', ins.length === 1 && ins[0].s === 201, JSON.stringify(ins.map(i => [i.m, i.s])));
  if (ins[0]) {
    const row = JSON.parse(ins[0].body)[0];
    check('corpo tem cids [G80,I69], cid_principal G80, versao funcio_v2', JSON.stringify(row.cids) === '["G80","I69"]' && row.cid_principal === 'G80' && row.versao_app === 'funcio_v2', JSON.stringify({ cids: row.cids, v: row.versao_app, cls: row.classificacao }));
    check('corpo sem texto livre e sem e-mail', !ins[0].body.includes(OBS) && !ins[0].body.includes(email));
  }
  console.log('E-mail (Edge Function inexistente no staging, falha esperada):', mail.trim(), JSON.stringify(net.filter(n => n.p.startsWith('/functions')).map(n => n.s)));
  console.log('Erros de console:', JSON.stringify(errs));
  await page.screenshot({ path: process.env.SHOT || 'e2e-resultado.png', fullPage: false });
  console.log('EMAIL_TESTE=' + email);
  await browser.close(); server.close();
  const falhas = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - falhas}/${results.length} verificações OK`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error('ERRO', e.message); process.exit(1); });
