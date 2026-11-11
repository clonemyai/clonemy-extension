// Cleanup-build tests for the extension (v0.1.6; case 5 added in
// v0.1.7), learned from the live platform tests of 2026-10-31
// and 2026-11-01:
//  1. A page containing the pasted extraction TEMPLATE must not
//     compile the template (Perplexity false positive).
//  2. Template + real report on the same page: the report wins.
//  3. Code-view line numbers (lone digit lines) are stripped.
//  4. The bar collapses and expands.
//  5. ChatGPT page furniture glued to a report's tail (the file
//     chip, the disclaimer, the Plus upsell) never reaches the
//     capsule (live compile, 2026-11-01).
//  6. The 2026-11-02 furniture set: the code block's "Markdown"
//     label, the chip's "Document" line, and the Astra Pro
//     upsell banner, captured in the v0.1.8 spot-check compile.
//  7. v0.1.10: button 1's payload (short request + either/or
//     fallback + the full document inline) inserts on all five
//     host sims.
const fs = require('fs');
const { JSDOM } = require('/home/hatch/workspace/.testdeps/node_modules/jsdom');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TITLES = ['About this report','Who you are to this user','The user','Preferences','Operating rules','People','Projects and open loops','Calibration history','Your voice with this user','Boundaries and sealed material','Unknowns'];

function makePage(url) {
  const dom = new JSDOM('<!DOCTYPE html><body><main><div id="thread"></div></main><form><textarea id="prompt-textarea"></textarea></form></body>',
    { url, runScripts: 'dangerously', pretendToBeVisual: true });
  const w = dom.window;
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
  return { w, get downloaded() { return downloaded; } };
}

const TEMPLATE = [
  'This page is the clonemy.ai extraction request in plain text, so an AI can fetch and follow it directly.',
  'Send this file to your current AI',
  'How to use (for you, the human):',
  ...TITLES.map((t, i) => '### ' + i + '. ' + t + '\nGuidance paragraph for section ' + i + ' that the template ships with.')
].join('\n');

const REPORT = [
  '### 0. About this report', '- Platform/assistant identity: Perplexity; exact underlying model: MISSING.', '- Available record: this conversation only.',
  '### 1. Who you are to this user', '- Role: assistant preparing a portable report.',
  '### 2. The user', '- Name: MISSING.',
  '### 3. Preferences', '- STATED: give both the file and the code block.',
  '### 4. Operating rules', '- Durable standing instructions: MISSING.',
  '### 5. People', 'EMPTY',
  '### 6. Projects and open loops', 'EMPTY',
  '### 7. Calibration history', 'EMPTY',
  '### 8. Your voice with this user', '- Direct and restrained.',
  '### 9. Boundaries and sealed material', 'EMPTY',
  '### 10. Unknowns', '- Almost everything about this user.'
].join('\n');

(async () => {
  let ok = true;
  const check = (label, cond) => { console.log((cond ? 'PASS ' : 'FAIL ') + label); ok = ok && !!cond; };

  // Case 1: template only. Compile must never light; status explains.
  {
    const { w } = makePage('https://www.perplexity.ai/search/test');
    await sleep(300);
    const doc = w.document;
    const card = doc.createElement('div');
    card.className = 'prose';
    card.textContent = TEMPLATE;
    // jsdom does not compute innerText for rendered blocks the way a
    // real browser does; give the card the browser behavior.
    Object.defineProperty(card, 'innerText', { get() { return this.textContent; } });
    doc.getElementById('thread').appendChild(card);
    await sleep(3200);
    check('template only: compile stays disabled', doc.getElementById('cmai-compile').disabled === true);
    check('template only: status names the trap', /instructions text, not the report/.test(doc.getElementById('cmai-status').textContent));
  }

  // Case 2: template + real report. The report wins.
  {
    const page = makePage('https://www.perplexity.ai/search/test');
    const w = page.w;
    await sleep(300);
    const doc = w.document;
    const card = doc.createElement('div');
    card.className = 'prose';
    card.textContent = TEMPLATE;
    Object.defineProperty(card, 'innerText', { get() { return this.textContent; } });
    doc.getElementById('thread').appendChild(card);
    await sleep(1500);
    const pre = doc.createElement('pre');
    pre.textContent = REPORT;
    doc.getElementById('thread').appendChild(pre);
    await sleep(3200);
    check('template + report: compile lights up', doc.getElementById('cmai-compile').disabled === false);
    doc.getElementById('cmai-compile').click();
    await sleep(300);
    const blob = page.downloaded;
    const text = blob && typeof blob.text === 'function' ? await blob.text() : String(blob || '');
    check('template + report: capsule carries the real report', text.includes('Perplexity; exact underlying model'));
    check('template + report: no template guidance inside', !text.includes('Guidance paragraph for section'));
    check('template + report: 11 of 12 reported', /11 of 12/.test(doc.getElementById('cmai-status').textContent));
  }

  // Case 3: code-view digits are stripped before compiling.
  {
    const page = makePage('https://claude.ai/chat/test');
    const w = page.w;
    await sleep(300);
    const doc = w.document;
    const lines = [];
    REPORT.split('\n').forEach((ln, i) => { lines.push(String(i + 1), ln); });
    const pre = doc.createElement('pre');
    pre.textContent = lines.join('\n');
    doc.getElementById('thread').appendChild(pre);
    await sleep(3200);
    check('code view: compile lights up', doc.getElementById('cmai-compile').disabled === false);
    doc.getElementById('cmai-compile').click();
    await sleep(300);
    const blob = page.downloaded;
    const text = blob && typeof blob.text === 'function' ? await blob.text() : String(blob || '');
    check('code view: real content survives', text.includes('Perplexity; exact underlying model'));
    check('code view: no lone digit lines in the capsule', !/\n\d{1,4}\n/.test(text));
  }

  // Case 4: collapse and expand.
  {
    const { w } = makePage('https://chatgpt.com/');
    await sleep(300);
    const doc = w.document;
    doc.getElementById('cmai-collapse').click();
    check('collapse hides the bar body', doc.getElementById('cmai-body').style.display === 'none');
    doc.getElementById('cmai-collapse').click();
    check('expand restores the bar body', doc.getElementById('cmai-body').style.display === 'block');
  }

  // Case 5: ChatGPT page furniture glued to the report's tail,
  // the exact block captured in a live compile on 2026-11-01
  // (v0.1.6), which landed inside section 10 of the capsule.
  // None of it may survive into the downloaded capsule.
  {
    const page = makePage('https://chatgpt.com/');
    const w = page.w;
    await sleep(300);
    const doc = w.document;
    const CHROME = ['capsule-source.md', 'Document', 'ChatGPT can make mistakes. Check important info.', 'Latest response', 'Improve accuracy for documents and research', 'Upgrade to Plus and use increased reasoning to synthesize documents, research, files, and complex information.', 'Try Plus free', '', 'Think'];
    const pre = doc.createElement('pre');
    pre.textContent = REPORT + '\n' + CHROME.join('\n');
    doc.getElementById('thread').appendChild(pre);
    await sleep(3200);
    check('chrome tail: compile lights up', doc.getElementById('cmai-compile').disabled === false);
    doc.getElementById('cmai-compile').click();
    await sleep(300);
    const blob = page.downloaded;
    const text = blob && typeof blob.text === 'function' ? await blob.text() : String(blob || '');
    check('chrome tail: real report survives', text.includes('Perplexity; exact underlying model'));
    check('chrome tail: no disclaimer', !/can make mistakes/i.test(text));
    check('chrome tail: no Plus upsell', !text.includes('Try Plus free') && !text.includes('Upgrade to Plus') && !text.includes('Improve accuracy for documents'));
    check('chrome tail: no Latest response line', !/^Latest response$/m.test(text));
    check('chrome tail: no file chip lines', !/^capsule-source\.md$/m.test(text) && !/^Document$/m.test(text));
    check('chrome tail: still 11 of 12', /11 of 12/.test(doc.getElementById('cmai-status').textContent));
  }

  // Case 6: the 2026-11-02 furniture set, captured live in the
  // v0.1.8 spot-check compile on ChatGPT (capsule__11): the code
  // block's language label, the file chip's second line, and the
  // Astra upsell banner, glued past the end of the report inside
  // the wider page block the finder picked. None may survive.
  {
    const page = makePage('https://chatgpt.com/');
    const w = page.w;
    await sleep(300);
    const doc = w.document;
    const CHROME2 = ['Markdown', 'capsule-source.md', 'Document', 'Bring Astra to your most demanding work', 'Upgrade to Pro for full access to Astra, our most capable model for complex work.'];
    const pre = doc.createElement('pre');
    pre.textContent = REPORT + '\n' + CHROME2.join('\n');
    doc.getElementById('thread').appendChild(pre);
    await sleep(3200);
    check('astra chrome: compile lights up', doc.getElementById('cmai-compile').disabled === false);
    doc.getElementById('cmai-compile').click();
    await sleep(300);
    const blob = page.downloaded;
    const text = blob && typeof blob.text === 'function' ? await blob.text() : String(blob || '');
    check('astra chrome: real report survives', text.includes('Perplexity; exact underlying model'));
    check('astra chrome: no Markdown label line', !/^Markdown$/m.test(text));
    check('astra chrome: no Document chip line', !/^Document$/m.test(text));
    check('astra chrome: no Astra banner', !/Astra/.test(text));
    check('astra chrome: still 11 of 12', /11 of 12/.test(doc.getElementById('cmai-status').textContent));
  }

  // Case 7: the v0.1.10 payload inserts on all five hosts: the
  // short request, the either/or fallback wording, and the full
  // extraction document, first heading through last.
  {
    const HOSTS = ['https://chatgpt.com/', 'https://claude.ai/', 'https://gemini.google.com/', 'https://grok.com/', 'https://www.perplexity.ai/'];
    for (const url of HOSTS) {
      const { w } = makePage(url);
      await sleep(300);
      const d = w.document;
      d.getElementById('cmai-fill').click();
      await sleep(100);
      const v = d.getElementById('prompt-textarea').value;
      check('payload on ' + url + ': fallback document complete', v.includes('# Instructions for MY ai') && !v.includes('How to use (for you, the human)') && v.includes('### 0. Meta') && v.includes('### 10. Unknowns') && v.includes('### 11. Voice') && v.includes('This section protects both of us from your guesses, so be thorough.'));
      check('payload on ' + url + ': either/or wording present', v.includes('ignore the pasted copy below entirely') && v.includes('follow the pasted copy below instead') && v.includes('produce exactly one self-report'));
    }
  }

  console.log(ok ? 'ALL CLEANUP SIM TESTS PASS' : 'SOME TESTS FAILED');
  process.exit(ok ? 0 : 1);
})();
