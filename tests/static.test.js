import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { categories } from '../public/data/categories.js';
import { schemes } from '../public/data/schemes.js';
import { words, suggestions } from '../public/i18n.js';
import { getReply, hasPrivateNumber, searchSchemes, setContextScheme } from '../public/assistant.js';

const newContext = () => ({ schemeId: '', options: [] });
const root = new URL('../', import.meta.url);

test('release is a static, dependency-free site', () => {
  const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
  const deploy = JSON.parse(readFileSync(new URL('vercel.json', root), 'utf8'));
  const contents = readdirSync(root);
  assert.equal(deploy.outputDirectory, 'public');
  assert.equal(deploy.buildCommand, '');
  assert.equal(deploy.installCommand, '');
  assert.ok(!deploy.functions && !deploy.rewrites);
  assert.ok(!manifest.dependencies);
  for (const removed of ['api', 'server', 'scripts', '.env', '.env.example']) {
    assert.ok(!contents.includes(removed), removed);
  }
  const files = readdirSync(new URL('public/', root), { recursive: true }).filter(name => /\.(html|js|css)$/u.test(name));
  for (const file of files) {
    const source = readFileSync(new URL('public/' + file.replaceAll('\\', '/'), root), 'utf8');
    assert.doesNotMatch(source, /\bfetch\s*\(|\/api\/|mongodb|smtp|resend|api[_-]key/iu, file);
    const references = source.matchAll(/(?:from |href=|src=)['"](\.\/[^'"#]+)['"]/gu);
    for (const [, specifier] of references) {
      assert.ok(readFileSync(new URL(specifier, new URL('public/' + file.replaceAll('\\', '/'), root))).length);
    }
  }
});

test('27 unique schemes carry all bilingual fields, coverage and secure source URLs', () => {
  assert.equal(schemes.length, 27);
  assert.equal(new Set(schemes.map(scheme => scheme.id)).size, schemes.length);
  assert.equal(schemes.filter(scheme => scheme.location.en === 'Andhra Pradesh').length, 7);
  assert.deepEqual(Object.keys(words.en).sort(), Object.keys(words.te).sort());
  const ids = new Set(categories.map(category => category.id));
  for (const scheme of schemes) {
    assert.ok(scheme.categories.every(id => ids.has(id)), scheme.id);
    assert.ok(scheme.aliases.length, scheme.id);
    for (const key of ['name', 'overview', 'department', 'location']) {
      assert.ok(scheme[key].en.trim());
      assert.match(scheme[key].te, /[\u0c00-\u0c7f]/u);
    }
    for (const key of ['benefits', 'eligibility', 'documents', 'steps']) {
      assert.equal(scheme[key].en.length, scheme[key].te.length, scheme.id + ' ' + key);
      assert.ok(scheme[key].en.every(item => item.trim()));
      assert.ok(scheme[key].te.every(item => /[\u0c00-\u0c7f]/u.test(item)));
    }
    assert.match(scheme.verifiedAt, /^\d{4}-\d{2}-\d{2}$/u);
    assert.ok(scheme.references.includes(scheme.information));
    assert.equal(Boolean(scheme.application), scheme.access !== 'office');
    if (scheme.application) assert.ok(scheme.references.includes(scheme.application));
    for (const url of scheme.references) {
      const parsed = new URL(url);
      assert.equal(parsed.protocol, 'https:');
      assert.ok(!parsed.username && !parsed.password);
      assert.match(parsed.hostname, /(?:\.gov\.in|\.nic\.in|\.co\.in)$/u);
    }
  }
});

test('all ten English and Telugu suggestions match catalogue data', () => {
  for (const suggestion of suggestions) {
    for (const question of Object.values(suggestion)) {
      assert.ok(getReply(question, newContext()).ids.length, question);
    }
  }
});

test('English and Telugu intent matching, typo recovery and cross-language follow-up', () => {
  const context = newContext();
  const answer = getReply('How can I apply for PM-KISAN?', context);
  assert.deepEqual(answer, { type: 'detail', ids: ['pm-kisan'], sections: ['steps'] });
  assert.deepEqual(getReply('దీనికి ఏ పత్రాలు కావాలి?', context), { type: 'detail', ids: ['pm-kisan'], sections: ['documents'] });
  assert.deepEqual(getReply('అర్హతలు ఏమిటి?', context).sections, ['eligibility']);
  assert.deepEqual(getReply('how much for pm kissan', context).sections, ['benefits']);
  assert.deepEqual(getReply('vishwkarma benefits', newContext()).ids, ['vishwakarma']);
  assert.deepEqual(getReply('What is the deadline?', context).sections, ['timing']);
  assert.deepEqual(getReply('application status', context).sections, ['tracking']);
  assert.equal(getReply('Documents for an unlisted programme', context).type, 'noMatch');
});

test('ambiguity, category context and region search', () => {
  const context = newContext();
  assert.deepEqual(getReply('How do I apply for PMAY?', context).ids, ['pmay-g', 'pmay-u']);
  assert.equal(getReply('what documents?', context).type, 'clarify');
  setContextScheme(context, 'pmay-u');
  assert.deepEqual(getReply('దీని అర్హతలు ఏంటి?', context).ids, ['pmay-u']);
  const result = getReply('Show me schemes for Andhra Pradesh farmers', newContext());
  assert.deepEqual(result.ids, ['annadata']);
  assert.equal(getReply('random unrecognised text', newContext()).type, 'noMatch');
  assert.equal(searchSchemes('', '', 'andhra').length, 7);
  assert.deepEqual(searchSchemes('పీఎం కిసాన్', 'farmers', 'central').map(scheme => scheme.id), ['pm-kisan']);
  assert.ok(searchSchemes('', 'health').every(scheme => scheme.categories.includes('health')));
});

test('blocks suspected government IDs, bank details and OTPs before chat display', () => {
  for (const value of ['1234 5678 9012', 'OTP: 1234', 'నా ఓటీపీ ౧౨౩౪', '1234567890123456']) assert.ok(hasPrivateNumber(value));
  for (const value of ['What Aadhaar documents are needed?', 'PMAY 2.0', 'I am 70 years old', '181']) assert.ok(!hasPrivateNumber(value));
});
