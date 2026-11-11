# clonemy.ai browser extension

Move your AI companion's personality to any platform, without carrying files back and forth yourself. This extension lives inside your AI chat tab, helps run the extraction, captures the self-report where it was written, compiles your capsule locally, and downloads capsule.md.

Works on ChatGPT, Claude, Gemini, Grok, Perplexity, Muse, and Meta AI.

## The nothing-scary promise, and how to check it yourself

This extension was designed so that a person who reads basic code can verify there is nothing scary inside. Do not take our word for it. Check:

1. **Almost zero network requests, and every one is yours.** Search the extraction and compile code (content.js, compiler.js, extract-doc.js, popup.js) for `fetch(`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`. There are none: the bar, the watcher, and the compiler have no code path that can transmit anything. The one exception is the phone shuttle (pair.js), which you open yourself from the popup: it registers a one-time code with the public PeerJS broker over a WebSocket, and the capsule itself crosses directly between this browser and your phone, encrypted in transit, only after the phone accepts the named offer. That flow is disclosed on the pair page itself, before anything moves. (Corrected 2026-11-11: the earlier blanket wording predated the shuttle and overstated the case.)
2. **No minification, no build step.** The files in the store package are these files, byte for byte, from the tagged release in this repository. Format is readable on purpose.
3. **Tiny permissions.** The manifest asks for exactly:
   - `storage`: three things in your browser, plus one optional fourth that leaves it only as ciphertext: a local tally of which AI sites you use (days and sessions, shown in the popup with an erase button), a capsule you compiled that is waiting to be delivered into another of your AI tabs (gone when you discard it from the bar, or after 24 hours), and your capsule vault: the latest capsule you compiled from each AI site, versioned so a recompile names the sections that changed, kept until you forget it from the bar, plus a record of which version each AI last received so updates can be offered instead of silent replacements. The optional fourth: if you turn on browser sync in the popup, encrypted chunks of the vault are written to your browser's sync storage and carried to your other browsers by the browser itself, protected by a six-word sync phrase the extension issues you (anyone who has the phrase can open the synced capsules, so keep it like a password); the sync carrier sees chunk sizes and timing, never content, and the extension itself makes no network requests.
   - Host access to the seven AI sites above, so the bar can appear in those tabs and nowhere else.
   Nothing else. No history (we refuse that permission on principle), no cookies, no access to any other website.
4. **It never sends for you.** Button 1 puts the extraction request into the chat box. You press send. Button 2 compiles and downloads. Every consequential step is a press you make.

## Local builds

### v0.5.15 (2026-11-09, LOCAL ONLY, not published)

Door consolidation, from Tony's call while reviewing the compiled panel live (2026-11-09, about 3:30 AM PT): "we should consolidate the icons and have best guess in default and the rest in drop down", with the guess rule settled minutes later: last used, and never default to where they transferred out of. Changes:

- content.js: the deliver row (both the after-compile "Take it to:" row and the after-install "take this capsule to another AI" row) now renders ONE primary door plus a "More destinations" dropdown holding the other six, instead of seven stacked buttons. Discard and Forget stay as they were. The primary is the last door the user actually took, remembered per source host first and globally second in chrome.storage.local (cmai_lastdoor), recorded on every door click. The source host can never be the primary: a remembered door equal to the current host is skipped, and with no usable history the starter guess is Claude, or ChatGPT when the source is Claude itself. The source host stays one tap away inside the dropdown.
- Sims: test-page-sim.js gains Scenario 5 with eleven door checks (single primary, starter guess, dropdown contents and open, click records last used, remembered door becomes primary, never-default-to-source on Claude, source-equal memory skipped on ChatGPT). All five suites pass.
- manifest.json version to 0.5.15, nothing else changes. compiler.js and extract-doc.js untouched.

### v0.5.14 (2026-11-09, submitted to the Chrome Web Store the same night, pending review)

Built the same night as the v0.5.13 store staging, from Tony's live catch during the screenshot capture session: on Gemini, with the Step 1 fill sitting in the box unsent, the folded bar read "That is the instructions text, not the report." Tony's direction: at this stage the text should say "Click send when ready." Root cause: Gemini renders its composer inside the same main element the watcher reads, so the fill itself scores as the template before anything is sent, and the watcher's template branch set both faces and latched the answer as seen. Changes:

- content.js: the Step 1 handler now folds the bar with the hint "Click send when ready." (Tony's words). The watcher's template branch computes a pre-send gate (watching, not yet sent, and the box still holding the request): while it holds, the template sighting is the request, not an answer, so neither face is overwritten and nothing is latched as seen. Once the box clears, the template face works exactly as before.
- Sims: test-page-sim.js gains Scenario 4, a Gemini-shaped page with the composer echoed inside main, pinning both sides: the unsent fill keeps the send guidance on both faces, and the same text after Send gets the template face. The page sim's press-Send constant and test-merged-sim.js's collapsed-face pin move to the new hint. All five suites pass.
- manifest.json version to 0.5.14, nothing else changes. compiler.js and extract-doc.js untouched.

### v0.5.13 (2026-11-08, LOCAL ONLY, not published)

Built locally the same night, batching with v0.5.8 through v0.5.12 into one store submission later. The Chrome Web Store still serves v0.5.7. This is the homework build (Tony, 2026-11-08, about 9:30 PM PT, after the six-prompt Gemini field test filed as evidence the same evening): the extraction document is re-voiced as the user's own homework assignment, a person setting out to learn as much as they can about how they and their AI interact together, and the prompt asks for help with it. Changes:

- extract-doc.js regenerated with `node build-extract-doc.js` from the canonical EXTRACTION-REQUEST.md (10,188 bytes, MD5 f3be7bbb02fb998ccfb3a52b174ce13d; the generator proves the round trip byte for byte). The document's framing now runs in the homework voice: the opening sets the assignment ("I have set myself some homework: to learn as much as I can about how you and I interact"), an assignment preamble follows the structure heading, and each section opens with what the user wants to learn there. The discipline underneath does not move: all 14 heading lines are byte-identical to v0.5.12 (verified by diffing the heading lists), the title line is unchanged ("# Instructions for MY ai", so AI_DOC_MARKER and TEMPLATE_MARKERS do not change), the Section 0 receipt and fidelity declaration, the audit-note discipline, one line per fact with all sections before expansion, EMPTY and MISSING used plainly, Boundaries, Unknowns, and Voice with real quoted exchanges, both output forms, and the phone note verbatim all stand.
- The fill's order is unchanged in shape: the memory jog still leads, verbatim, because it is the piece proven to work (Tony's ordering correction, about 9:31 PM PT: the homework ask lines up AFTER the jog). What changed is the PROMPT behind it: it opens "Can you help me with my homework?" and the ownership line now presents the file as the assignment: "I keep the assignment for this in a file of my own, on my own page: https://clonemy.ai/extract. Please follow the instructions in that file exactly." The functional remainder (the structured self-report description, both output forms, the "say so plainly and I will paste the file instead" closer) is byte-identical to v0.5.12, and FALLBACK_HEADING is byte-identical (it speaks of the page and the pasted copy, never of the assignment, and its either/or force and four refinement clauses stand).
- Sim pins: test-merged-sim.js re-pins the opening checks to the homework ask and gains a check that the homework ask follows the jog and precedes the fallback heading (41 checks now, all passing). The old opening string has zero hits in content.js and the sims. The other four suites pass unmodified.
- The iOS and Android bundled extract.md files were re-synced from the same canonical the same evening (byte-identical, MD5 above), and both apps' door prefill text now carries the same jog-first homework wording. compiler.js untouched (MD5 d9b62dad6b8f1e2cc7eafedcc90c656f, the canonical compiler Tony ratified on 2026-11-08).
- manifest.json version to 0.5.13, nothing else in the manifest changes. Sims: all five suites pass (see BUILD-0.5.13-NOTE.md).

### v0.5.12 (2026-11-08, LOCAL ONLY, not published)

Built locally the same night and held unpublished at Tony's direction, batching with v0.5.8 through v0.5.11 into one store submission later. The Chrome Web Store still serves v0.5.7. This build is a document regeneration, not a behavior change: the bundled extraction document catches up with the canonical document after site v7.11 (the reframe) and the v7.12 rename. Changes:

- extract-doc.js regenerated with `node build-extract-doc.js` from the canonical EXTRACTION-REQUEST.md (8,983 bytes, MD5 118954c96a68718df87272a5a205bd23; the generator proves the round trip byte for byte). The document the extension carries is now the reframed one: no human-facing header anywhere (AI-only from its first line), the framing in the user's first-person wants-page voice, and the title line renamed to "# Instructions for MY ai" (Tony's wording: the title speaks as the owner). The 12 section headings are unchanged.
- The slice marker in content.js follows the rename (AI_DOC_MARKER is now "# Instructions for MY ai"); since the document is AI-only from its first line, the slice returns the whole document and the marker logic remains as a guard, with the markerless fallback unchanged. TEMPLATE_MARKERS gains the new title, keeps the old title so echoes of pre-rename copies are still recognized, and swaps the dead second-person opener for the document's new first line ("I am moving to a new AI, and I want to take us with me").
- The link instruction in PROMPT now opens in the owner's voice: "I keep the instructions for this in a file of my own, on my own page: https://clonemy.ai/extract. Please follow the instructions in that file exactly." The rest of PROMPT, including the "say so plainly and I will paste the file instead" closer, is unchanged, and FALLBACK_HEADING is byte-identical (it speaks of the page, never of opening a link, and its either/or force and refinement clauses stand). New sim pins lock the opening and the closer so the wording cannot drift silently.
- The iOS and Android bundled extract.md files were re-synced from the same canonical the same evening (byte-identical, MD5 above), so all three surfaces carry the same extraction text. compiler.js untouched (MD5 d9b62dad6b8f1e2cc7eafedcc90c656f, the canonical compiler Tony ratified on 2026-11-08).
- manifest.json version to 0.5.12, nothing else in the manifest changes. Sims: all five suites pass (see BUILD-0.5.12-NOTE.md).

### v0.5.11 (2026-11-08, LOCAL ONLY, not published)

Built locally the same night and held unpublished at Tony's direction, batching with v0.5.8, v0.5.9, and v0.5.10 into one store submission later. The Chrome Web Store still serves v0.5.7. Changes:

- One prompt for the whole intake (Tony's merge, then his whole-shebang call). Step 1 is now "Prime and extract": a single fill carrying everything, the recall jog first (the first line is a swappable slot, shipped with the dog-away example: swap in a moment of your own, or send it with the example), then the link instruction as canonical reference, then the fallback heading, then the extraction document itself, sliced to its AI-facing part (see the last bullet). No link has to fetch, there is no second fill, and the bar never sends. The heading carries the refinements from the first live merged test: never rebuild the task from any other page or specification, one line per fact with all 12 sections completed before any is expanded, Sections 9, 10, and 11 required with EMPTY or MISSING entries rather than omitted, a Section 0 receipt (the recall outcome and the sources consulted), and the report in both forms (code block first, capsule-source.md after, no partial or summary versions).
- The watcher reads the one reply for two signals: the recall answer at its head (graded FOUND, PARTIAL, or COLD) and the report behind it. The grades are split signals: the empty-source warning fires on the report's yield, with the recall grade as corroboration only, so an honestly missed example moment over a rich report compiles normally, and a cold recall over an empty yield warns before Compile ("This AI holds nothing about you yet. Compiling now would make an empty capsule."), with Compile still lit for anyone who wants the empty file on purpose.
- The fill slices the bundled document at runtime from its "# Instructions for MY ai" marker (the title line read "# Instructions for the AI reading this" in this build; renamed in v0.5.12, see that entry): the human-facing header (title, how-to) is packaging for the standalone file and stays out of the paste, saving 1,158 of the document's 9,546 characters. The bundled document itself is untouched, and if the marker is ever absent the whole document fills instead. Two template markers from the AI instructions keep the sent shebang recognizable to the watcher as the template, since the sliced echo no longer carries the human header lines.
- manifest.json version to 0.5.11, nothing else in the manifest changes. Sims: new test-merged-sim.js covers the shebang fill byte for byte, the refinement clauses, all three grades, both yield combinations, the no-second-fill rule, and the markerless fallback; the pre-existing suites pass (see BUILD-0.5.11-NOTE.md).

### v0.5.10 (2026-11-08, LOCAL ONLY, not published)

Built locally the same night, folded into the v0.5.11 record. As it stands in this tree, this build is the auto-expand: a collapsed bar unfolds itself once at the moment Compile lights, so the ready state is on screen instead of hiding behind the strip, and a fold afterwards is respected. A link-first Step 1 with an automatic fallback fill was built and then superseded the same evening by Tony's whole-shebang call (see the v0.5.11 entry and the design note's decision record); it is not in this tree and never shipped anywhere.

### v0.5.9 (2026-11-08, LOCAL ONLY, not published)

Built locally the same night as v0.5.8 and held unpublished at Tony's direction, batching with it into one store submission later. The Chrome Web Store still serves v0.5.7. Changes:

- The collapsed bar now says it is waiting. The hint under the title was a one-shot label set at collapse time, so after Step 1 filled the request and the user pressed Send, the shrunk bar kept reading "Request is in the box: press Send in the chat." for the whole answer (Tony, live on Gemini). The hint is state now, and the watcher drives it from the same evidence as the status line: press Send, then "Waiting for the answer..." with a live section count folded in as headings arrive, an instructions-only short face when all the page holds is the template, and "Self-report found: press Compile." when the report settles. If the answer vanishes (new chat), both faces return to the opening line instead of sticking on waiting. Send is detected from the message box itself: every host clears it on send, so a box that held the request and now reads empty means sent; section headings alone also trigger the waiting face wherever a box cannot be read.
- manifest.json version 0.5.8 to 0.5.9, nothing else in the manifest changes.
- Sims: test-page-sim.js grows a collapsed-hint scenario (fill, send, template, counts of 3 then 5, new-chat reset, ready) and a deliver scenario proving the capsule-in-box hint is untouched; test-cleanup-sim.js, test-pair-sim.js (8 of 8), and test-vault-sim.js all pass. No network or permission behavior change.

### v0.5.8 (2026-11-08, LOCAL ONLY, not published)

Built locally alongside site v7.04 and held unpublished at Tony's direction, in case of more updates the same night. The Chrome Web Store still serves v0.5.7. Changes:

- The bar defaults to light. cmaiPageTheme() keeps only positive detection: dark when the page's own color-scheme declares dark alone, or when a measurable body background has luminance at most 0.6. Every path where the OS preference alone resolved to dark is gone (the both-declared tiebreak, the OS fallback block, and the final fallthrough, which now returns light).
- popup.html and pair.html swap their token sets: the base rules carry the light values and a prefers-color-scheme dark block carries the dark values, so both pages open light unless the system says dark. Three inline divider and input border styles in popup.html take the matching light tokens.
- manifest.json version 0.5.7 to 0.5.8, nothing else in the manifest changes.
- Sims: test-cleanup-sim.js, test-page-sim.js, test-pair-sim.js (8 of 8), and test-vault-sim.js all pass. No network or permission behavior change.

## How it works

1. Open your AI's chat. The clonemy bar sits in the top right corner of the tab. Shrink it with the – button or close it with the ✕ button; it comes back when the page reloads.
2. Press "Step 1. Prime and extract", swap the first line for a moment of your own if one comes to mind, then press send in the chat, like you normally would. The one fill carries everything; there is no second step to the intake.
3. Your AI answers the jog, then writes its self-report. When the extension recognizes the finished report (the numbered sections of the extraction format) it lights up step 2 with the section count.
4. Press "Step 2. Compile my capsule". capsule.md downloads, compiled in the tab by compiler.js, a straight port of the compiler on clonemy.ai. Same input, same capsule.
5. Send capsule.md to your new AI with the line in its READ THIS FIRST header. The capsule ends with a self-check, a prediction round, and a voice round: the new AI answers three questions from the capsule alone, then predicts how you would act in three situations it was never told about, then answers one ordinary prompt in the voice the capsule installed. You grade the predictions and the voice in one line each (yes, yes, no; sounds like them, or sounds new), and any miss is saved as a correction.

## Files

- `manifest.json`: what the browser enforces. Read this first.
- `content.js`: the bar, the fill, the watching, the download. Heavily commented.
- `compiler.js`: the capsule compiler. Pure text in, text out.
- `popup.html` / `popup.js`: the tally display and the regular-AI offer box.
- `icons/`: the clonemy.ai logo.

## Detection, in plain words

The extension counts, per AI site, how many sessions and how many different days you have used it, starting from install. It deliberately does not look at your history from before install; that permission is too broad to ask for. An AI used on 3 or more different days (or 5+ sessions) counts as your regular, and the popup then asks whether you want to sync it with clonemy.ai, transfer it, or sync it to another AI. The counts are visible in the popup and erasable there. They never leave your machine.

## Install for testing (no store needed)

Chrome or Edge: open `chrome://extensions`, turn on Developer mode, choose "Load unpacked", pick this folder.

## License and source

Public source: https://github.com/clonemyai (extension repository). Spec: EXTENSION_SPEC.md in the clonemy.ai project files.
