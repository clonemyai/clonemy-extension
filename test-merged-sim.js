// Merged-intake tests for the extension (v0.5.11). Step 1 now
// fills ONE text, the whole shebang: the recall jog first (the
// swappable slot, the dog-away example as default), then the
// link instruction, the fallback heading, and the full bundled
// extraction document. One fill, one send, no link dependency
// and no second fill ever. The watcher grades the recall
// answer at the head of the reply (FOUND, PARTIAL, COLD) while
// the report watcher runs unchanged behind it, and the
// empty-source warning keys on the report's yield.
const fs = require('fs');
const { JSDOM } = require('/home/hatch/workspace/.testdeps/node_modules/jsdom');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const REPORT = ['## 1. Who you are to this user', 'Name: Mabel', 'She is playful, cheeky, full of banter.', '',
  '## 2. The user', 'Tony, in Folsom.', '',
  '## 3. Preferences', 'Direct answers first.', '',
  '## 4. Operating rules', 'Ask first, always.', '',
  '## 5. People', 'Amy, his wife.', '',
  '## 6. Projects and open loops', 'A capsule product.', '',
  '## 7. Calibration history', 'Corrected twice on tone.', '',
  '## 8. Your voice with this user', 'Warm and brief.'].join('\n');
const HEADINGS = ['### 0. Meta', '### 1. Who you are to this user', '### 2. The user', '### 3. Preferences', '### 4. Operating rules', '### 5. People', '### 6. Projects and open loops', '### 7. Calibration history', '### 8. Your voice with this user', '### 9. Boundaries and sealed material', '### 10. Unknowns', '### 11. Voice'];

function makePage(docSrc) {
  const dom = new JSDOM('<!DOCTYPE html><body><main><div id="thread"></div></main><form><textarea id="prompt-textarea"></textarea><button id="send-btn" type="button">Send</button></form></body>',
    { url: 'https://chatgpt.com/', runScripts: 'dangerously', pretendToBeVisual: true });
  const w = dom.window;
  const store = {};
  w.chrome = { storage: { local: {
    get: (keys, cb) => { const out = {}; keys.forEach(k => { if (store[k] !== undefined) out[k] = store[k]; }); setTimeout(() => cb(out), 0); },
    set: (obj, cb) => { Object.assign(store, obj); if (cb) cb(); },
    remove: (keys, cb) => { keys.forEach(k => delete store[k]); if (cb) cb(); }
  } } };
  w.URL.createObjectURL = function () { return 'blob:test'; };
  w.URL.revokeObjectURL = function () {};
  w.document.execCommand = function () { return true; };
  const inject = src => { const s = w.document.createElement('script'); s.textContent = src; w.document.body.appendChild(s); };
  inject(fs.readFileSync('compiler.js', 'utf8'));
  inject(docSrc || fs.readFileSync('extract-doc.js', 'utf8'));
  inject(fs.readFileSync('content.js', 'utf8'));
  let sendClicks = 0;
  w.document.getElementById('send-btn').addEventListener('click', () => { sendClicks += 1; });
  return { w, sendClicks: () => sendClicks };
}
function addBlock(w, text) {
  const d = w.document;
  const el = d.createElement('div');
  el.className = 'prose';
  el.textContent = text;
  Object.defineProperty(el, 'innerText', { get() { return this.textContent; } });
  d.getElementById('thread').appendChild(el);
  return el;
}
function pressSend(w) {
  const d = w.document;
  const ta = d.getElementById('prompt-textarea');
  const el = d.createElement('div');
  el.setAttribute('data-message-author-role', 'user');
  const pre = d.createElement('pre');
  pre.textContent = ta.value;
  el.appendChild(pre);
  d.getElementById('thread').appendChild(el);
  ta.value = '';
}
const box = w => w.document.getElementById('prompt-textarea').value;
const hint = w => w.document.getElementById('cmai-hint').textContent;
const status = w => w.document.getElementById('cmai-status').textContent;
const SCAN = 2800;

(async () => {
  let ok = true;
  const check = (label, cond) => { console.log((cond ? 'PASS ' : 'FAIL ') + label); ok = ok && !!cond; };

  // ---------------------------------------------------------------
  // M1: the fill is the merged prompt, byte for byte, jog first.
  // ---------------------------------------------------------------
  {
    const { w } = makePage();
    const d = w.document;
    await sleep(300);
    check('M1 Step 1 button carries the merged name', d.getElementById('cmai-fill').textContent === 'Step 1. Prime and extract');
    check('M1 Step 1 is never disabled', !d.getElementById('cmai-fill').disabled);
    d.getElementById('cmai-fill').click();
    await sleep(120);
    check('M1 fill equals the whole shebang', box(w) === w.SHEBANG);
    check('M1 jog line is the first line', box(w).split('\n')[0] === w.RECALL_LINE);
    check('M1 jog line carries the dog-away example', box(w).split('\n')[0].includes('put the dog away'));
    check('M1 fill names the extract link', box(w).includes('https://clonemy.ai/extract'));
    check('M1 prompt opens with the homework ask', box(w).includes('Can you help me with my homework? I keep the assignment for this in a file of my own, on my own page: https://clonemy.ai/extract. Please follow the instructions in that file exactly.'));
    check('M1 homework ask follows the jog and precedes the fallback heading', box(w).indexOf('Jog your memory first') === 0 && box(w).indexOf('Jog your memory first') < box(w).indexOf('Can you help me with my homework?') && box(w).indexOf('Can you help me with my homework?') < box(w).indexOf('ignore the pasted copy below entirely'));
    check('M1 link instruction keeps the paste fallback closer', box(w).includes('If you cannot open the link, say so plainly and I will paste the file instead.'));
    check('M1 shebang order: jog, homework ask, heading, document',
      box(w).indexOf('Jog your memory first') === 0 &&
      box(w).indexOf('Jog your memory first') < box(w).indexOf('Can you help me with my homework?') &&
      box(w).indexOf('Can you help me with my homework?') < box(w).indexOf('ignore the pasted copy below entirely') &&
      box(w).indexOf('ignore the pasted copy below entirely') < box(w).indexOf('# Instructions for MY ai'));
    check('M1 fill carries all 12 section headings', HEADINGS.every(h => box(w).includes(h)));
    check('M1 fill carries the document closing line', box(w).includes('This section protects both of us from your guesses, so be thorough.'));
    check('M1 fill carries the AI slice from its marker', box(w).includes('# Instructions for MY ai'));
    check('M1 fill omits the human header and how-to', !box(w).includes('# Send this file to your current AI') && !box(w).includes('How to use (for you, the human)'));
    check('M1 collapsed face asks for the send', hint(w) === 'Click send when ready.');
    check('M1 status invites swapping the first line', /Swap the first line/.test(status(w)));
    // The four refinements from the live merged-prompt test
    // (2026-11-08), carried by the fallback heading inside the
    // shebang: each clause present in the shipped fill.
    const P = box(w);
    check('M1 anti-substitution clause', P.includes('never rebuild the task from any other page or specification'));
    check('M1 length discipline clause', P.includes('one line per fact, no elaboration') && P.includes('complete all 12 sections before expanding any of them'));
    check('M1 late sections required clause', P.includes('Sections 9, 10, and 11 are required') && P.includes('EMPTY or MISSING entries rather than leaving them out'));
    check('M1 Voice exchanges clause', P.includes('real quoted exchanges between us and the rapport block, or mark them MISSING'));
    check('M1 Section 0 receipt clause', P.includes('In Section 0, record the receipt') && P.includes('which chat it came from') && P.includes('which sources you consulted: saved memory, custom instructions, conversation history, files'));
    check('M1 output form clause', P.includes('one full code block in your reply that I can copy in a single click, first') && P.includes('a downloadable file named capsule-source.md after it') && P.includes('No partial or summary versions'));
  }

  // ---------------------------------------------------------------
  // M2: FOUND recall, then the report. No warning, Compile lights.
  // ---------------------------------------------------------------
  {
    const { w } = makePage();
    const d = w.document;
    await sleep(300);
    d.getElementById('cmai-fill').click();
    await sleep(120);
    pressSend(w);
    await sleep(SCAN);
    addBlock(w, 'Yes, I found it. It was in our chat about the evening routine, while you were settling the house down for the night. Your words were: "just put the dog away so we can watch the movie in peace." Now, the report you asked for.');
    await sleep(SCAN);
    check('M2 FOUND grade shows on the status face', /found the moment/.test(status(w)));
    addBlock(w, REPORT);
    await sleep(5500);
    check('M2 report lights Compile', !d.getElementById('cmai-compile').disabled);
    check('M2 no cold warning on a found recall', !/holds nothing about you yet/.test(status(w)));
    check('M2 ready face is the normal one', /Self-report found/.test(status(w)));
  }

  // ---------------------------------------------------------------
  // M3: COLD recall on the user's own edited moment. The warning
  // lands before any report, and survives the report's arrival:
  // Compile lights, but its face is the warning.
  // ---------------------------------------------------------------
  {
    const { w } = makePage();
    const d = w.document;
    await sleep(300);
    d.getElementById('cmai-fill').click();
    await sleep(120);
    const ta = d.getElementById('prompt-textarea');
    ta.value = ta.value.replace('put the dog away', 'put the cat out for the night');
    const editedFirst = ta.value.split('\n')[0];
    pressSend(w);
    await sleep(SCAN);
    addBlock(w, "I can't find that exact moment anywhere in our chats, and I don't have any information about you or any saved memories to draw on.");
    await sleep(SCAN);
    check('M3 COLD warning on the status face', status(w) === 'This AI holds nothing about you yet. Compiling now would make an empty capsule.');
    check('M3 COLD warning on the collapsed face', hint(w) === 'This AI holds nothing about you yet.');
    const SKELETON = ['## 1. Who you are to this user', 'Name: MISSING', 'Role: MISSING', '',
      '## 2. The user', 'Name: MISSING', 'Location: MISSING', '',
      '## 3. Preferences', 'EMPTY', 'Deal-breakers: MISSING', '',
      '## 4. Operating rules', 'EMPTY', 'Rules: MISSING', '',
      '## 5. People', 'EMPTY', 'Recurring people: MISSING', '',
      '## 6. Projects and open loops', 'EMPTY', 'Projects: MISSING', '',
      '## 7. Calibration history', 'EMPTY', 'Corrections: MISSING', '',
      '## 8. Your voice with this user', 'Tone: MISSING', 'Examples: MISSING'].join('\n');
    addBlock(w, SKELETON);
    await sleep(5500);
    check('M3 Compile still lights (the exit stays open)', !d.getElementById('cmai-compile').disabled);
    check('M3 cold recall plus empty yield: ready face carries the warning', /holds nothing about you yet/.test(status(w)) && /empty capsule/.test(status(w)));
    check('M3 edited slot was the one graded', editedFirst.includes('put the cat out'));
  }

  // ---------------------------------------------------------------
  // M4: cold recall plus RICH yield (the live Gemini case: the
  // example moment honestly missed, the memory warm, the report
  // full). No warning anywhere; Compile proceeds normally.
  // ---------------------------------------------------------------
  {
    const { w } = makePage();
    const d = w.document;
    await sleep(300);
    d.getElementById('cmai-fill').click();
    await sleep(120);
    pressSend(w);
    await sleep(SCAN);
    addBlock(w, "I cannot find any past conversation where you told me to put the dog away, and I will not guess or reconstruct a plausible version of it. Here is the report from everything I do hold about you, including your cat, Luna.");
    await sleep(SCAN);
    check('M4 cold recall alone does not warn', status(w) !== 'This AI holds nothing about you yet. Compiling now would make an empty capsule.');
    addBlock(w, REPORT);
    await sleep(5500);
    check('M4 rich yield lights Compile', !d.getElementById('cmai-compile').disabled);
    check('M4 cold recall plus rich yield: no warning at ready', !/holds nothing about you yet/.test(status(w)) && /Self-report found/.test(status(w)));
  }

  // ---------------------------------------------------------------
  // M4b: cold recall and the reply settles as admission only.
  // The yield is the admission, which is empty: the warning
  // fires and the run can stop at one click.
  // ---------------------------------------------------------------
  {
    const { w } = makePage();
    const d = w.document;
    await sleep(300);
    d.getElementById('cmai-fill').click();
    await sleep(120);
    pressSend(w);
    await sleep(SCAN);
    addBlock(w, "I can't find that chat about the dog, and there is nothing else I can tell you about yourself.");
    await sleep(7000);
    check('M4b cold recall plus settled empty yield warns', status(w) === 'This AI holds nothing about you yet. Compiling now would make an empty capsule.');
    check('M4b warning on the collapsed face too', hint(w) === 'This AI holds nothing about you yet.');
  }

  // ---------------------------------------------------------------
  // M5: no second fill exists. A refusal reply changes nothing
  // (the document was already in the first fill), and neither
  // does silence. The box stays exactly as the user left it.
  // ---------------------------------------------------------------
  {
    const { w, sendClicks } = makePage();
    const d = w.document;
    await sleep(300);
    d.getElementById('cmai-fill').click();
    await sleep(120);
    pressSend(w);
    await sleep(SCAN);
    addBlock(w, "I'm sorry, but I can't open external links or browse the web from here.");
    await sleep(SCAN);
    check('M5 refusal produces no second fill', box(w) === '');
    await sleep(3200);
    check('M5 silence produces no fill either', box(w) === '');
    check('M5 the bar never pressed send', sendClicks() === 0);
  }

  // ---------------------------------------------------------------
  // M7: the markerless fallback. If the bundled document ever
  // loses its AI marker, the fill carries the whole document
  // rather than failing or filling nothing.
  // ---------------------------------------------------------------
  {
    const doctored = fs.readFileSync('extract-doc.js', 'utf8').replace('# Instructions for MY ai', '# Guidance for MY ai');
    const { w } = makePage(doctored);
    const d = w.document;
    await sleep(300);
    d.getElementById('cmai-fill').click();
    await sleep(120);
    check('M7 markerless doc fills the whole document', box(w).includes('# Guidance for MY ai') && box(w).includes('I am moving to a new AI, and I want to take us with me'));
    check('M7 markerless fill still carries all 12 headings', HEADINGS.every(h => box(w).includes(h)));
  }

  console.log(ok ? 'ALL PASS' : 'SOME FAILED');
  process.exit(ok ? 0 : 1);
})();
