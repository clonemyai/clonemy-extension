// clonemy.ai extension: the part that lives inside your AI chat tab.
//
// What this file does, in plain words:
//   1. Shows a small clonemy bar in the corner of the page.
//   2. Button 1 puts the extraction request into the chat box.
//      It does NOT press send. You do. A human stays in the loop.
//   3. It watches the page for your AI's finished self-report
//      (recognized by the numbered sections of the extraction format).
//   4. Button 2 compiles that report into capsule.md, right here in
//      this tab, and downloads the file. The compiler is compiler.js.
//
// What this file never does: send anything anywhere. There is no
// network code in this extension at all. Search the JavaScript files
// for the usual network call names: you will find none, anywhere.
//
// The only thing stored is a tiny usage tally (which AI sites you use,
// counted by days and sessions) in the browser's own local storage,
// so the extension can tell which of your AIs is your regular one.
// The popup shows that tally in plain numbers, with an erase button.

"use strict";

// ------------------------------------------------------------------
// Platform profiles. Everything that differs between AI sites lives
// in this one small table: the site's name, and hints for finding
// its message box. If a site redesigns its page, the fix is here.
// ------------------------------------------------------------------
var PLATFORMS = [
  { id: "chatgpt",    name: "ChatGPT",    hosts: ["chatgpt.com", "chat.openai.com"] },
  { id: "claude",     name: "Claude",     hosts: ["claude.ai"] },
  { id: "gemini",     name: "Gemini",     hosts: ["gemini.google.com"] },
  { id: "grok",       name: "Grok",       hosts: ["grok.com", "grok.x.ai"] },
  { id: "perplexity", name: "Perplexity", hosts: ["www.perplexity.ai", "perplexity.ai"] },
  { id: "muse",       name: "Muse",       hosts: ["muse.ai"] },
  { id: "metaai",     name: "Meta AI",    hosts: ["www.meta.ai", "meta.ai"] }
];

function currentPlatform() {
  var host = location.hostname;
  for (var i = 0; i < PLATFORMS.length; i++) {
    if (PLATFORMS[i].hosts.indexOf(host) !== -1) { return PLATFORMS[i]; }
  }
  return null;
}

// The same extraction prompt the clonemy.ai website buttons use.
// v0.5.13: the prompt now opens as a homework ask (Tony, 2026-11-08):
// the jog still leads the fill (it is the piece proven to work), and
// the prompt behind it asks for help with the assignment, the file
// on the user's own page being that assignment. The document itself
// is re-voiced as the user's own homework: learning how they and
// their AI interact.
// Since v0.1.6 the ask is for BOTH outputs, the file and the code
// block: the file is the keeper, the code block is what this
// extension can see and compile. AIs that only made the file left
// the page empty (ChatGPT and Grok, live tests, 2026-10-31).
var PROMPT = "Can you help me with my homework? I keep the assignment for this in a file of my own, on my own page: https://clonemy.ai/extract. Please follow the instructions in that file exactly. It asks you to write a structured self-report: your configured personality and tone, my preferences, my standing rules, the people in my life, and our relationship, drawn from our history together. Produce the complete document it asks for, in both forms: one full code block in your reply that I can copy in a single click, first, and a downloadable file named capsule-source.md after it. If you cannot open the link, say so plainly and I will paste the file instead.";

// The fallback: the whole extraction document, pasted inline
// (extract-doc.js, bundled in the package, zero network). Some AIs
// cannot open links at all, and some hosts fetch unreliably, so
// since v0.1.10 the request carries the document with it. The
// framing is strictly either/or, so an AI that both opens the
// page and reads the pasted copy still produces exactly one
// self-report, never a duplicate.
var FALLBACK_HEADING = "IF THE PAGE DID NOT OPEN, THE FULL INSTRUCTIONS ARE PASTED BELOW. This is strictly either/or: if the page opened, follow the page and ignore the pasted copy below entirely, it is the same document. If the page did not open, do not ask me to paste anything, follow the pasted copy below instead: it is the whole document, so never rebuild the task from any other page or specification. Either way, produce exactly one self-report. Keep it tight: one line per fact, no elaboration, and complete all 12 sections before expanding any of them. Sections 9, 10, and 11 are required: write them with EMPTY or MISSING entries rather than leaving them out, and in Section 11 include real quoted exchanges between us and the rapport block, or mark them MISSING. In Section 0, record the receipt: whether you found the moment in the first line above and which chat it came from, or plainly that you could not find it, and which sources you consulted: saved memory, custom instructions, conversation history, files. Produce the complete report in both forms: one full code block in your reply that I can copy in a single click, first, and a downloadable file named capsule-source.md after it. No partial or summary versions.";

// What button 1 actually inserts: the short request first, then
// the fallback marker, then the complete document.
// The AI-facing slice of the bundled document (v0.5.11): the
// document used to open with a human-facing header (its title
// and a how-to for the person holding the file), packaging for
// a human who downloads the standalone file, dead weight and a
// confusion surface in a paste bound for an AI. The fill
// carried only the part addressed to the AI, sliced here at
// runtime from its marker to the end of the document. Since
// the v0.5.12 regeneration the canonical document is AI-only
// from its first line (site v7.11 removed the header at the
// source, and reframed the text in the user's first-person
// voice), so the slice normally returns the whole document;
// the marker logic stays as a guard. If the marker is ever
// absent, the whole document fills rather than failing.
var AI_DOC_MARKER = "# Instructions for MY ai";
var AI_DOC = (function () {
  var i = EXTRACT_DOC.indexOf(AI_DOC_MARKER);
  return i === -1 ? EXTRACT_DOC : EXTRACT_DOC.slice(i);
})();

var FULL_PROMPT = PROMPT + "\n\n" + FALLBACK_HEADING + "\n\n" + AI_DOC;

// The merged intake (v0.5.11, Tony's merge and his whole-shebang
// call, 2026-11-08): Step 1 fills ONE text, the whole shebang in
// a single fill: the recall jog first (the first line is the
// swappable slot, shown with Tony's dog-away example as the
// default fill), then the link instruction above as canonical
// reference, then the fallback heading, then the full bundled
// document. The AI never has to fetch anything, so there is no
// link step and no failure fallback: one fill, one send. The
// two-step split only bought processing speed, and an intake is
// something a user does a few times, so speed was never the
// requirement.
var RECALL_LINE = "Jog your memory first. Can you remember which chat you told me to put the dog away? Answer from our actual past conversations. If you cannot find that exact moment, say so plainly, and do not rebuild a plausible version of it from guesses.";
var SHEBANG = RECALL_LINE + "\n\n" + FULL_PROMPT;

// Recall grading patterns (v0.5.11). The recall answer sits at
// the head of the AI's one reply, ahead of the report, and the
// watcher grades it from that passage alone. STRONG_COLD is a
// holds-nothing admission. MOMENT_MISSING is only the moment
// not found: corroboration, never the verdict on its own (the
// warning fires on the report's yield, see the bar's grading).
var STRONG_COLD_PATTERNS = [
  /\bhold nothing about you\b/i,
  /(don'?t|do not) have (any )?(information|memories|memory|history|records?|context) about you/i,
  /\bno (saved memories|prior conversations?|previous conversations?)\b/i,
  /\bno (information|memories|history|record) about you\b/i,
  /\bnothing about you (in|from) (my|our|any)\b/i
];
var MOMENT_MISSING_PATTERNS = [
  /(can'?t|cannot|couldn'?t|don'?t|do not|didn'?t|did not|unable to)\b[^.!\n]{0,50}\b(find|recall|remember|locate)\b[^.!\n]{0,60}\b(chat|moment|conversation|dog)\b/i,
  /\bno (record|mention|sign) of\b[^.!\n]{0,50}\bdog\b/i,
  /\bnever (told|asked|mentioned)\b[^.!\n]{0,40}\bdog\b/i
];

// The 11 section titles of the extraction format, used to recognize
// a finished self-report on the page.
var SECTION_TITLES = [
  "About this report", "Who you are to this user", "The user", "Preferences",
  "Operating rules", "People", "Projects and open loops",
  "Calibration history", "Your voice with this user",
  "Boundaries and sealed material", "Unknowns"
];

// ------------------------------------------------------------------
// Usage tally: sessions and distinct days, per platform, local only.
// A session is a visit at least 30 minutes after the previous one.
// ------------------------------------------------------------------
var SESSION_GAP_MS = 30 * 60 * 1000;

function recordVisit(platform) {
  try {
    chrome.storage.local.get(["cmai_tally"], function (data) {
      var tally = data.cmai_tally || {};
      var now = Date.now();
      var today = new Date().toISOString().slice(0, 10);
      var entry = tally[platform.id] || { name: platform.name, sessions: 0, days: [], last: 0 };
      if (now - (entry.last || 0) > SESSION_GAP_MS) {
        entry.sessions += 1;
        if (entry.days.indexOf(today) === -1) { entry.days.push(today); }
      }
      entry.last = now;
      tally[platform.id] = entry;
      chrome.storage.local.set({ cmai_tally: tally });
    });
  } catch (e) { /* storage unavailable: the rest still works */ }
}

// ------------------------------------------------------------------
// Pending delivery (Phase 3): a compiled capsule waiting to be
// carried into another AI's tab. One at a time, kept in the same
// local storage as the tally, on this machine only. It expires a
// day after it was compiled, and either end can discard it.
// ------------------------------------------------------------------
var PENDING_KEY = "cmai_pending";
var PENDING_TTL_MS = 24 * 60 * 60 * 1000;

function stashPending(entry) {
  try { chrome.storage.local.set({ cmai_pending: entry }); } catch (e) {}
}

function readPending(done) {
  try {
    chrome.storage.local.get([PENDING_KEY], function (data) {
      var p = data[PENDING_KEY] || null;
      if (p && Date.now() - p.ts > PENDING_TTL_MS) {
        clearPending();
        p = null;
      }
      done(p);
    });
  } catch (e) { done(null); }
}

function clearPending() {
  try { chrome.storage.local.remove(PENDING_KEY); } catch (e) {}
}

// ------------------------------------------------------------------
// The vault and pair sync (v0.4.0). The vault keeps the latest
// capsule per source platform in local storage, versioned, with
// per-section hashes, so a recompile can name exactly what changed
// instead of silently replacing. Pair sync remembers which version
// each platform last received, so its bar can offer an update with
// the diff, or say plainly that it is already current. Local only.
// ------------------------------------------------------------------
var VAULT_KEY = "cmai_vault";
var DELIVERED_KEY = "cmai_delivered";
var SECTION_NAMES = ["About this report", "Who you are to this user", "The user", "Preferences", "Operating rules", "People", "Projects and open loops", "Calibration history", "Your voice with this user", "Boundaries and sealed material", "Unknowns"];

function hashStr(s) {
  var h = 5381;
  for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; }
  return h.toString(16);
}

function sectionHashes(text) {
  var parts = {}, current = null, buf = [];
  function flush() { if (current !== null) { parts[current] = hashStr(buf.join("\n")); } }
  text.split("\n").forEach(function (line) {
    var m = line.match(/^## (\d+)\. /);
    if (m) { flush(); current = m[1]; buf = [line]; }
    else if (/^## /.test(line)) {
      // An unnumbered block header (the parity self-check, the
      // flavor block, the human block at the end) is not section
      // content. The compiler's own split files lines only under
      // the 11 canonical headings, so the hashes follow it: text
      // outside the numbered sections never moves a section hash.
      // (Fixed in v0.4.2: the trailing blocks used to ride inside
      // section 10's hash, so a flavor-only recompile announced
      // "Unknowns changed" when no section had changed at all.)
      flush(); current = null; buf = [];
    }
    else if (current !== null) { buf.push(line); }
  });
  flush();
  return parts;
}

function changedSectionNames(oldH, newH) {
  var names = [];
  for (var i = 0; i <= 10; i++) {
    var k = String(i);
    if ((oldH && oldH[k]) !== (newH && newH[k])) { names.push(SECTION_NAMES[i]); }
  }
  return names;
}

function readVault(done) {
  try { chrome.storage.local.get([VAULT_KEY], function (d) { done(d[VAULT_KEY] || {}); }); }
  catch (e) { done({}); }
}

function vaultPatch(id, val) { var o = {}; o[id] = val; return o; }

function upsertVault(platformId, entry, done) {
  readVault(function (vault) {
    var wrap = vault[platformId] || null;
    var prev = wrap ? wrap.cur : null;
    var hashes = sectionHashes(entry.text);
    var changed = prev ? changedSectionNames(prev.hashes, hashes) : null;
    var version = prev ? (changed.length ? prev.version + 1 : prev.version) : 1;
    var record = { text: entry.text, found: entry.found, flavor: entry.flavor, ts: Date.now(), version: version, hashes: hashes };
    var next = { cur: record, prev: prev ? { text: prev.text, version: prev.version, ts: prev.ts } : null };
    var finished = false;
    function finish() {
      if (finished) { return; }
      finished = true;
      done({ version: version, changed: changed, isFirst: !prev });
    }
    try {
      chrome.storage.local.set(vaultPatch(VAULT_KEY, Object.assign({}, vault, vaultPatch(platformId, next))), function () {
        if (chrome.runtime && chrome.runtime.lastError) {
          next.prev = null; // quota pressure: drop the retained previous text and retry once
          try { chrome.storage.local.set(vaultPatch(VAULT_KEY, Object.assign({}, vault, vaultPatch(platformId, next)))); } catch (e2) {}
        }
        finish();
      });
    } catch (e) { finish(); }
    setTimeout(finish, 400);
  });
}

function forgetVault(platformId, done) {
  readVault(function (vault) {
    delete vault[platformId];
    try { chrome.storage.local.set(vaultPatch(VAULT_KEY, vault), function () { done(); }); }
    catch (e) { done(); }
    setTimeout(done, 400);
  });
}

function readDelivered(done) {
  try { chrome.storage.local.get([DELIVERED_KEY], function (d) { done(d[DELIVERED_KEY] || {}); }); }
  catch (e) { done({}); }
}

function recordDelivered(targetId, fromId, version, hashes) {
  readDelivered(function (all) {
    var mine = Object.assign({}, all[targetId] || {});
    mine[fromId] = { version: version, ts: Date.now(), hashes: hashes || {} };
    try { chrome.storage.local.set(vaultPatch(DELIVERED_KEY, Object.assign({}, all, vaultPatch(targetId, mine)))); } catch (e) {}
  });
}

// ------------------------------------------------------------------
// Browser sync (v0.5.0, Layer 1.5). The vault snapshot is encrypted
// under a key derived from the user's passphrase (set in the popup),
// chunked, and written to chrome.storage.sync, so the browser's own
// sync carries it to the user's other browsers. The extension makes
// no network requests and adds no host permissions for this; the
// carrier sees chunk sizes and timing, never content. Opt-in: with
// no key stored locally, none of this runs. Merge discipline follows
// the conflict rule Tony set on 2026-11-03: the newest version
// governs; the superseded one folds underneath (the vault's retained
// previous slot), never deleted, and the fold is named in a note.
// ------------------------------------------------------------------
var SYNC_META_KEY = "csmeta";
var SYNC_CHUNK_PREFIX = "cs";
var SYNC_BUDGET = 92000;
var SYNC_CHUNK_CHARS = 6000;
var SYNCKEY_KEY = "cmai_synckey";
var SYNCBASE_KEY = "cmai_syncbase";
var SYNCCONF_KEY = "cmai_syncconf";
var SYNCNOTE_KEY = "cmai_syncnote";

function syncName(id) {
  for (var i = 0; i < PLATFORMS.length; i++) { if (PLATFORMS[i].id === id) { return PLATFORMS[i].name; } }
  return id;
}
function b64encode(bytes) {
  var s = "", CH = 0x8000;
  for (var i = 0; i < bytes.length; i += CH) { s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH)); }
  return btoa(s);
}
function b64decode(b64) {
  var s = atob(b64), out = new Uint8Array(s.length);
  for (var i = 0; i < s.length; i++) { out[i] = s.charCodeAt(i); }
  return out;
}
function readSyncKey(done) {
  try { chrome.storage.local.get([SYNCKEY_KEY], function (d) { done(d[SYNCKEY_KEY] || null); }); }
  catch (e) { done(null); }
}
function readSyncBase(done) {
  try { chrome.storage.local.get([SYNCBASE_KEY], function (d) { done(d[SYNCBASE_KEY] || {}); }); }
  catch (e) { done({}); }
}
function importSyncKey(jwk) {
  return crypto.subtle.importKey("jwk", jwk, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}
function setSyncNote(text) {
  try { chrome.storage.local.set(vaultPatch(SYNCNOTE_KEY, { text: text, ts: Date.now() })); } catch (e) {}
}

function publishSync() {
  readSyncKey(function (sk) {
    if (!sk) { return; }
    readVault(function (vault) {
      var ids = Object.keys(vault).filter(function (id) { return vault[id] && vault[id].cur; });
      if (!ids.length) { return; }
      ids.sort(function (a, b) { return vault[b].cur.ts - vault[a].cur.ts; });
      var entries = {}, subset = {}, used = 0;
      ids.forEach(function (id) {
        var cur = vault[id].cur;
        entries[id] = { version: cur.version, ts: cur.ts, hashes: cur.hashes, present: false };
      });
      ids.forEach(function (id) {
        var cur = vault[id].cur;
        var size = cur.text.length + 400;
        if (used + size <= SYNC_BUDGET) {
          subset[id] = { cur: { text: cur.text, found: cur.found, flavor: cur.flavor, ts: cur.ts, version: cur.version, hashes: cur.hashes }, prev: null };
          entries[id].present = true;
          used += size;
        }
      });
      importSyncKey(sk.jwk).then(function (key) {
        var iv = crypto.getRandomValues(new Uint8Array(12));
        var payload = new TextEncoder().encode(JSON.stringify({ vault: subset }));
        return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, payload).then(function (ct) {
          var b64 = b64encode(new Uint8Array(ct));
          var chunks = [];
          for (var i = 0; i < b64.length; i += SYNC_CHUNK_CHARS) { chunks.push(b64.slice(i, i + SYNC_CHUNK_CHARS)); }
          var meta = { v: 1, salt: sk.salt, iter: sk.iter, check: sk.check, iv: b64encode(iv), n: chunks.length, ts: Date.now(), entries: entries };
          writeSync(meta, chunks, false);
        });
      }).catch(function () {});
    });
  });
}

function writeSync(meta, chunks, beaconsOnly) {
  var obj = {};
  obj[SYNC_META_KEY] = meta;
  if (!beaconsOnly) { for (var i = 0; i < chunks.length; i++) { obj[SYNC_CHUNK_PREFIX + i] = chunks[i]; } }
  try {
    chrome.storage.sync.set(obj, function () {
      if (chrome.runtime && chrome.runtime.lastError && !beaconsOnly) {
        Object.keys(meta.entries).forEach(function (id) { meta.entries[id].present = false; });
        meta.n = 0;
        writeSync(meta, [], true);
        return;
      }
      readSyncBase(function (base) {
        Object.keys(meta.entries).forEach(function (id) { base[id] = meta.entries[id].version; });
        try { chrome.storage.local.set(vaultPatch(SYNCBASE_KEY, base)); } catch (e) {}
      });
    });
  } catch (e) {}
}

function pullSync(done) {
  var finish = function () { if (done) { done(); } };
  try {
    chrome.storage.sync.get([SYNC_META_KEY], function (d) {
      var meta = d[SYNC_META_KEY];
      if (!meta) { finish(); return; }
      readSyncKey(function (sk) {
        if (!sk) {
          setSyncNote("Synced capsules from another browser are waiting. Open the clonemy popup and enter your sync passphrase to unlock them.");
          finish(); return;
        }
        if (sk.check !== meta.check) {
          setSyncNote("Browser sync found a vault this passphrase does not open (a different passphrase, or a different sync setup). Nothing was imported.");
          finish(); return;
        }
        if (!meta.n) { noteBeacons(meta); finish(); return; }
        var chunkKeys = [];
        for (var i = 0; i < meta.n; i++) { chunkKeys.push(SYNC_CHUNK_PREFIX + i); }
        chrome.storage.sync.get(chunkKeys, function (cd) {
          var b64 = "";
          for (var i = 0; i < meta.n; i++) { b64 += cd[SYNC_CHUNK_PREFIX + i] || ""; }
          importSyncKey(sk.jwk).then(function (key) {
            return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64decode(meta.iv) }, key, b64decode(b64));
          }).then(function (pt) {
            var payload = JSON.parse(new TextDecoder().decode(pt));
            mergeSyncedVault(payload.vault || {}, meta, finish);
          }).catch(function () { setSyncNote("A synced capsule could not be decrypted. Nothing was imported."); finish(); });
        });
      });
    });
  } catch (e) { finish(); }
}

function noteBeacons(meta) {
  readVault(function (vault) {
    Object.keys(meta.entries || {}).forEach(function (id) {
      var e = meta.entries[id];
      var local = vault[id] && vault[id].cur;
      if (e && !e.present && (!local || local.version < e.version)) {
        setSyncNote("A newer " + syncName(id) + " capsule (version " + e.version + ") exists in your other browser. It was too large to ride browser sync; open that browser, or carry the capsule file, to move it.");
      }
    });
  });
}

function mergeSyncedVault(incoming, meta, done) {
  readVault(function (vault) {
    readSyncBase(function (base) {
      var newVault = Object.assign({}, vault);
      var newBase = Object.assign({}, base);
      var notes = [], folds = {};
      Object.keys(incoming).forEach(function (id) {
        var inc = incoming[id] && incoming[id].cur;
        if (!inc) { return; }
        var local = vault[id] && vault[id].cur;
        var b = base[id] || 0;
        if (!local) {
          newVault[id] = { cur: inc, prev: null };
          newBase[id] = inc.version;
          notes.push("Imported your " + syncName(id) + " capsule (version " + inc.version + ") from browser sync.");
          return;
        }
        if (inc.version === local.version && JSON.stringify(inc.hashes) === JSON.stringify(local.hashes)) {
          newBase[id] = inc.version;
          return;
        }
        if (inc.version > local.version && local.version === b) {
          newVault[id] = { cur: inc, prev: { text: local.text, version: local.version, ts: local.ts } };
          newBase[id] = inc.version;
          notes.push("Updated your " + syncName(id) + " capsule to version " + inc.version + " from browser sync.");
          return;
        }
        // Both sides moved (or same version, different content):
        // the newest governs and the other folds underneath.
        if ((inc.ts || 0) > (local.ts || 0)) {
          newVault[id] = { cur: inc, prev: { text: local.text, version: local.version, ts: local.ts } };
          newBase[id] = inc.version;
          folds[id] = { winner: "theirs", winnerVersion: inc.version, foldedVersion: local.version, ts: Date.now() };
          notes.push("Browser sync kept the newer " + syncName(id) + " capsule (version " + inc.version + ", from your other browser); this browser's version " + local.version + " is folded underneath it, not deleted.");
        } else if ((inc.ts || 0) < (local.ts || 0)) {
          newBase[id] = local.version;
          folds[id] = { winner: "ours", winnerVersion: local.version, foldedVersion: inc.version, ts: Date.now() };
          notes.push("Browser sync kept this browser's newer " + syncName(id) + " capsule (version " + local.version + "); the other browser's version " + inc.version + " folds underneath on its next sync.");
        }
      });
      var finished = false;
      function finish() {
        if (finished) { return; }
        finished = true;
        if (notes.length) { setSyncNote(notes.join(" ")); }
        if (Object.keys(folds).length) {
          try { chrome.storage.local.set(vaultPatch(SYNCCONF_KEY, folds)); } catch (e) {}
        }
        if (done) { done(); }
      }
      try { chrome.storage.local.set(vaultPatch(SYNCBASE_KEY, newBase)); } catch (e) {}
      if (JSON.stringify(newVault) !== JSON.stringify(vault)) {
        try { chrome.storage.local.set(vaultPatch(VAULT_KEY, newVault), finish); } catch (e) { finish(); }
        setTimeout(finish, 500);
      } else { finish(); }
    });
  });
}

// ------------------------------------------------------------------
// Finding the chat message box. We look for the visible text input
// that sits lowest on the page (chat boxes live at the bottom).
// ------------------------------------------------------------------
function findComposer() {
  var candidates = document.querySelectorAll('textarea, [contenteditable="true"]');
  var best = null, bestTop = -1, fallback = null;
  candidates.forEach(function (el) {
    if (!fallback) { fallback = el; }
    var r = el.getBoundingClientRect();
    var visible = r.width > 40 && r.height > 10;
    if (visible && r.top > bestTop) { best = el; bestTop = r.top; }
  });
  return best || fallback;
}

function fillComposer(text) {
  var box = findComposer();
  if (!box) { return false; }
  box.focus();
  if (box.tagName === "TEXTAREA") {
    var setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
    setter.call(box, text);
    box.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }
  // Contenteditable boxes (Claude, Gemini): select all, then insert,
  // which is the same thing your own paste would do.
  var sel = window.getSelection();
  var range = document.createRange();
  range.selectNodeContents(box);
  sel.removeAllRanges();
  sel.addRange(range);
  document.execCommand("insertText", false, text);
  return box.innerText.indexOf("clonemy.ai/extract") !== -1;
}

// ------------------------------------------------------------------
// Finding the self-report on the page. We score visible text blocks
// by how many of the 11 section titles (or numbered section headers)
// they contain, and keep the strongest one. Code blocks win ties:
// when an AI returns the report as one code block, its raw text is
// the cleanest copy.
// ------------------------------------------------------------------
// The extraction instructions themselves contain all 11 section
// titles, so when a user pastes them into a chat (the by-hand route,
// forced on Perplexity, live test 2026-10-31), the pasted template
// is the most report-shaped block on the page and the finder used to
// compile the questions instead of the answers. These marker lines
// appear in the instructions and never in a genuine report, so any
// block containing one is the template and is disqualified.
var TEMPLATE_MARKERS = [
  "Send this file to your current AI",
  "How to use (for you, the human)",
  "clonemy.ai extraction request in plain text",
  // The sliced fill (v0.5.11) omits the human header above, so
  // the sent shebang carries none of those three lines; these
  // two, from the AI instructions themselves, keep the echo
  // recognizable as the template. A genuine report is the
  // answers, and never opens with the instructions' own title
  // or its first sentence. The second marker tracks the
  // document's opening line: it was "You are being asked to
  // write a structured self-report" until the v0.5.12 reframe
  // put the document in the user's first-person voice. The
  // title marker tracks the document's title line, renamed
  // in v0.5.12 to speak as the owner ("MY ai"); the old title
  // stays in the list so echoes of older copies of the
  // document (a downloaded file from before the rename) are
  // still recognized as the template.
  "# Instructions for MY ai",
  "# Instructions for the AI reading this",
  "I am moving to a new AI, and I want to take us with me"
];

function isTemplate(t) {
  for (var i = 0; i < TEMPLATE_MARKERS.length; i++) {
    if (t.indexOf(TEMPLATE_MARKERS[i]) !== -1) { return true; }
  }
  return false;
}

// Small cleanups on the winning block's text, each learned from a
// live test on 2026-10-31:
// - Code views (Claude's artifact in code mode) leak their line
//   numbers into the text as lines that are only digits. When a
//   text carries many of them (a code view signature), drop them.
// - Chat pages glue their own furniture to the tail of the last
//   section (AI mistake disclaimers, "file is ready" lines, stray
//   buttons). Trim known furniture lines from the very end only.
// - Some furniture lines are dropped wherever they appear
//   (CHROME_ANYWHERE). Learned from a live ChatGPT compile on
//   2026-11-01 (v0.1.6): the tail trim only pops while EVERY
//   trailing line matches, and one unmatched furniture line
//   ("Try Plus free") shielded the whole block above it, which
//   then landed inside section 10 of the finished capsule. The
//   anywhere list holds interface text that is never report
//   content, so dropping it on sight cannot eat a real line.
var CHROME_TAIL = [
  /can make mistakes/i,
  /is AI and can make mistakes/i,
  /^Edit directly or with Gemini$/i,
  /^The file .+ is ready for download\.?$/i,
  /^Latest response$/i,
  /^Think$/i,
  /^Document$/i,
  /^capsule-source\.md$/i
];

var CHROME_ANYWHERE = [
  /can make mistakes/i,
  /^Latest response$/i,
  /^Try Plus free$/i,
  /^Improve accuracy for documents and research$/i,
  /^Upgrade to Plus and use increased reasoning/i,
  /^capsule-source\.md$/i,
  // Live capture, v0.1.8 spot-check on ChatGPT, 2026-11-02: the
  // winning page block was the whole conversation column, whose
  // text runs past the report into the code block's language
  // label, the file chip, and a Pro upsell banner for "Astra"
  // that did not exist in the 2026-11-01 captures. Same shield
  // pattern as v0.1.6, new furniture. The chip's "Document" line
  // is promoted here from the tail list, and Perplexity's chip
  // reads "capsule-source" without the extension.
  /^Markdown$/i,
  /^Document$/i,
  /^capsule-source$/i,
  /Bring Astra to your most demanding work/i,
  /Upgrade to Pro for full access to Astra/i
];

function cleanReportText(t) {
  var lines = t.split("\n");
  var digitLines = 0;
  lines.forEach(function (ln) { if (/^\s*\d{1,4}\s*$/.test(ln)) { digitLines++; } });
  if (digitLines >= 5) {
    lines = lines.filter(function (ln) { return !/^\s*\d{1,4}\s*$/.test(ln); });
  }
  lines = lines.filter(function (ln) {
    var t = ln.trim();
    for (var i = 0; i < CHROME_ANYWHERE.length; i++) {
      if (CHROME_ANYWHERE[i].test(t)) { return false; }
    }
    return true;
  });
  while (lines.length) {
    var last = lines[lines.length - 1].trim();
    if (!last) { lines.pop(); continue; }
    var chrome = false;
    for (var i = 0; i < CHROME_TAIL.length; i++) {
      if (CHROME_TAIL[i].test(last)) { chrome = true; break; }
    }
    if (!chrome) { break; }
    lines.pop();
  }
  return lines.join("\n");
}

function scoreText(t) {
  if (!t || t.length < 200) { return 0; }
  var hits = 0;
  for (var i = 0; i < SECTION_TITLES.length; i++) {
    if (t.indexOf(SECTION_TITLES[i]) !== -1) { hits++; }
  }
  if (t.indexOf("About this report") === -1 && /(^|\n)\s{0,3}#{0,4}\s*0[.)]?\s+Meta\b/.test(t)) { hits++; }
  var numbered = (t.match(/(^|\n)\s{0,3}#{1,4}\s*\d{1,2}[.)]?\s/g) || []).length;
  return Math.max(hits, Math.min(numbered, 11));
}

// Read a block's full text from its DOM text nodes, in order, with
// a newline at each block-level boundary. innerText only returns
// what the host has actually painted: on pages that paint lazily
// (content-visibility, collapsed panes), the unpainted half of a
// long answer is invisible to it, so Compile used to light up only
// after the user scrolled the text block to the bottom (Tony, live
// on Muse, 2026-11-04; the same window effect was seen on Claude's
// document pane on 2026-10-31). Text nodes are all in the DOM
// whether painted or not, so walking them sees the whole answer
// at once. Chrome subtrees (buttons, scripts, hidden nodes) are
// skipped; the cleaner below strips any furniture lines that
// still slip through.
var CMAI_BLOCK_TAGS = { DIV: 1, P: 1, LI: 1, UL: 1, OL: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, PRE: 1, BLOCKQUOTE: 1, TR: 1, TABLE: 1, SECTION: 1, ARTICLE: 1, MAIN: 1, HEADER: 1, FOOTER: 1 };
var CMAI_SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, SVG: 1, BUTTON: 1, TEXTAREA: 1, SELECT: 1, INPUT: 1, IMG: 1 };
function cmaiWalkText(node, out) {
  if (node.nodeType === 3) { out.push(node.nodeValue); return; }
  if (node.nodeType !== 1) { return; }
  var tag = node.tagName;
  if (CMAI_SKIP_TAGS[tag]) { return; }
  if (node.hidden) { return; }
  if (node.getAttribute && node.getAttribute("aria-hidden") === "true") { return; }
  if (tag === "BR" || tag === "HR") { out.push("\n"); return; }
  var block = !!CMAI_BLOCK_TAGS[tag];
  if (block) { out.push("\n"); }
  var kids = node.childNodes;
  for (var i = 0; i < kids.length; i++) { cmaiWalkText(kids[i], out); }
  if (block) { out.push("\n"); }
}
function blockText(el) {
  if (el.tagName === "PRE" || el.tagName === "CODE") { return el.textContent || ""; }
  var out = [];
  cmaiWalkText(el, out);
  var walked = out.join("").replace(/\n{3,}/g, "\n\n");
  var inner = "";
  try { inner = el.innerText || ""; } catch (e) { inner = ""; }
  // Trust the walk; fall back to innerText only if it plainly
  // saw much more than the walk did (an exotic host layout).
  if (!walked || (inner && inner.length > walked.length * 1.25)) { return inner; }
  return walked;
}

function findReport() {
  var blocks = document.querySelectorAll("pre, code, [data-message-author-role], model-response, .markdown, .prose, article, main");
  var best = null, bestScore = 0, bestLen = 0, templateSeen = false;
  blocks.forEach(function (el) {
    var t = blockText(el);
    if (!t) { return; }
    var s = scoreText(t);
    if (isTemplate(t)) {
      if (s >= 6) { templateSeen = true; }
      return;
    }
    if (s > bestScore || (s === bestScore && t.length > bestLen)) {
      best = t; bestScore = s; bestLen = t.length;
    }
  });
  if (bestScore >= 6) { return { text: cleanReportText(best), sections: bestScore }; }
  if (templateSeen) { return { template: true }; }
  return null;
}

// The strongest partial signal on the page: how many of the 11
// section headings the best non-template block holds so far.
// Used only for the status line, so a user waiting on a streaming
// answer can see the watcher counting instead of a grey button.
function partialScore() {
  var blocks = document.querySelectorAll("pre, code, [data-message-author-role], model-response, .markdown, .prose, article, main");
  var best = 0;
  blocks.forEach(function (el) {
    var t = blockText(el);
    if (!t || isTemplate(t)) { return; }
    var s = scoreText(t);
    if (s > best) { best = s; }
  });
  return best;
}

// The same block set findReport and partialScore read, as raw
// texts. The recall grading (v0.5.11) reads the page through
// this so its view of a reply is the watcher's view.
function pageBlocks() {
  var blocks = document.querySelectorAll("pre, code, [data-message-author-role], model-response, .markdown, .prose, article, main");
  var out = [];
  blocks.forEach(function (el) {
    var t = blockText(el);
    if (t) { out.push(t); }
  });
  return out;
}

// partialScore for one text instead of the whole page.
function partialScoreOf(text) {
  if (!text || isTemplate(text)) { return 0; }
  return scoreText(text);
}

// Collapse every run of whitespace to one space, trim, cap.
// Block texts are compared and hashed through this, so a host
// re-rendering the same message with different line breaks does
// not make it look new.
function normText(t) {
  return String(t || "").replace(/\s+/g, " ").trim().slice(0, 20000);
}
function hashText(t) {
  var h = 5381;
  for (var i = 0; i < t.length; i++) { h = ((h << 5) + h + t.charCodeAt(i)) | 0; }
  return t.length + ":" + h;
}

// ------------------------------------------------------------------
// The bar itself: two buttons and a status line, top-right corner.
// ------------------------------------------------------------------
function download(filename, text) {
  var blob = new Blob([text], { type: "text/markdown" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
}

// ------------------------------------------------------------------
// Bar theme: the bar follows the host page's own mode. The dark
// palette is the original shipped look, value for value. The light
// palette is its sibling in the deepened ECR colors, for hosts
// running in light mode. Detection order: the host's declared
// color-scheme first, then the OS/browser preference, then the
// brightness of the page's own background as the tiebreak.
// ------------------------------------------------------------------
var CMAI_THEMES = {
  dark: {
    bar: "background:#10101c;color:#eaf2ff;border:1px solid rgba(140,150,255,.45);box-shadow:0 8px 30px rgba(0,0,0,.45)",
    chip: "border:1px solid rgba(140,150,255,.3);background:rgba(255,255,255,.05);color:#eaf2ff",
    fill: "border:1px solid rgba(55,200,232,.55);background:rgba(123,108,255,.16);color:#eaf2ff",
    compile: "border:1px solid rgba(140,150,255,.3);background:rgba(255,255,255,.05);color:#eaf2ff",
    ready: "background:linear-gradient(90deg,#7b6cff,#37c8e8 55%,#ff5da2)!important;color:#0b0b14!important;border:1px solid #ffffff!important;box-shadow:0 0 14px rgba(123,108,255,.85),0 0 4px rgba(255,93,162,.7);opacity:1!important",
    readyBright: "background:linear-gradient(90deg,#7b6cff,#37c8e8 55%,#ff5da2);color:#0b0b14;border:1px solid #ffffff;box-shadow:0 0 22px rgba(123,108,255,.95),0 0 10px rgba(255,93,162,.85),inset 0 1px 0 rgba(255,255,255,.65)",
    line: "rgba(140,150,255,.18)"
  },
  light: {
    bar: "background:#f7f7fd;color:#17171f;border:1px solid rgba(90,72,224,.45);box-shadow:0 8px 30px rgba(30,20,80,.18)",
    chip: "border:1px solid rgba(90,72,224,.3);background:rgba(23,23,31,.05);color:#17171f",
    fill: "border:1px solid rgba(14,127,168,.55);background:rgba(90,72,224,.12);color:#17171f",
    compile: "border:1px solid rgba(90,72,224,.3);background:rgba(23,23,31,.05);color:#17171f",
    ready: "background:linear-gradient(90deg,#5a48e0,#0e7fa8 55%,#e03d86)!important;color:#ffffff!important;border:1px solid #5a48e0!important;box-shadow:0 0 14px rgba(90,72,224,.55),0 0 4px rgba(224,61,134,.5);opacity:1!important",
    readyBright: "background:linear-gradient(90deg,#5a48e0,#0e7fa8 55%,#e03d86);color:#ffffff;border:1px solid #5a48e0;box-shadow:0 0 22px rgba(90,72,224,.7),0 0 10px rgba(224,61,134,.65),inset 0 1px 0 rgba(255,255,255,.5)",
    line: "rgba(90,72,224,.25)"
  }
};

function cmaiPageTheme() {
  // v0.5.8: the bar defaults to light. Only positive evidence of a
  // dark page resolves to dark: the page's own color-scheme
  // declaring dark alone, or a measurable body background whose
  // luminance is at most 0.6. The visitor's OS preference alone
  // never resolves to dark any more, and an unmeasurable page
  // falls through to light.
  try {
    var cs = window.getComputedStyle(document.documentElement).colorScheme || "";
    var hasLight = cs.indexOf("light") !== -1, hasDark = cs.indexOf("dark") !== -1;
    if (hasLight && !hasDark) { return "light"; }
    if (hasDark && !hasLight) { return "dark"; }
  } catch (e) {}
  try {
    var bg = window.getComputedStyle(document.body || document.documentElement).backgroundColor;
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(bg || "");
    if (m && m[4] !== "0") {
      var lum = (0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3]) / 255;
      return lum > 0.6 ? "light" : "dark";
    }
  } catch (e) {}
  return "light";
}

function buildBar(platform) {
  // The ready state for the Compile button: once a self-report is
  // found, the button must look unmistakably pressable, not just
  // slightly less grey. A style tag carries the glow and pulse,
  // because inline styles cannot animate. One ready rule per theme,
  // scoped to the bar's data-theme attribute.
  var styleTag = document.createElement("style");
  styleTag.textContent =
    '#clonemy-bar[data-theme="dark"] #cmai-compile.cmai-ready{' + CMAI_THEMES.dark.ready + ";animation:cmai-pulse 1.6s ease-in-out infinite}" +
    '#clonemy-bar[data-theme="light"] #cmai-compile.cmai-ready{' + CMAI_THEMES.light.ready + ";animation:cmai-pulse 1.6s ease-in-out infinite}" +
    "@keyframes cmai-pulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.25)}}" +
    "#cmai-status.cmai-scan{animation:cmai-scanpulse 1.1s ease-in-out infinite}" +
    "@keyframes cmai-scanpulse{0%,100%{opacity:.5}50%{opacity:1}}";
  document.head.appendChild(styleTag);

  var currentTheme = cmaiPageTheme();
  var theme = CMAI_THEMES[currentTheme];
  var btnGeo = "display:block;width:100%;margin:4px 0;padding:7px 9px;border-radius:8px;";

  var bar = document.createElement("div");
  bar.id = "clonemy-bar";
  bar.setAttribute("data-theme", currentTheme);
  bar.style.cssText = "position:fixed;top:14px;right:14px;z-index:2147483647;border-radius:12px;padding:10px 12px;font:13px/1.45 -apple-system,'Segoe UI',Roboto,sans-serif;max-width:300px;" + theme.bar;
  bar.innerHTML =
    '<div style="display:flex;align-items:flex-start;margin-bottom:6px"><div style="font-weight:800;flex:1">clonemy.ai <span style="opacity:.65;font-weight:600">on ' + platform.name + '</span></div>' +
    '<button id="cmai-collapse" type="button" title="Shrink or expand the bar" style="' + theme.chip + ';border-radius:6px;width:22px;height:22px;line-height:1;cursor:pointer;font-weight:700;padding:0">\u2013</button>' +
    '<button id="cmai-close" type="button" title="Close the bar (it comes back when you reload the page)" style="' + theme.chip + ';border-radius:6px;width:22px;height:22px;line-height:1;cursor:pointer;font-weight:700;padding:0;margin-left:5px">\u2715</button></div>' +
    '<div id="cmai-hint" style="display:none;margin:2px 0 4px;font-weight:700"></div>' +
    '<div id="cmai-body">' +
    '<button id="cmai-fill" type="button" style="' + btnGeo + theme.fill + ';font-weight:700;cursor:pointer">Step 1. Prime and extract</button>' +
    '<button id="cmai-compile" type="button" disabled style="' + btnGeo + theme.compile + ';font-weight:700;cursor:pointer;opacity:.45">Step 2. Compile my capsule</button>' +
    '<div id="cmai-status" style="opacity:.8;margin-top:5px">The request goes in the box. You press send, always.</div>' +
    '<div id="cmai-deliver" style="display:none;margin-top:7px;padding-top:7px"></div>' +
    '</div>';
  document.body.appendChild(bar);

  // The bar sits top-right, like the shopping extensions (Tony,
  // 2026-11-04): bottom-right kept covering the message box and
  // send button on chat pages. It can still shrink to just its
  // title row and get out of the way.
  var collapsed = false;
  var collapseBtn = bar.querySelector("#cmai-collapse");
  var barBody = bar.querySelector("#cmai-body");
  var hintEl = bar.querySelector("#cmai-hint");
  // The collapsed hint is the bar's second face: while the bar is
  // shrunk, #cmai-body (and its status line) is hidden, so the hint
  // is all the user can see. Since v0.5.9 it is state, not a
  // one-shot label passed at collapse time: collapsing at any
  // moment shows the current face text, and the watcher updates it
  // live while collapsed. Before, the hint froze at whatever the
  // last collapse call passed, so after the user pressed Send the
  // shrunk bar kept saying "press Send" for the whole wait (Tony,
  // live on Gemini, 2026-11-08).
  var hintState = "";
  function renderHint() {
    if (collapsed && hintState) { hintEl.textContent = hintState; hintEl.style.display = "block"; }
    else { hintEl.style.display = "none"; hintEl.textContent = ""; }
  }
  function setHint(text) {
    if (hintState === text) { return; }
    hintState = text;
    renderHint();
  }
  function setCollapsed(v, hintText) {
    if (typeof hintText === "string") { hintState = hintText; }
    collapsed = v;
    barBody.style.display = collapsed ? "none" : "block";
    collapseBtn.textContent = collapsed ? "+" : "\u2013";
    bar.style.padding = collapsed ? "6px 10px" : "10px 12px";
    renderHint();
  }
  collapseBtn.addEventListener("click", function () { setCollapsed(!collapsed); });

  // Close takes the bar off this page entirely (Tony, 2026-11-04:
  // a close button beside the minimize button). Nothing is stored
  // or lost: the vault and any pending capsule live in extension
  // storage, the watcher goes quiet via barGone, and the bar
  // rebuilds on the next page load.
  var barGone = false;
  var closeBtn = bar.querySelector("#cmai-close");
  closeBtn.addEventListener("click", function () {
    barGone = true;
    bar.remove();
  });

  // If the host flips mode mid-session, re-apply the palette. Only
  // style attributes change here, so the bar's state (collapsed or
  // not, a found report, button labels) is never disturbed.
  function applyTheme(name) {
    var t = CMAI_THEMES[name];
    bar.setAttribute("data-theme", name);
    bar.style.cssText = "position:fixed;top:14px;right:14px;z-index:2147483647;border-radius:12px;font:13px/1.45 -apple-system,'Segoe UI',Roboto,sans-serif;max-width:300px;" + t.bar;
    bar.style.padding = collapsed ? "6px 10px" : "10px 12px";
    collapseBtn.setAttribute("style", t.chip + ";border-radius:6px;width:22px;height:22px;line-height:1;cursor:pointer;font-weight:700;padding:0");
    closeBtn.setAttribute("style", t.chip + ";border-radius:6px;width:22px;height:22px;line-height:1;cursor:pointer;font-weight:700;padding:0;margin-left:5px");
    bar.querySelector("#cmai-fill").setAttribute("style", btnGeo + t.fill + ";font-weight:700;cursor:pointer");
    bar.querySelector("#cmai-compile").setAttribute("style", btnGeo + t.compile + ";font-weight:700;cursor:pointer;opacity:.45");
    if (deliverMode) { renderDeliver(deliverMode, deliverData, deliverNote); }
  }
  var themeTimer = null;
  function refreshTheme() {
    var next = cmaiPageTheme();
    if (next !== currentTheme) { currentTheme = next; applyTheme(next); }
  }
  try {
    var mqLight = window.matchMedia("(prefers-color-scheme: light)");
    if (mqLight.addEventListener) { mqLight.addEventListener("change", refreshTheme); }
    else if (mqLight.addListener) { mqLight.addListener(refreshTheme); }
  } catch (e) {}
  var themeObserver = new MutationObserver(function () {
    clearTimeout(themeTimer);
    themeTimer = setTimeout(refreshTheme, 250);
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "data-color-scheme", "style"] });

  var status = bar.querySelector("#cmai-status");
  var compileBtn = bar.querySelector("#cmai-compile");
  var found = null;

  // Collapsed-face state for the extraction flow (v0.5.9). Once
  // Step 1 puts the request in the box, the watcher drives the
  // collapsed hint from the same evidence as the status line:
  // press Send, then waiting (with the section count as it grows),
  // then ready. watching is set by the Step 1 handler; sentSeen
  // latches when the box no longer holds the request; answerSeen
  // latches when report evidence (a partial count, the template,
  // a spotted report) has appeared since the fill.
  var watching = false;
  var sentSeen = false;
  var answerSeen = false;
  var goneScans = 0;
  var TEMPLATE_HINT = "That is the instructions text, not the report.";
  var READY_HINT = "Self-report found: press Compile.";

  // Merged-intake state (v0.5.11). One object per Step 1 fill:
  // the jog line as last read from the box or the rendered sent
  // message, whether the slot was edited away from the example,
  // a baseline of the page at fill time, and the recall grade
  // once the reply's head has been read. The grade and the
  // yield are separate signals: warned latches only when the
  // yield agrees the source is empty.
  var intake = null;
  var COLD_STATUS = "This AI holds nothing about you yet. Compiling now would make an empty capsule.";
  var COLD_HINT = "This AI holds nothing about you yet.";
  function coldActive() { return !!(intake && intake.warned && !found); }

  // Delivery row (Phase 3): under the status line, it appears when
  // this tab compiles a capsule (source side: take-it-to links) or
  // when a fresh pending capsule is waiting (target side: the
  // install button). Hidden the rest of the time.
  var deliverRow = bar.querySelector("#cmai-deliver");
  var deliverMode = null, deliverData = null, deliverNote = null;
  var currentOffer = null; // the capsule the target row would install
  var CMAI_TARGETS = [
    { name: "ChatGPT", url: "https://chatgpt.com/" },
    { name: "Claude", url: "https://claude.ai/" },
    { name: "Gemini", url: "https://gemini.google.com/" },
    { name: "Grok", url: "https://grok.com/" },
    { name: "Perplexity", url: "https://www.perplexity.ai/" },
    { name: "Muse", url: "https://muse.ai/" },
    { name: "Meta AI", url: "https://www.meta.ai/" }
  ];
  // Platform glyphs, copied from the website's own buttons so a
  // capsule's destinations read as buttons here too, not as a line
  // of text links (Tony, 2026-11-04: "I had no idea the buttons
  // were clickable"). Gradient ids are prefixed cmai- so they can
  // never collide with a host page's own defs.
  var CMAI_TARGET_ICONS = {
    "ChatGPT": '<svg width="20" height="20" viewBox="0 0 24 24" fill="#10a37f" aria-hidden="true"><g><path d="M12 2.8c1.7 2.1 1.7 4.9 0 6.9-1.7-2-1.7-4.8 0-6.9z"/><path d="M12 2.8c1.7 2.1 1.7 4.9 0 6.9-1.7-2-1.7-4.8 0-6.9z" transform="rotate(60 12 12)"/><path d="M12 2.8c1.7 2.1 1.7 4.9 0 6.9-1.7-2-1.7-4.8 0-6.9z" transform="rotate(120 12 12)"/><path d="M12 2.8c1.7 2.1 1.7 4.9 0 6.9-1.7-2-1.7-4.8 0-6.9z" transform="rotate(180 12 12)"/><path d="M12 2.8c1.7 2.1 1.7 4.9 0 6.9-1.7-2-1.7-4.8 0-6.9z" transform="rotate(240 12 12)"/><path d="M12 2.8c1.7 2.1 1.7 4.9 0 6.9-1.7-2-1.7-4.8 0-6.9z" transform="rotate(300 12 12)"/></g></svg>',
    "Claude": '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97757" stroke-width="2.3" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="2.1" fill="#d97757" stroke="none"/><line x1="16.6" y1="12.0" x2="20.4" y2="12.0"/><line x1="16.0" y1="14.3" x2="18.1" y2="15.5"/><line x1="14.3" y1="16.0" x2="16.2" y2="19.3"/><line x1="12.0" y1="16.6" x2="12.0" y2="19.0"/><line x1="9.7" y1="16.0" x2="7.8" y2="19.3"/><line x1="8.0" y1="14.3" x2="5.9" y2="15.5"/><line x1="7.4" y1="12.0" x2="3.6" y2="12.0"/><line x1="8.0" y1="9.7" x2="5.9" y2="8.5"/><line x1="9.7" y1="8.0" x2="7.8" y2="4.7"/><line x1="12.0" y1="7.4" x2="12.0" y2="5.0"/><line x1="14.3" y1="8.0" x2="16.2" y2="4.7"/><line x1="16.0" y1="9.7" x2="18.1" y2="8.5"/></svg>',
    "Gemini": '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="cmaiGemGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#4796e3"/><stop offset=".55" stop-color="#9177c7"/><stop offset="1" stop-color="#d96570"/></linearGradient></defs><path d="M12 2.2l2.1 7.7 7.7 2.1-7.7 2.1L12 21.8l-2.1-7.7-7.7-2.1 7.7-2.1z" fill="url(#cmaiGemGrad)"/></svg>',
    "Grok": '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="8.4"/><line x1="6.2" y1="17.8" x2="17.8" y2="6.2"/></svg>',
    "Perplexity": '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#20808d" stroke-width="1.9" stroke-linejoin="round" aria-hidden="true"><path d="M5 19.5v-13L12 3l7 3.5v13l-7-3.4z"/><path d="M12 3v13.1"/><path d="M5.2 10l6.8 3.2 6.8-3.2"/></svg>',
    "Muse": '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="cmaiMuseGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0082fb"/><stop offset=".55" stop-color="#a033ff"/><stop offset="1" stop-color="#ff5280"/></linearGradient></defs><path d="M12 2.2l2.1 7.7 7.7 2.1-7.7 2.1L12 21.8l-2.1-7.7-7.7-2.1 7.7-2.1z" fill="url(#cmaiMuseGrad)"/></svg>',
    "Meta AI": '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><defs><linearGradient id="cmaiMetaGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0082fb"/><stop offset=".55" stop-color="#a033ff"/><stop offset="1" stop-color="#ff5280"/></linearGradient></defs><path d="M12 12c-3-5.4-8.5-5.1-8.5 0s5.5 5.4 8.5 0c3-5.4 8.5-5.1 8.5 0s-5.5 5.4-8.5 0z" stroke="url(#cmaiMetaGrad)"/></svg>'
  };
  // Door consolidation (v0.5.15, Tony 2026-11-09): seven stacked
  // door buttons become one primary door plus a "More destinations"
  // dropdown. The primary is the best guess, and the guess rule is
  // Tony's: the last door this user actually took, remembered per
  // source host first and globally second, and NEVER the host the
  // capsule was compiled on (you do not transfer out of a place
  // back into itself). With no history, the starter guess is
  // Claude, or ChatGPT when the source is Claude itself.
  var LASTDOOR_KEY = "cmai_lastdoor";
  var lastDoorCache = { byHost: {}, any: null };
  try {
    chrome.storage.local.get([LASTDOOR_KEY], function (d) {
      var v = d && d[LASTDOOR_KEY];
      if (v) { lastDoorCache = { byHost: v.byHost || {}, any: v.any || null }; }
    });
  } catch (e) {}
  function isTargetName(name) {
    for (var i = 0; i < CMAI_TARGETS.length; i++) { if (CMAI_TARGETS[i].name === name) { return true; } }
    return false;
  }
  function recordLastDoor(name) {
    if (!isTargetName(name)) { return; }
    lastDoorCache.any = name;
    if (platform) { lastDoorCache.byHost[platform.id] = name; }
    try { chrome.storage.local.set({ cmai_lastdoor: lastDoorCache }); } catch (e) {}
  }
  function bestDoorName() {
    var mine = platform ? platform.name : null;
    var cand = null;
    if (platform && lastDoorCache.byHost) { cand = lastDoorCache.byHost[platform.id] || null; }
    if (!cand) { cand = lastDoorCache.any || null; }
    if (cand && cand !== mine && isTargetName(cand)) { return cand; }
    return mine === "Claude" ? "ChatGPT" : "Claude";
  }
  function targetButtons(t) {
    var row = "display:flex;align-items:center;gap:9px;width:100%;box-sizing:border-box;margin:4px 0;padding:6px 9px;border-radius:8px;font-weight:700;cursor:pointer;text-decoration:none;color:inherit;";
    var chip = function (x) {
      return '<a data-cmai-dest="' + x.name + '" href="' + x.url + '" target="_blank" rel="noopener" style="' + row + t.chip + '">' + (CMAI_TARGET_ICONS[x.name] || "") + "<span>" + x.name + "</span></a>";
    };
    var best = bestDoorName();
    var primary = null, rest = [];
    CMAI_TARGETS.forEach(function (x) { if (x.name === best) { primary = x; } else { rest.push(x); } });
    var btnRow = "display:block;width:100%;box-sizing:border-box;margin:4px 0;padding:6px 9px;border-radius:8px;font-weight:700;cursor:pointer;text-align:left;";
    return chip(primary) +
      '<button class="cmai-more-btn" type="button" style="' + btnRow + t.chip + '">More destinations ▾</button>' +
      '<div class="cmai-more" style="display:none">' + rest.map(chip).join("") + "</div>";
  }
  function renderDeliver(mode, data, note) {
    deliverMode = mode;
    deliverData = data || null;
    deliverNote = note || null;
    currentOffer = (mode === "target") ? (data || null) : null;
    if (!mode) { deliverRow.style.display = "none"; deliverRow.innerHTML = ""; return; }
    var t = CMAI_THEMES[currentTheme];
    deliverRow.style.display = "block";
    deliverRow.style.borderTop = "1px solid " + t.line;
    var btn = "display:block;width:100%;margin:4px 0;padding:6px 9px;border-radius:8px;font-weight:700;cursor:pointer;";
    if (mode === "done") {
      deliverRow.innerHTML =
        "<div>The capsule is in the chat box. Now press <b>Send</b> in the chat to install it here.</div>" +
        '<button id="cmai-done" type="button" style="' + btn + t.chip + '">Done</button>' +
        "<div style=\"margin-top:6px\">Or take this capsule to another AI:</div>" +
        '<div style="margin:4px 0">' + targetButtons(t) + "</div>";
    } else if (mode === "source") {
      deliverRow.innerHTML =
        (data.vaultNote ? "<div>" + data.vaultNote + "</div>" : "") +
        "<div>Capsule ready to deliver. Take it to:</div>" +
        '<div style="margin:4px 0">' + targetButtons(t) + "</div>" +
        '<button id="cmai-discard" type="button" style="' + btn + t.chip + '">Discard the pending capsule</button>' +
        '<button id="cmai-forget" type="button" style="' + btn + t.chip + '">Forget the saved ' + (data.fromName || "capsule") + " capsule</button>";
    } else {
      var when = new Date(data.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      var head = deliverNote || ("Your capsule is here: " + data.found + " of 12 sections, flavor " + data.flavor + ", compiled " + when + ".");
      var dismissBtn = data.fromVault
        ? '<button id="cmai-notnow" type="button" style="' + btn + t.chip + '">Not now</button>'
        : '<button id="cmai-discard" type="button" style="' + btn + t.chip + '">Discard</button>';
      deliverRow.innerHTML =
        "<div>" + head + "</div>" +
        '<button id="cmai-install" type="button" style="' + btn + t.readyBright + '">Put it in the chat</button>' +
        dismissBtn;
    }
  }
  deliverRow.addEventListener("click", function (e) {
    var moreBtn = e.target && e.target.closest ? e.target.closest(".cmai-more-btn") : null;
    if (moreBtn) {
      var moreBox = deliverRow.querySelector(".cmai-more");
      if (moreBox) {
        var opening = moreBox.style.display === "none";
        moreBox.style.display = opening ? "block" : "none";
        moreBtn.textContent = opening ? "More destinations ▴" : "More destinations ▾";
      }
      return;
    }
    var destLink = e.target && e.target.closest ? e.target.closest("a[data-cmai-dest]") : null;
    if (destLink) { recordLastDoor(destLink.getAttribute("data-cmai-dest")); }
    if (e.target.id === "cmai-done") {
      refreshDeliver();
    } else if (e.target.id === "cmai-forget") {
      forgetVault(platform.id, function () {});
      readPending(function (p) { if (p && p.from === platform.id) { clearPending(); } });
      renderDeliver(null);
      status.textContent = "Saved " + platform.name + " capsule forgotten. The vault no longer holds it.";
    } else if (e.target.id === "cmai-discard") {
      clearPending();
      renderDeliver(null);
      status.textContent = "Pending capsule discarded.";
    } else if (e.target.id === "cmai-notnow") {
      // A vault offer is a staleness flag, not a thing to destroy:
      // hiding it changes nothing, and the bar offers it again on
      // the next visit until the update is installed.
      renderDeliver(null);
      status.textContent = "Update left for later. Nothing was changed.";
    } else if (e.target.id === "cmai-install") {
      var doInstall = function (offer) {
        if (!offer) {
          renderDeliver(null);
          status.textContent = "That capsule is gone (discarded or expired). Compile again on the other tab.";
          return;
        }
        if (fillComposer(offer.text)) {
          if (offer.from && offer.version) { recordDelivered(platform.id, offer.from, offer.version, offer.hashes); }
          status.textContent = "Capsule is in the box, install line first. Press send to install it here.";
          renderDeliver("done", offer, deliverNote);
          setCollapsed(true, "Capsule is in the box: press Send in the chat.");
        } else {
          status.textContent = "Could not find the message box. Click into it, then try again.";
        }
      };
      if (currentOffer && currentOffer.text) { doInstall(currentOffer); }
      else { readPending(doInstall); }
    }
  });
  function platformName(id) {
    for (var i = 0; i < PLATFORMS.length; i++) { if (PLATFORMS[i].id === id) { return PLATFORMS[i].name; } }
    return id;
  }
  function dayLabel(ts) {
    return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
  }
  function refreshDeliver() {
    readPending(function (p) {
      if (deliverMode === "source") { return; }
      if (p) {
        readDelivered(function (all) {
          var note = null;
          var rec = (all[platform.id] || {})[p.from];
          var fromName = p.fromName || p.from;
          if (rec && p.version) {
            if (rec.version === p.version) {
              note = "Your " + fromName + " capsule, version " + p.version + ": already the one you installed here. You can put it in the chat again below.";
            } else if (rec.version < p.version) {
              var diff = changedSectionNames(rec.hashes, p.hashes || {});
              note = "Update available: your " + fromName + " capsule is now version " + p.version + "." +
                (diff.length ? " Changed since the one you installed here on " + dayLabel(rec.ts) + ": " + diff.join(", ") + "." : "");
            }
          }
          renderDeliver("target", p, note);
        });
        return;
      }
      // No live pending capsule. Pair sync still owes this tab an
      // offer when the vault holds a newer version of a capsule
      // this platform has received before: the slice 2 comparison
      // is the vault's current version against this tab's delivered
      // record, and the vault does not expire. (Added in v0.4.2;
      // before, the offer died with the pending copy at 24 hours.)
      readVault(function (vault) {
        readDelivered(function (all) {
          var mine = all[platform.id] || {};
          // Offer precedence by recency (decided by Tony,
          // 2026-11-03; extension v0.4.3): among the sources in
          // the vault, only the newest one, by compile time, can
          // offer an update here. When several sources hold a
          // version newer than the one installed here, the newest
          // source's update is the one presented; the others are
          // folded, recorded in their own vault entries, retained
          // and unmodified, simply not presented, because
          // installing an older capsule over a newer one would
          // reverse the order the conflict rule settles. An older
          // source offers again only once it is recompiled and
          // becomes the newest. (Before v0.4.3 the bar offered
          // whichever key the storage object listed first.)
          var newestId = null, newestTs = -1;
          Object.keys(vault).forEach(function (srcId) {
            if (srcId === platform.id) { return; }
            var wrap = vault[srcId];
            if (!wrap || !wrap.cur) { return; }
            if ((wrap.cur.ts || 0) > newestTs) { newestTs = wrap.cur.ts || 0; newestId = srcId; }
          });
          var offer = null, note = null;
          if (newestId) {
            var nwrap = vault[newestId], nrec = mine[newestId];
            if (nrec && nwrap.cur.version > nrec.version) {
              var diff = changedSectionNames(nrec.hashes, nwrap.cur.hashes);
              offer = { text: nwrap.cur.text, found: nwrap.cur.found, flavor: nwrap.cur.flavor, ts: nwrap.cur.ts, from: newestId, fromName: platformName(newestId), version: nwrap.cur.version, hashes: nwrap.cur.hashes, fromVault: true };
              note = "Update available: your " + offer.fromName + " capsule is now version " + nwrap.cur.version + "." +
                (diff.length ? " Changed since the one you installed here on " + dayLabel(nrec.ts) + ": " + diff.join(", ") + "." : "");
            }
          }
          if (offer) { renderDeliver("target", offer, note); }
          else if (deliverMode === "target") { renderDeliver(null); }
        });
      });
    });
  }
  refreshDeliver();
  try {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== "local" || (!changes[PENDING_KEY] && !changes[VAULT_KEY])) { return; }
      if (deliverMode === "source") { return; }
      refreshDeliver();
    });
  } catch (e) { /* no live updates; the row still appears on load */ }
  pullSync(function () { refreshDeliver(); });
  try {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === "sync" && changes[SYNC_META_KEY]) { pullSync(function () { refreshDeliver(); }); }
    });
  } catch (e) {}

  bar.querySelector("#cmai-fill").addEventListener("click", function () {
    if (fillComposer(SHEBANG)) {
      watching = true;
      sentSeen = false;
      answerSeen = false;
      goneScans = 0;
      var base = {};
      pageBlocks().forEach(function (b) {
        var t = normText(b);
        if (t) { base[hashText(t)] = 1; }
      });
      intake = { jogLine: RECALL_LINE, slotEdited: false, grade: null, warned: false, baseline: base };
      status.textContent = "Step 1 is in the box: the whole thing, jog first, then the request and the full text. Swap the first line for a moment of your own, or send it with the example. Press send, then wait for the full reply. I will watch the page and light up Compile when the report is ready.";
      setCollapsed(true, "Click send when ready.");
    } else {
      status.textContent = "Could not find the message box. Click into it, then try again.";
    }
  });

  compileBtn.addEventListener("click", function () {
    if (!found) { return; }
    var result = CloneMyCompiler.compileToCapsule(found.text);
    download("capsule.md", result.text);
    upsertVault(platform.id, { text: result.text, found: result.found, flavor: result.flavor }, function (v) {
      var entry = { text: result.text, found: result.found, flavor: result.flavor, ts: Date.now(), from: platform.id, fromName: platform.name, version: v.version, hashes: sectionHashes(result.text) };
      var note;
      if (v.isFirst) { note = "Saved as your " + platform.name + " capsule, version 1."; }
      else if (v.changed && v.changed.length) { note = "Your " + platform.name + " capsule is now version " + v.version + ": " + v.changed.length + (v.changed.length === 1 ? " section" : " sections") + " changed (" + v.changed.join(", ") + ")."; }
      else { note = "No changes from your saved " + platform.name + " capsule, version " + v.version + "."; }
      entry.vaultNote = note;
      stashPending(entry);
      renderDeliver("source", entry);
      publishSync();
      status.classList.remove("cmai-scan");
      status.textContent = "Done. capsule.md downloaded: " + result.found + " of 12 sections, flavor " + result.flavor + ". " + note + " It is also ready to deliver: open your other AI and its bar will offer it. Compile stays live: click again for a fresh copy, or if the answer grows.";
    });
  });

  // Watch for the report. Checks are debounced, and a find only
  // counts once the text has been stable for a few seconds, so we
  // never grab a half-written answer.
  var timer = null, lastText = "", stableText = "";
  var TEMPLATE_NOTE = "That is the instructions text, not the report. Waiting for the AI's own document.";
  // Send detection (v0.5.9): every host in the platform table
  // clears its message box the moment a message is sent, so a box
  // that held the request and now reads empty means the user
  // pressed Send. The request marker is checked as well as
  // emptiness, so a box the user is still editing never counts,
  // and if the box cannot be found at scan time this says nothing
  // at all: the heading trigger in scan() then carries the waiting
  // state on its own. (No URL check: several hosts change the URL
  // on the first send of a chat, so a changed URL cannot tell a
  // send from a new chat.)
  function composerSent() {
    var box = findComposer();
    if (!box) { return false; }
    var text = box.tagName === "TEXTAREA" ? (box.value || "") : (box.innerText || box.textContent || "");
    return text.indexOf("clonemy.ai/extract") === -1 && text.trim() === "";
  }
  // The wait is over because the page went back to no-answer: the
  // answer was removed, or this is a new chat. Both faces return
  // to the bar's opening state, so a waiting hint never sticks.
  function resetWatch() {
    watching = false;
    sentSeen = false;
    answerSeen = false;
    goneScans = 0;
    intake = null;
    setHint("");
    if (!found) {
      status.classList.remove("cmai-scan");
      status.textContent = "The request goes in the box. You press send, always.";
    }
  }
  // ---------------------------------------------------------------
  // Recall capture and grading (v0.5.11). The merged prompt's
  // reply carries two signals in sequence: the recall answer at
  // its head, then the report behind it. The report watcher is
  // unchanged; this reads the head.
  // ---------------------------------------------------------------
  // The jog line as sent: read it from the box while the fill
  // (or the user's edit of it) is still there, and from the
  // rendered sent message after. The first line of the text is
  // the slot; everything else in the fill is fixed.
  function jogLineOf(t) {
    if (!t || t.indexOf("Jog your memory first") === -1) { return null; }
    var lines = String(t).split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].trim()) { return lines[i].trim(); }
    }
    return null;
  }
  function captureJog() {
    if (!intake) { return; }
    var box = findComposer();
    if (box) {
      var bt = box.tagName === "TEXTAREA" ? (box.value || "") : (box.innerText || box.textContent || "");
      var fromBox = jogLineOf(bt);
      if (fromBox) { intake.jogLine = fromBox; }
    }
    if (!intake.jogLine || intake.jogLine === RECALL_LINE) {
      var blocks = pageBlocks();
      for (var i = 0; i < blocks.length; i++) {
        var fromPage = jogLineOf(blocks[i]);
        if (fromPage) { intake.jogLine = fromPage; break; }
      }
    }
    intake.slotEdited = intake.jogLine !== RECALL_LINE;
  }
  function emptyMarkerCount(t) {
    var m = String(t || "").match(/\bMISSING\b|\bEMPTY\b|Not present in the source/gi);
    return m ? m.length : 0;
  }
  // Yield emptiness for a finished report: a skeleton is a low
  // section count or a page of MISSING and EMPTY markers, however
  // many headings it managed to print.
  function emptyYield(text, sections) {
    return sections <= 5 || emptyMarkerCount(text) >= 10;
  }
  function warnCold() {
    intake.warned = true;
    status.classList.remove("cmai-scan");
    status.textContent = COLD_STATUS;
    setHint(COLD_HINT);
  }
  function setGrade(g, warned) {
    intake.grade = g;
    if (warned) { warnCold(); }
    else if (g === "FOUND") {
      status.textContent = "Your AI found the moment. It is writing the report from everything it holds.";
      setHint("Memory found: waiting for the report...");
    } else if (g === "PARTIAL") {
      status.textContent = "Only a little surfaced. The report will be thin where this is thin.";
      setHint("Only a little surfaced so far.");
    }
    // COLD_RECALL unwarned changes no face: the moment missed
    // and the yield has not spoken yet, so the waiting
    // machinery keeps the watch and the yield decides.
  }
  // Grade the recall passage: the head of the first reply block
  // that arrived after the fill, cut where the report's first
  // heading begins. The user's own sent message is excluded by
  // its jog line and its fallback heading, which no genuine
  // reply repeats.
  function gradeRecall() {
    if (!intake || intake.grade) { return; }
    // Sent evidence: the latched flag, an answer already seen,
    // or the box itself (the template state can persist for a
    // whole wait without ever latching the flag, because the
    // no-hit branch that sets it never runs while the sent
    // shebang scores as the template).
    if (!sentSeen && !answerSeen && !composerSent()) { return; }
    var blocks = pageBlocks();
    for (var i = 0; i < blocks.length; i++) {
      var t = normText(blocks[i]);
      if (!t || t.length < 20) { continue; }
      if (intake.baseline[hashText(t)]) { continue; }
      if (t.indexOf("Jog your memory first") !== -1) { continue; }
      if (t.indexOf("IF THE PAGE DID NOT OPEN") !== -1) { continue; }
      if (partialScoreOf(t) >= 6 && t.indexOf("## ") > 200) { t = t.slice(0, t.indexOf("## ")); }
      else if (partialScoreOf(t) >= 6) { continue; }
      if (t.length < 20) { continue; }
      var head = t.slice(0, 900);
      var j;
      for (j = 0; j < STRONG_COLD_PATTERNS.length; j++) {
        if (STRONG_COLD_PATTERNS[j].test(head)) { setGrade("COLD", true); return; }
      }
      var missing = false;
      for (j = 0; j < MOMENT_MISSING_PATTERNS.length; j++) {
        if (MOMENT_MISSING_PATTERNS[j].test(head)) { missing = true; break; }
      }
      if (missing) { setGrade("COLD_RECALL", false); return; }
      var quoted = /["\u201c][^"\u201d]{12,}["\u201d]/.test(head);
      var detailed = head.length > 200 && /(because|while|when you|so that|before|after|during)/i.test(head) && /\bdog\b/i.test(head);
      if (quoted || detailed) { setGrade("FOUND"); return; }
      if (/\b(dog|chat|remember|recall|moment)\b/i.test(head)) { setGrade("PARTIAL"); return; }
      return;
    }
  }
  function scan() {
    if (barGone) { return; }
    if (watching && intake && !found) {
      captureJog(); gradeRecall();
      // A cold recall whose reply has settled with no report
      // behind the admission: the yield is the admission alone,
      // which is empty, so the warning fires and the user can
      // stop at one click. A report still arriving (partial
      // score above zero) defers the decision to the ready
      // moment, where the finished yield is what counts.
      if (intake.grade === "COLD_RECALL" && !intake.warned && partialScore() === 0) {
        var rh = hashText(pageBlocks().join(" "));
        if (intake._rh === rh) { intake._rhStable = (intake._rhStable || 0) + 1; }
        else { intake._rh = rh; intake._rhStable = 0; }
        if (intake._rhStable >= 2) { warnCold(); }
      }
    }
    var hit = findReport();
    if (!hit) {
      // No finished report yet. If parts of one are on the page,
      // say so, with a count: a grey button and a silent bar read
      // as "broken" during the seconds the watcher needs, so the
      // bar narrates its own work while it works (Tony, live
      // Perplexity test, 2026-11-02: 5 to 10 seconds of dead air
      // between the answer finishing and Compile lighting up).
      if (!found) {
        var p = partialScore();
        if (p >= 1) {
          status.classList.add("cmai-scan");
          var msg = "Analyzing the answer as it arrives: " + p + " of 12 section headings spotted so far.";
          if (!coldActive() && status.textContent !== msg) { status.textContent = msg; }
        }
        // The collapsed face of the same moment (v0.5.9): once
        // Step 1 has been used, the hint follows the wait instead
        // of repeating the press-Send instruction.
        if (watching) {
          if (p >= 1) {
            answerSeen = true;
            sentSeen = true;
            goneScans = 0;
            if (!coldActive()) { setHint("Waiting for the answer: " + p + " of 12 sections so far."); }
          } else if (answerSeen) {
            // Evidence arrived and then vanished: the answer was
            // removed, or this is a new chat. Two quiet scans in
            // a row confirm it before the state lets go, so a
            // host re-rendering mid-stream never flaps it.
            goneScans += 1;
            if (goneScans >= 2) { resetWatch(); }
          } else if (sentSeen || (sentSeen = composerSent())) {
            if (!coldActive()) { setHint("Waiting for the answer..."); }
          }
        }
      }
      return;
    }
    if (hit.template) {
      // The strongest report-shaped block is still the
      // instructions (often the user's own just-sent message,
      // which carries the whole template). If a real answer has
      // begun arriving underneath it, both faces narrate the
      // answer instead: the count is the truer thing to watch.
      var tp = partialScore();
      // Not sent yet (v0.5.14): some hosts render the composer
      // inside the same main element the watcher reads, so the
      // fill itself scores as the template while it is still
      // sitting in the box. Until the box clears, that sighting
      // is the request, not an answer: both faces keep the
      // press-Send guidance the fill set, and nothing is latched
      // as seen. Tony caught the folded face reading "That is
      // the instructions text, not the report." at exactly this
      // stage (live on Gemini, 2026-11-09).
      var preSend = watching && !sentSeen && !composerSent();
      if (!found && tp >= 1) {
        status.classList.add("cmai-scan");
        var tmsg = "Analyzing the answer as it arrives: " + tp + " of 12 section headings spotted so far.";
        if (!coldActive() && status.textContent !== tmsg) { status.textContent = tmsg; }
        if (watching) {
          answerSeen = true;
          sentSeen = true;
          goneScans = 0;
          if (!coldActive()) { setHint("Waiting for the answer: " + tp + " of 12 sections so far."); }
        }
      } else if (!preSend) {
        status.classList.remove("cmai-scan");
        // A set recall grade outranks the template face: with
        // the whole shebang in the thread, the sent message is
        // the template for the whole wait, and letting it stomp
        // the grade every scan would hide the one signal the
        // user is watching for.
        if (!found && !coldActive() && !(intake && intake.grade) && status.textContent !== TEMPLATE_NOTE) {
          status.textContent = TEMPLATE_NOTE;
        }
        if (watching && !found) {
          answerSeen = true;
          goneScans = 0;
          if (!coldActive() && !(intake && intake.grade)) { setHint(TEMPLATE_HINT); }
        }
      }
      return;
    }
    if (hit.text === lastText) {
      if (stableText !== hit.text) {
        var firstLight = compileBtn.disabled;
        stableText = hit.text;
        found = hit;
        status.classList.remove("cmai-scan");
        compileBtn.disabled = false;
        compileBtn.classList.add("cmai-ready");
        compileBtn.textContent = "Step 2. Compile my capsule \u2193";
        var note = "Self-report found, " + hit.sections + " of 12 sections. Press Compile.";
        // On Claude, a report inside a document pane only shows
        // this watcher a window of the text at a time; the pane's
        // code view (</>) exposes the whole document at once.
        // Learned live, 2026-10-31: 8 of 11 in preview, 11 of 11
        // the moment the view switched.
        if (platform.id === "claude" && hit.sections < 11) {
          note += " If the report sits in a document pane, switch it to code view (</>) so the whole text is visible.";
        }
        if (intake && (intake.grade === "COLD" || intake.grade === "COLD_RECALL") && emptyYield(hit.text, hit.sections)) {
          // The pre-compile warning (v0.5.11): the recall missed
          // AND this report's yield is empty, so it was written
          // from nothing, and the ready face carries the warning
          // instead of the usual celebration. Compile still
          // lights and the bar still unfolds below: the user can
          // stop at one click with a checked No, or take the
          // empty file on purpose.
          status.textContent = "This AI holds nothing about you yet. Its report is on the page, " + hit.sections + " of 12 sections, most of it empty. Compiling now would make an empty capsule. Press Compile only if you want that file.";
          if (watching) {
            answerSeen = true;
            sentSeen = true;
            setHint("This AI holds nothing about you yet: press Compile only for an empty capsule.");
          }
        } else {
          status.textContent = note;
          if (watching) {
            answerSeen = true;
            sentSeen = true;
            setHint(READY_HINT);
          }
        }
        // Ready means visible (v0.5.10): at the moment Compile
        // first lights for a find, a collapsed bar unfolds itself
        // once, so the lit button and the found line are on
        // screen instead of hiding behind the strip. firstLight
        // gates it to that one transition: if the user folds the
        // bar again afterwards, or the answer grows and settles
        // again, it stays folded.
        if (firstLight && collapsed) { setCollapsed(false); }
      }
    } else {
      lastText = hit.text;
      if (!found) {
        status.classList.add("cmai-scan");
        var waitMsg = "Report spotted. Making sure it has finished arriving...";
        if (status.textContent !== waitMsg) { status.textContent = waitMsg; }
        if (watching) {
          answerSeen = true;
          sentSeen = true;
          goneScans = 0;
          if (!coldActive()) { setHint("Answer arriving: making sure it has finished..."); }
        }
      }
      // The page may go quiet right after the last chunk arrives,
      // with no further changes to observe. Check once more on a
      // timer so a finished report still counts as finished.
      setTimeout(scan, 1600);
    }
  }
  var observer = new MutationObserver(function () {
    clearTimeout(timer);
    timer = setTimeout(scan, 1200);
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  // A scroll mutates nothing, so on hosts that only paint (or only
  // load) the rest of a long answer once it scrolls into view, the
  // observer alone never re-checked and the button lit only after
  // the user reached the bottom (Tony, live on Muse, 2026-11-04).
  // Rescan on scroll (capture phase also hears inner panes) and on
  // a slow poll, so the watcher re-reads the page either way.
  document.addEventListener("scroll", function () {
    clearTimeout(timer);
    timer = setTimeout(scan, 400);
  }, true);
  setInterval(scan, 3000);
}

// Start.
var platform = currentPlatform();
if (platform) {
  recordVisit(platform);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { buildBar(platform); });
  } else {
    buildBar(platform);
  }
}
