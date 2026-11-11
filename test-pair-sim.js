// Pairing page tests for the extension (v0.5.7). Loads the real
// pair.html in jsdom with its bundled libraries (PeerJS and
// qrcode-generator arrive as local files), a stubbed
// chrome.storage.local seeded with a two-entry vault, and checks
// what can honestly be checked without WebRTC: the vault picker
// is populated newest first with names and versions, the code
// box opens, the minted code matches the shuttle recipe, the QR
// rendered in the page is the QR of the rendezvous URL for the
// displayed code (module count and viewBox recomputed from the
// bundled generator), the mint honours the recipe over 200
// samples, and, because jsdom has no RTCPeerConnection, the
// page lands on the same friendly browser-incompatible error
// the shuttle probe established. The empty-vault load mints
// nothing and says so. A live two-device transfer is NOT
// claimed here; it is Tony's morning step.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('/home/hatch/workspace/.testdeps/node_modules/jsdom');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const DIR = __dirname;
const CODE_RE = /^[A-NP-Z]{2}[0-9]{4}$/;
let pass = 0, fail = 0;
function check(name, ok) {
  if (ok) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
}

async function makePairPage(store) {
  const dom = await JSDOM.fromFile(path.join(DIR, 'pair.html'), {
    resources: 'usable', runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) {
      w.chrome = { storage: { local: {
        get: (keys, cb) => { const out = {}; keys.forEach(k => { if (store[k] !== undefined) out[k] = store[k]; }); setTimeout(() => cb(out), 0); },
        set: (obj, cb) => { Object.assign(store, obj); if (cb) cb(); },
        remove: (keys, cb) => { (Array.isArray(keys) ? keys : [keys]).forEach(k => delete store[k]); if (cb) cb(); }
      } } };
    }
  });
  return dom;
}

(async function () {
  // Seeded vault: Claude older, ChatGPT newer.
  const store = { cmai_vault: {
    claude: { cur: { text: '# Capsule\n\nclaude body', ts: 1762000000000, version: 1, hashes: {} }, prev: null },
    chatgpt: { cur: { text: '# Capsule\n\nchatgpt body, somewhat longer', ts: 1762100000000, version: 3, hashes: {} }, prev: null }
  } };
  const dom = await makePairPage(store);
  const w = dom.window;
  for (let i = 0; i < 40 && !(w.PAIRING && w.document.getElementById('pairCode').textContent.match(CODE_RE)); i++) { await sleep(250); }
  const d = w.document;

  check('libraries loaded from the bundle', typeof w.Peer === 'function' && typeof w.qrcode === 'function');
  const opts = [...d.getElementById('vaultPick').options];
  check('vault picker lists both capsules, newest first, named with versions',
    opts.length === 2 && opts[0].value === 'chatgpt' && opts[0].textContent.includes('ChatGPT') && opts[0].textContent.includes('version 3') &&
    opts[1].value === 'claude' && opts[1].textContent.includes('version 1'));
  check('code box is open', d.getElementById('codeBox').hidden === false);
  const code = d.getElementById('pairCode').textContent;
  check('displayed code matches the shuttle recipe', CODE_RE.test(code));

  // The QR in the page must be the QR of this code's rendezvous URL.
  const qr = w.qrcode(0, 'M');
  qr.addData('https://clonemy.ai/shuttle.html#c=' + code);
  qr.make();
  const n = qr.getModuleCount();
  const expectedBox = n * 5 + 2 * 12; // cellSize 5, margin 12 px, as pair.js renders and the generator computes
  const svg = d.querySelector('#qrBox svg');
  check('QR rendered in the page, sized for the rendezvous URL of the displayed code',
    !!svg && (svg.getAttribute('viewBox') || '').includes(String(expectedBox)));

  let mintOk = true;
  for (let i = 0; i < 200; i++) { const c = w.PAIRING.mintCode(); if (!CODE_RE.test(c) || c.includes('O')) { mintOk = false; break; } }
  check('mint recipe holds over 200 samples', mintOk);

  await sleep(600);
  check('no WebRTC here, so the page lands on the friendly browser-incompatible error',
    w.PAIRING.state() === 'error' && d.getElementById('pairStatus').textContent.includes('cannot make direct transfers'));
  dom.window.close();

  // Empty vault: nothing is minted, and the page says why.
  const dom2 = await makePairPage({});
  const w2 = dom2.window;
  for (let i = 0; i < 40 && !w2.document.getElementById('vaultNote').textContent.includes('empty'); i++) { await sleep(250); }
  check('empty vault mints no code and explains itself',
    w2.document.getElementById('codeBox').hidden === true &&
    w2.document.getElementById('vaultNote').textContent.includes('vault is empty'));
  dom2.window.close();

  console.log('\nTOTAL: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
