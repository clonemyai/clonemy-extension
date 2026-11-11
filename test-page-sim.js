// Local simulation test for the extension, run with node.
// It builds a fake ChatGPT-like page in jsdom, loads the real
// compiler.js and content.js into it with a stub chrome.storage,
// then walks the whole flow: bar appears, button 1 fills the box,
// a self-report "arrives", button 2 lights up, compile downloads
// a capsule. The downloaded text is captured and checked.
const fs = require('fs');
const { JSDOM } = require('/home/hatch/workspace/.testdeps/node_modules/jsdom');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let ok = true;
  const check = (label, cond) => { console.log((cond ? 'PASS ' : 'FAIL ') + label); ok = ok && !!cond; };
  const dom = new JSDOM('<!DOCTYPE html><body><main><div id="thread"></div></main><form><textarea id="prompt-textarea"></textarea></form></body>',
    { url: 'https://chatgpt.com/', runScripts: 'dangerously', pretendToBeVisual: true });
  const w = dom.window;
  // chrome.storage stub, in memory
  const store = {};
  w.chrome = { storage: { local: {
    get: (keys, cb) => { const out = {}; keys.forEach(k => { if (store[k] !== undefined) out[k] = store[k]; }); setTimeout(() => cb(out), 0); },
    set: (obj, cb) => { Object.assign(store, obj); if (cb) cb(); },
    remove: (keys, cb) => { keys.forEach(k => delete store[k]); if (cb) cb(); }
  } } };
  let downloaded = null;
  w.URL.createObjectURL = function (blob) { downloaded = blob; return 'blob:test'; };
  w.URL.revokeObjectURL = function () {};
  w.document.execCommand = function () { return true; };

  const inject = src => { const s = w.document.createElement('script'); s.textContent = src; w.document.body.appendChild(s); };
  inject(fs.readFileSync('compiler.js', 'utf8'));
  inject(fs.readFileSync('extract-doc.js', 'utf8'));
  inject(fs.readFileSync('content.js', 'utf8'));
  await sleep(300);

  const doc = w.document;
  check('bar appears on the page', !!doc.getElementById('clonemy-bar'));
  check('visit tallied for chatgpt', !!(store.cmai_tally && store.cmai_tally.chatgpt && store.cmai_tally.chatgpt.sessions === 1));

  doc.getElementById('cmai-fill').click();
  await sleep(100);
  check('button 1 fills the composer with the prompt', doc.getElementById('prompt-textarea').value.includes('https://clonemy.ai/extract'));
  check('compile starts disabled', doc.getElementById('cmai-compile').disabled === true);

  // The v0.1.10 payload: the short request, the either/or fallback
  // marker, then the full extraction document inline.
  const filled = doc.getElementById('prompt-textarea').value;
  const HEADINGS = ['### 0. Meta', '### 1. Who you are to this user', '### 2. The user', '### 3. Preferences', '### 4. Operating rules', '### 5. People', '### 6. Projects and open loops', '### 7. Calibration history', '### 8. Your voice with this user', '### 9. Boundaries and sealed material', '### 10. Unknowns', '### 11. Voice'];
  check('payload order: request, then fallback marker, then document',
    filled.indexOf('https://clonemy.ai/extract') !== -1 &&
    filled.indexOf('https://clonemy.ai/extract') < filled.indexOf('ignore the pasted copy below entirely') &&
    filled.indexOf('ignore the pasted copy below entirely') < filled.indexOf('# Instructions for MY ai'));
  check('payload either/or: page wins when it opens', filled.includes('ignore the pasted copy below entirely'));
  check('payload either/or: pasted copy wins when it does not', filled.includes('follow the pasted copy below instead'));
  check('payload either/or: exactly one self-report', filled.includes('produce exactly one self-report'));
  check('payload carries the AI instructions from their marker', filled.includes('# Instructions for MY ai'));
  check('payload omits the human header and how-to', !filled.includes('# Send this file to your current AI') && !filled.includes('How to use (for you, the human)'));
  check('payload carries all 12 section headings', HEADINGS.every(h => filled.includes(h)));
  check('payload carries the document closing line', filled.includes('This section protects both of us from your guesses, so be thorough.'));

  const report = ['## 1. Who you are to this user', 'Name: Mabel', 'She is playful, cheeky, full of banter.', '',
    '## 2. The user', 'Tony, in Folsom.', '',
    '## 3. Preferences', 'Direct answers first.', '',
    '## 4. Operating rules', 'Ask first, always.', '',
    '## 5. People', 'Amy, his wife.', '',
    '## 6. Projects and open loops', 'A capsule product.', '',
    '## 7. Calibration history', 'Corrected twice on tone.', '',
    '## 8. Your voice with this user', 'Warm and brief.'].join('\n');
  const msg = doc.createElement('div');
  msg.setAttribute('data-message-author-role', 'assistant');
  const pre = doc.createElement('pre');
  pre.textContent = report;
  msg.appendChild(pre);
  doc.getElementById('thread').appendChild(msg);
  await sleep(3200); // debounce + one stability cycle
  check('compile lights up after the report settles', doc.getElementById('cmai-compile').disabled === false);
  check('status reports the section count', /Self-report found, [6-9] of 12/.test(doc.getElementById('cmai-status').textContent));

  doc.getElementById('cmai-compile').click();
  await sleep(300);
  check('capsule download produced', !!downloaded);
  const text = downloaded && typeof downloaded.text === 'function' ? await downloaded.text() : String(downloaded || '');
  check('capsule leads with the capsule itself', text.startsWith('# Your capsule'));
  check('capsule has no READ THIS FIRST header', !text.includes('# READ THIS FIRST'));
  check('human block sits at the end, after the self-check', text.indexOf('# READ THIS LAST') > text.indexOf('## Parity self-check'));
  check('capsule carries the install line in the human block', text.includes('Read the capsule file I am sending with this message'));
  check('capsule has the capsule body', text.includes('# Your capsule'));
  check('capsule carries the flavor block', text.includes('## Capsule flavor'));
  check('capsule detects Mabel, Playful', text.includes('Mabel') && text.includes('Flavor: Playful'));
  check('missing sections are named', text.includes('Not present in the source document.'));
  // ---------------------------------------------------------------
  // Scenario 2 (v0.5.9): the collapsed hint is a second face of the
  // status line. After Step 1 and Send, the shrunk bar must stop
  // saying "press Send" and say it is waiting, with the section
  // count as the answer grows, then ready when the report settles.
  // ---------------------------------------------------------------
  const makeHintPage = (seed) => {
    const d2 = new JSDOM('<!DOCTYPE html><body><main><div id="thread"></div></main><form><textarea id="prompt-textarea"></textarea></form></body>',
      { url: 'https://chatgpt.com/', runScripts: 'dangerously', pretendToBeVisual: true });
    const w2 = d2.window;
    const store2 = Object.assign({}, seed || {});
    w2.chrome = { storage: { local: {
      get: (keys, cb) => { const out = {}; keys.forEach(k => { if (store2[k] !== undefined) out[k] = store2[k]; }); setTimeout(() => cb(out), 0); },
      set: (obj, cb) => { Object.assign(store2, obj); if (cb) cb(); },
      remove: (keys, cb) => { keys.forEach(k => delete store2[k]); if (cb) cb(); }
    } } };
    w2.URL.createObjectURL = function () { return 'blob:test'; };
    w2.URL.revokeObjectURL = function () {};
    w2.document.execCommand = function () { return true; };
    const inject2 = src => { const s = w2.document.createElement('script'); s.textContent = src; w2.document.body.appendChild(s); };
    inject2(fs.readFileSync('compiler.js', 'utf8'));
    inject2(fs.readFileSync('extract-doc.js', 'utf8'));
    inject2(fs.readFileSync('content.js', 'utf8'));
    return w2;
  };
  const hintOf = d => d.getElementById('cmai-hint');
  const PRESS_SEND = 'Click send when ready.';

  {
    const w2 = makeHintPage();
    const d = w2.document;
    await sleep(300);
    d.getElementById('cmai-fill').click();
    await sleep(150);
    check('hint: fill collapses with the press-Send hint', hintOf(d).style.display === 'block' && hintOf(d).textContent === PRESS_SEND);
    d.getElementById('cmai-collapse').click();
    check('hint: expanding hides the hint face', hintOf(d).style.display === 'none');
    d.getElementById('cmai-collapse').click();
    check('hint: re-collapsing shows the current face', hintOf(d).textContent === PRESS_SEND && hintOf(d).style.display === 'block');

    // The user presses Send: the host clears the box.
    d.getElementById('prompt-textarea').value = '';
    await sleep(3600);
    check('hint: after Send it says waiting, no count yet', hintOf(d).textContent === 'Waiting for the answer...');

    // The just-sent message carries the template; it is what the
    // watcher can see until the answer itself starts arriving.
    const TITLES2 = ['About this report', 'Who you are to this user', 'The user', 'Preferences', 'Operating rules', 'People', 'Projects and open loops', 'Calibration history', 'Your voice with this user', 'Boundaries and sealed material', 'Unknowns'];
    const card = d.createElement('div');
    card.className = 'prose';
    card.textContent = ['This page is the clonemy.ai extraction request in plain text, so an AI can fetch and follow it directly.', 'Send this file to your current AI', 'How to use (for you, the human):',
      ...TITLES2.map((t, i) => '### ' + i + '. ' + t + '\nGuidance paragraph for section ' + i + ' that the template ships with.')].join('\n');
    Object.defineProperty(card, 'innerText', { get() { return this.textContent; } });
    d.getElementById('thread').appendChild(card);
    await sleep(2400);
    check('hint: template only, short form', hintOf(d).textContent === 'That is the instructions text, not the report.');

    // A partial answer starts arriving underneath the template.
    const partial = n => ['## 1. Who you are to this user', 'Name: Mabel, a playful presence in this chat.', '',
      '## 2. The user', 'Tony, in Folsom, direct and brief by preference.', '',
      '## 3. Preferences', 'Answers first, detail after, no filler at all.', '',
      '## 4. Operating rules', 'Ask first before anything that spends money.', '',
      '## 5. People', 'Amy, his wife, and David, his brother.'].slice(0, n * 3).join('\n');
    const pre = d.createElement('pre');
    pre.textContent = partial(3);
    d.getElementById('thread').appendChild(pre);
    await sleep(2400);
    check('hint: waiting with a live count of 3', hintOf(d).textContent === 'Waiting for the answer: 3 of 12 sections so far.');
    check('hint: expanded face agrees while counting', /Analyzing the answer as it arrives: 3 of 12/.test(d.getElementById('cmai-status').textContent));
    pre.textContent = partial(5);
    await sleep(2400);
    check('hint: the count grows to 5', hintOf(d).textContent === 'Waiting for the answer: 5 of 12 sections so far.');

    // New chat: everything vanishes. The waiting state must not stick.
    d.getElementById('thread').innerHTML = '';
    await sleep(6500);
    check('hint: new chat clears the waiting face', hintOf(d).style.display === 'none' && hintOf(d).textContent === '');
    check('hint: expanded face back to the opening line', d.getElementById('cmai-status').textContent === 'The request goes in the box. You press send, always.');

    // Step 1 again, Send again, and this time the report lands.
    d.getElementById('cmai-fill').click();
    await sleep(150);
    check('hint: Step 1 again restores press-Send', hintOf(d).textContent === PRESS_SEND);
    d.getElementById('prompt-textarea').value = '';
    const full = d.createElement('pre');
    full.textContent = ['## 1. Who you are to this user', 'Name: Mabel', 'She is playful, cheeky, full of banter.', '',
      '## 2. The user', 'Tony, in Folsom.', '',
      '## 3. Preferences', 'Direct answers first.', '',
      '## 4. Operating rules', 'Ask first, always.', '',
      '## 5. People', 'Amy, his wife.', '',
      '## 6. Projects and open loops', 'A capsule product.', '',
      '## 7. Calibration history', 'Corrected twice on tone.', '',
      '## 8. Your voice with this user', 'Warm and brief.'].join('\n');
    d.getElementById('thread').appendChild(full);
    await sleep(5500);
    // v0.5.10 composition: at the ready moment the collapsed bar
    // unfolds itself, so the ready face is the expanded one. The
    // ready hint is state underneath: fold by hand and it reads
    // exactly what v0.5.9 put there.
    check('ready: the bar unfolds itself when compile lights', d.getElementById('cmai-body').style.display !== 'none');
    check('ready: status carries the found line', /Self-report found, [6-9] of 12 sections\. Press Compile\./.test(d.getElementById('cmai-status').textContent));
    check('hint: compile is lit at ready', d.getElementById('cmai-compile').disabled === false);
    d.getElementById('cmai-collapse').click();
    check('hint: settled report switches to ready', hintOf(d).textContent === 'Self-report found: press Compile.');
    // The user's fold is respected: the answer growing and
    // settling again must not unfold the bar a second time.
    full.textContent += '\nOne more detail line at the end.';
    await sleep(5000);
    check('ready: a user fold after auto-expand is respected', d.getElementById('cmai-body').style.display === 'none');
  }

  // ---------------------------------------------------------------
  // Scenario 4 (v0.5.14): a Gemini-shaped page, where the host
  // renders the composer inside the same <main> the watcher
  // reads. The fill itself then scores as the template while it
  // is still sitting in the box, unsent. Tony caught the folded
  // face reading "That is the instructions text, not the
  // report." at exactly this stage (live, 2026-11-09): until the
  // box clears, both faces keep the press-Send guidance.
  // ---------------------------------------------------------------
  {
    const w4 = makeHintPage();
    const d = w4.document;
    await sleep(300);
    d.getElementById('cmai-fill').click();
    await sleep(150);
    check('gemini-shape: fill face asks for the send', hintOf(d).textContent === PRESS_SEND);
    // The host echoes the composer inside main: the watcher now
    // sees the template on the page, from the box itself.
    const echo = d.createElement('div');
    echo.textContent = d.getElementById('prompt-textarea').value;
    Object.defineProperty(echo, 'innerText', { get() { return this.textContent; } });
    d.querySelector('main').appendChild(echo);
    await sleep(3600);
    check('gemini-shape: unsent fill is not the template face', hintOf(d).textContent === PRESS_SEND);
    check('gemini-shape: unsent fill keeps the fill status', /Press send, then wait/.test(d.getElementById('cmai-status').textContent));
    // The user presses Send: the host clears the box, and the
    // same text is now the just-sent message in the thread. The
    // template face is correct from here.
    d.getElementById('prompt-textarea').value = '';
    await sleep(3600);
    check('gemini-shape: sent template gets the template face', hintOf(d).textContent === 'That is the instructions text, not the report.');
  }

  // ---------------------------------------------------------------
  // Scenario 3 (v0.5.9): the deliver flow's collapsed hint is not
  // the watcher's to touch. It stays exactly as it was.
  // ---------------------------------------------------------------
  {
    const pending = { text: '# Your capsule\n\nA capsule carried over from Claude.', found: 11, flavor: 'Playful', ts: Date.now(), from: 'claude', fromName: 'Claude', version: 1, hashes: {} };
    const w3 = makeHintPage({ cmai_pending: pending });
    const d = w3.document;
    await sleep(500);
    check('deliver: install offered for the pending capsule', !!d.getElementById('cmai-install'));
    d.getElementById('cmai-install').click();
    await sleep(200);
    check('deliver: capsule lands in the box', d.getElementById('prompt-textarea').value.indexOf('# Your capsule') === 0);
    check('deliver: hint is the capsule-in-box line, word for word', hintOf(d).textContent === 'Capsule is in the box: press Send in the chat.' && hintOf(d).style.display === 'block');
    await sleep(3600);
    check('deliver: hint unchanged after a watcher cycle', hintOf(d).textContent === 'Capsule is in the box: press Send in the chat.');
  }

  // ---------------------------------------------------------------
  // Scenario 4 (v0.5.10): auto-expand on ready, as its own case.
  // A collapsed bar unfolds itself once when Compile lights; an
  // expanded bar is untouched. (Scenario 2 proves the same
  // transition inside the full Step 1 flow, including that a
  // user fold afterwards is respected.)
  // ---------------------------------------------------------------
  {
    const REPORT4 = ['## 1. Who you are to this user', 'Name: Mabel', 'She is playful, cheeky, full of banter.', '',
      '## 2. The user', 'Tony, in Folsom.', '',
      '## 3. Preferences', 'Direct answers first.', '',
      '## 4. Operating rules', 'Ask first, always.', '',
      '## 5. People', 'Amy, his wife.', '',
      '## 6. Projects and open loops', 'A capsule product.', '',
      '## 7. Calibration history', 'Corrected twice on tone.', '',
      '## 8. Your voice with this user', 'Warm and brief.'].join('\n');
    const w4 = makeHintPage();
    const d = w4.document;
    await sleep(300);
    d.getElementById('cmai-collapse').click();
    check('expand: bar folded by hand', d.getElementById('cmai-body').style.display === 'none');
    const pre4 = d.createElement('pre');
    pre4.textContent = REPORT4;
    d.getElementById('thread').appendChild(pre4);
    await sleep(5600);
    check('expand: compile lights when the report settles', d.getElementById('cmai-compile').disabled === false);
    check('expand: the bar unfolds itself at ready', d.getElementById('cmai-body').style.display !== 'none');
  }
  {
    const w5 = makeHintPage();
    const d = w5.document;
    await sleep(300);
    // Untouched, the body carries no inline display: expanded is
    // the absence of "none", here and in the browser.
    check('expand: a fresh bar starts expanded', d.getElementById('cmai-body').style.display !== 'none');
    const pre5 = d.createElement('pre');
    pre5.textContent = ['## 1. Who you are to this user', 'Name: Mabel', 'She is playful, cheeky, full of banter.', '',
      '## 2. The user', 'Tony, in Folsom.', '',
      '## 3. Preferences', 'Direct answers first.', '',
      '## 4. Operating rules', 'Ask first, always.', '',
      '## 5. People', 'Amy, his wife.', '',
      '## 6. Projects and open loops', 'A capsule product.', '',
      '## 7. Calibration history', 'Corrected twice on tone.', '',
      '## 8. Your voice with this user', 'Warm and brief.'].join('\n');
    d.getElementById('thread').appendChild(pre5);
    await sleep(5600);
    check('expand: an expanded bar is unaffected', d.getElementById('cmai-compile').disabled === false && d.getElementById('cmai-body').style.display !== 'none');
  }

  // ---------------------------------------------------------------
  // Scenario 5 (v0.5.15): door consolidation. The deliver row
  // shows ONE primary door plus a "More destinations" dropdown.
  // The primary is the last door used (per source host, then
  // global), never the host the capsule was compiled on; with no
  // history it is Claude, or ChatGPT from Claude itself.
  // ---------------------------------------------------------------
  const makeDoorPage = (url, seed) => {
    const dD = new JSDOM('<!DOCTYPE html><body><main><div id="thread"></div></main><form><textarea id="prompt-textarea"></textarea></form></body>',
      { url: url, runScripts: 'dangerously', pretendToBeVisual: true });
    const wD = dD.window;
    const storeD = Object.assign({}, seed || {});
    wD.chrome = { storage: { local: {
      get: (keys, cb) => { const out = {}; keys.forEach(k => { if (storeD[k] !== undefined) out[k] = storeD[k]; }); setTimeout(() => cb(out), 0); },
      set: (obj, cb) => { Object.assign(storeD, obj); if (cb) cb(); },
      remove: (keys, cb) => { keys.forEach(k => delete storeD[k]); if (cb) cb(); }
    } } };
    wD.URL.createObjectURL = function () { return 'blob:test'; };
    wD.URL.revokeObjectURL = function () {};
    wD.document.execCommand = function () { return true; };
    const injectD = src => { const s = wD.document.createElement('script'); s.textContent = src; wD.document.body.appendChild(s); };
    injectD(fs.readFileSync('compiler.js', 'utf8'));
    injectD(fs.readFileSync('extract-doc.js', 'utf8'));
    injectD(fs.readFileSync('content.js', 'utf8'));
    return { w: wD, store: storeD };
  };
  const REPORT_DOORS = ['## 1. Who you are to this user', 'Name: Mabel', 'She is playful, cheeky, full of banter.', '',
    '## 2. The user', 'Tony, in Folsom.', '',
    '## 3. Preferences', 'Direct answers first.', '',
    '## 4. Operating rules', 'Ask first, always.', '',
    '## 5. People', 'Amy, his wife.', '',
    '## 6. Projects and open loops', 'A capsule product.', '',
    '## 7. Calibration history', 'Corrected twice on tone.', '',
    '## 8. Your voice with this user', 'Warm and brief.'].join('\n');
  const compileForDoors = async (w) => {
    const d = w.document;
    await sleep(300);
    const pre = d.createElement('pre');
    pre.textContent = REPORT_DOORS;
    d.getElementById('thread').appendChild(pre);
    await sleep(5600);
    d.getElementById('cmai-compile').click();
    await sleep(500);
    return d;
  };
  const doorsOf = d => {
    const rowEl = d.getElementById('cmai-deliver');
    const more = rowEl.querySelector('.cmai-more');
    const all = Array.from(rowEl.querySelectorAll('a[data-cmai-dest]'));
    const primary = all.filter(a => !more || !more.contains(a));
    return { rowEl, more, all, primary };
  };
  {
    const { w, store } = makeDoorPage('https://gemini.google.com/', null);
    const d = await compileForDoors(w);
    const dr = doorsOf(d);
    check('doors: exactly one primary door without history', dr.primary.length === 1);
    check('doors: starter primary on Gemini is Claude', dr.primary.length === 1 && dr.primary[0].getAttribute('data-cmai-dest') === 'Claude');
    check('doors: the rest wait behind the dropdown', !!dr.more && dr.more.style.display === 'none' && dr.all.length === 7);
    check('doors: the source host stays in the dropdown', !!dr.more && Array.from(dr.more.querySelectorAll('a[data-cmai-dest]')).some(a => a.getAttribute('data-cmai-dest') === 'Gemini'));
    d.querySelector('.cmai-more-btn').click();
    check('doors: the dropdown opens on tap', dr.more.style.display === 'block');
    const grok = Array.from(dr.more.querySelectorAll('a[data-cmai-dest]')).find(a => a.getAttribute('data-cmai-dest') === 'Grok');
    try { grok.click(); } catch (e) {}
    await sleep(100);
    check('doors: taking a door records it as last used', !!(store.cmai_lastdoor && store.cmai_lastdoor.byHost && store.cmai_lastdoor.byHost.gemini === 'Grok' && store.cmai_lastdoor.any === 'Grok'));
  }
  {
    const { w } = makeDoorPage('https://gemini.google.com/', { cmai_lastdoor: { byHost: { gemini: 'Grok' }, any: 'Grok' } });
    const d = await compileForDoors(w);
    const dr = doorsOf(d);
    check('doors: last used door becomes the primary', dr.primary.length === 1 && dr.primary[0].getAttribute('data-cmai-dest') === 'Grok');
  }
  {
    const { w } = makeDoorPage('https://claude.ai/', { cmai_lastdoor: { byHost: {}, any: 'Claude' } });
    const d = await compileForDoors(w);
    const dr = doorsOf(d);
    check('doors: never default to the source host', dr.primary.length === 1 && dr.primary[0].getAttribute('data-cmai-dest') === 'ChatGPT');
    check('doors: the source host is still one tap away', !!dr.more && Array.from(dr.more.querySelectorAll('a[data-cmai-dest]')).some(a => a.getAttribute('data-cmai-dest') === 'Claude'));
  }
  {
    const { w } = makeDoorPage('https://chatgpt.com/', { cmai_lastdoor: { byHost: { chatgpt: 'ChatGPT' }, any: 'ChatGPT' } });
    const d = await compileForDoors(w);
    const dr = doorsOf(d);
    check('doors: a last door equal to the source is skipped', dr.primary.length === 1 && dr.primary[0].getAttribute('data-cmai-dest') === 'Claude');
  }

  console.log(ok ? 'ALL EXTENSION SIM TESTS PASS' : 'SOME TESTS FAILED');
  process.exit(ok ? 0 : 1);
})();
