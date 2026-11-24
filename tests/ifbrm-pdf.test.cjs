// Laudo PDF do IFBrM: título usa a classificação final (pós-ponderação) e o texto não usa glifos fora do WinAnsi.
// Execução: node --test tests/ifbrm-pdf.test.cjs (sem dependências, sem rede)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const m = html.match(/function gerarPDF\(mode\)\{[\s\S]*?\n\}\n/);
const pdf = m && m[0];

test('gerarPDF encontrado', () => assert.ok(pdf && pdf.length > 1000));
test('largura útil cw = mr - ml (não zero)', () => {
  assert.match(pdf, /cw=mr-ml;/);
  assert.doesNotMatch(pdf, /cw=W-ml-mr/);
});
test('título e cor usam clsFinal, não cls', () => {
  assert.match(pdf, /clsColors\[clsFinal\.cls\]/);
  assert.match(pdf, /clsFinal\.cls\.toUpperCase\(\)/);
  assert.doesNotMatch(pdf, /clsColors\[cls\.cls\]/);
  assert.doesNotMatch(pdf, /cls\.cls\.toUpperCase\(\)/);
});
test('texto do PDF sem ≤ → ≥ (fora do WinAnsi da fonte helvetica)', () => {
  assert.doesNotMatch(pdf, /[≤≥→←]/);
});
test('fundo do título é tom claro RGB (4º argumento de setFillColor seria CMYK)', () => {
  assert.doesNotMatch(pdf, /setFillColor\(\.\.\.clsColor,\s*\d+\)/);
});
test('pair() mede o rótulo em negrito antes de trocar para a fonte normal', () => {
  const i = pdf.indexOf('function pair');
  const f = pdf.slice(i, pdf.indexOf('function hline'));
  assert.ok(f.indexOf('getTextWidth') < f.indexOf("setFont('helvetica','normal')"));
});
