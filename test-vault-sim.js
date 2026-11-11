// Vault and pair-sync tests for the extension (v0.4.x, spec
// section 7 slice 2). Same jsdom harness as test-page-sim.js,
// but several "tabs" share one storage object, like tabs in one
// browser profile, so the test can walk the whole sync story:
// compile on ChatGPT (vault version 1), recompile with one
// section changed (version 2, the change named, previous text
// retained), recompile unchanged (no new version), then open
// Claude with the pending copy expired and a delivered record
// at version 1: the bar must offer the update from the VAULT,
// name the changed section, install on press, and record the
// delivery. Also guards the v0.4.2 hash fix: text outside the
// 11 numbered sections never moves a section hash.
const fs = require('fs');
const { JSDOM } = require('/home/hatch/workspace/.testdeps/node_modules/jsdom');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function makePage(url, store) {
  const dom = new JSDOM('<!DOCTYPE html><body><main><div id="thread"></div></main><form><textarea id="prompt-textarea"></textarea></form></body>',
    { url, runScripts: 'dangerously', pretendToBeVisual: true });
  const w = dom.window;
  w.chrome = { storage: { local: {
    get: (keys, cb) => { const out = {}; keys.forEach(k => { if (store[k] !== undefined) out[k] = store[k]; }); setTimeout(() => cb(out), 0); },
    set: (obj, cb) => { Object.assign(store, obj); if (cb) cb(); },
    remove: (keys, cb) => { (Array.isArray(keys) ? keys : [keys]).forEach(k => delete store[k]); if (cb) cb(); }
  } } };
  let downloaded = null;
  w.URL.createObjectURL = function (blob) { downloaded = blob; return 'blob:test'; };
  w.URL.revokeObjectURL = function () {};
  w.document.execCommand = function () { return true; };
  const inject = src => { const s = w.document.createElement('script'); s.textContent = src; w.document.body.appendChild(s); };
  inject(fs.readFileSync('compiler.js', 'utf8'));
  inject(fs.readFileSync('extract-doc.js', 'utf8'));
  inject(fs.readFileSync('content.js', 'utf8'));
  return { w, doc: w.document, get downloaded() { return downloaded; } };
}

function reportWith(peopleLine) {
  return ['## 1. Who you are to this user', 'Name: Mabel', 'She is playful, cheeky, full of banter.', '',
    '## 2. The user', 'Tony, in Folsom.', '',
    '## 3. Preferences', 'Direct answers first.', '',
    '## 4. Operating rules', 'Ask first, always.', '',
    '## 5. People', peopleLine, '',
    '## 6. Projects and open loops', 'A capsule product.', '',
    '## 7. Calibration history', 'Corrected twice on tone.', '',
    '## 8. Your voice with this user', 'Warm and brief.'].join('\n');
}

function addReport(doc, text) {
  const msg = doc.createElement('div');
  msg.setAttribute('data-message-author-role', 'assistant');
  const pre = doc.createElement('pre');
  pre.textContent = text;
  msg.appendChild(pre);
  doc.getElementById('thread').appendChild(msg);
}

(async () => {
  let ok = true;
  const check = (label, cond) => { console.log((cond ? 'PASS ' : 'FAIL ') + label); ok = ok && !!cond; };
  const store = {};

  // ---- Source tab: ChatGPT ------------------------------------
  const src = makePage('https://chatgpt.com/', store);
  await sleep(300);
  addReport(src.doc, reportWith('Amy, his wife.'));
  await sleep(3500);
  check('compile lights up on the source tab', src.doc.getElementById('cmai-compile').disabled === false);
  src.doc.getElementById('cmai-compile').click();
  await sleep(600);
  const v1 = store.cmai_vault && store.cmai_vault.chatgpt;
  check('vault holds the chatgpt entry after first compile', !!v1);
  check('first compile is version 1 with no previous retained', !!v1 && v1.cur.version === 1 && v1.prev === null);
  check('vault entry carries 12 section hashes', !!v1 && Object.keys(v1.cur.hashes).length === 12);
  check('pending delivery carries version 1', !!store.cmai_pending && store.cmai_pending.version === 1);
  const v1Hashes = JSON.parse(JSON.stringify(v1.cur.hashes));
  const v1Text = v1.cur.text;

  addReport(src.doc, reportWith('Amy, his wife. Also Mark.'));
  await sleep(3500);
  src.doc.getElementById('cmai-compile').click();
  await sleep(600);
  const v2 = store.cmai_vault.chatgpt;
  check('changed recompile bumps the version to 2', v2.cur.version === 2);
  check('previous version text retained one deep', !!v2.prev && v2.prev.version === 1 && v2.prev.text === v1Text);
  const status2 = src.doc.getElementById('cmai-status').textContent;
  check('change is surfaced by section name', /version 2: 1 section changed \(People\)/.test(status2));
  check('pending delivery carries version 2', store.cmai_pending.version === 2);

  src.doc.getElementById('cmai-compile').click();
  await sleep(600);
  check('unchanged recompile keeps version 2', store.cmai_vault.chatgpt.cur.version === 2);
  check('unchanged recompile says so', /No changes from your saved ChatGPT capsule/.test(src.doc.getElementById('cmai-status').textContent));

  // ---- Hash hygiene (the v0.4.2 fix) ---------------------------
  const capsuleText = await src.downloaded.text();
  const hBase = src.w.sectionHashes(capsuleText);
  const tamperedTail = capsuleText.replace('Flavor of this capsule: Playful', 'Flavor of this capsule: Formal');
  check('tail tamper actually changed the text', tamperedTail !== capsuleText);
  check('flavor-only change in the human block moves no section hash',
    src.w.changedSectionNames(hBase, src.w.sectionHashes(tamperedTail)).length === 0);
  const tamperedPeople = capsuleText.replace('Also Mark.', 'Also Marcus.');
  check('a People edit names exactly People',
    JSON.stringify(src.w.changedSectionNames(hBase, src.w.sectionHashes(tamperedPeople))) === JSON.stringify(['People']));

  // Forget control on the source bar.
  check('source bar offers the Forget control', !!src.doc.getElementById('cmai-forget'));

  // ---- Target tab: Claude, pending expired, delivered v1 -----
  store.cmai_delivered = { claude: { chatgpt: { version: 1, ts: Date.now() - 86400000, hashes: v1Hashes } } };
  delete store.cmai_pending;
  const tgt = makePage('https://claude.ai/', store);
  await sleep(700);
  const rowText = tgt.doc.getElementById('cmai-deliver').textContent;
  check('vault update is offered without a pending copy', /Update available/.test(rowText));
  check('offer names the changed section', /People/.test(rowText));
  check('vault offer dismisses with Not now, not Discard', !!tgt.doc.getElementById('cmai-notnow') && !tgt.doc.getElementById('cmai-discard'));
  tgt.doc.getElementById('cmai-install').click();
  await sleep(400);
  check('install fills the composer with the vault text', tgt.doc.getElementById('prompt-textarea').value === v2.cur.text);
  check('delivery recorded at version 2', !!store.cmai_delivered.claude.chatgpt && store.cmai_delivered.claude.chatgpt.version === 2);

  // A fresh Claude tab now has nothing to offer.
  const tgt2 = makePage('https://claude.ai/', store);
  await sleep(700);
  check('no update offered once current', !/Update available/.test(tgt2.doc.getElementById('cmai-deliver').textContent));

  // ---- Offer precedence by recency (v0.4.3) -------------------
  // Two sources are both newer than what a target last received.
  // The bar must offer the NEWEST source (latest compile time);
  // the older source stays folded: retained in its vault entry,
  // not offered, not even on a later visit.
  const T_OLD = Date.now() - 7200000, T_NEW = Date.now() - 3600000;
  store.cmai_vault = {
    chatgpt: { cur: { text: 'CHATGPT CAPSULE v3 TEXT', found: 11, flavor: 'Formal', ts: T_OLD, version: 3, hashes: {} }, prev: null },
    claude: { cur: { text: 'CLAUDE CAPSULE v2 TEXT', found: 11, flavor: 'Formal', ts: T_NEW, version: 2, hashes: {} }, prev: null }
  };
  store.cmai_delivered = { gemini: {
    chatgpt: { version: 1, ts: T_OLD - 1000, hashes: {} },
    claude: { version: 1, ts: T_OLD - 1000, hashes: {} }
  } };
  delete store.cmai_pending;
  const prec = makePage('https://gemini.google.com/', store);
  await sleep(700);
  const precText = prec.doc.getElementById('cmai-deliver').textContent;
  check('precedence: an update is offered when two sources are stale', /Update available/.test(precText));
  check('precedence: the newest source (Claude) is the one offered', /Claude/.test(precText) && !/ChatGPT/.test(precText));
  prec.doc.getElementById('cmai-install').click();
  await sleep(400);
  check('precedence: install fills the composer with the newest source text',
    prec.doc.getElementById('prompt-textarea').value === 'CLAUDE CAPSULE v2 TEXT');
  check('precedence: delivery recorded for the newest source', store.cmai_delivered.gemini.claude.version === 2);
  check('precedence: older source capsule retained in its vault entry',
    !!store.cmai_vault.chatgpt && store.cmai_vault.chatgpt.cur.text === 'CHATGPT CAPSULE v3 TEXT' && store.cmai_vault.chatgpt.cur.version === 3);
  const prec2 = makePage('https://gemini.google.com/', store);
  await sleep(700);
  check('precedence: the folded older source is not offered on a later visit',
    !/Update available/.test(prec2.doc.getElementById('cmai-deliver').textContent));

  console.log(ok ? 'ALL VAULT SIM TESTS PASS' : 'SOME TESTS FAILED');
  process.exit(ok ? 0 : 1);
})();
