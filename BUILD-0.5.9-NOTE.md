# Build note: v0.5.9 (2026-11-08, LOCAL ONLY, not published)

Tony's complaint, from live use on Gemini: after Step 1 fills the request and the user presses Send, the collapsed bar kept reading "Request is in the box: press Send in the chat." for the whole wait. The instruction was stale the moment Send was pressed. Root cause, verified in source before editing: the watcher (`scan()`) narrates only into `#cmai-status`, which lives inside `#cmai-body` and is hidden while the bar is collapsed; the collapsed face (`#cmai-hint`) was a one-shot label written only by `setCollapsed(v, hintText)` at collapse time, so nothing ever updated it again.

The Chrome Web Store still serves v0.5.7. This build batches with v0.5.8 into one submission later, per Tony's standing rule. Nothing was published.

## What changed

Files: `content.js`, `manifest.json` (version only), `test-page-sim.js` (new scenarios), `README.md` (the v0.5.9 entry), this note.

In `content.js`, all inside `buildBar` unless noted:

- `setCollapsed` / new `renderHint` / new `setHint`: the hint is state now (`hintState`). `setCollapsed(v, hintText)` records the text when given one and renders from state; collapsing at any moment shows the current face text, expanding hides the element, and `setHint` updates the visible element live while collapsed. The two existing call sites pass the same strings as before, word for word.
- New watch state beside `found`: `watching`, `sentSeen`, `answerSeen`, `goneScans`, plus `TEMPLATE_HINT` and `READY_HINT` constants.
- The Step 1 handler arms the state (`watching = true`, latches cleared) on a successful fill. Nothing else about the fill changed.
- New `composerSent()`: send detection (below).
- New `resetWatch()`: clears the watch state, clears the hint, and (when no report has been found) restores the status line to the bar's opening line, so both faces reset together.
- `scan()`, no-report branch: drives the collapsed face from the same partial count as the status line (waiting with count), or from send detection (waiting, no count), or, when evidence had been seen and then vanishes for two consecutive scans, `resetWatch()`.
- `scan()`, template branch: sets the short template hint. It also yields both faces to the partial count when a real answer is arriving underneath the template (new; see the platform note on masking below).
- `scan()`, still-arriving branch: sets "Answer arriving: making sure it has finished..." on the collapsed face, mirroring the status line.
- `scan()`, stable-found branch: sets `READY_HINT` on the collapsed face at the same moment Compile lights.

## The state machine as shipped

All transitions require `watching` (Step 1 used in this document) and no found report, except Ready, which is the found transition:

- Fill succeeds: hint "Request is in the box: press Send in the chat."
- Composer no longer holds the request and reads empty (sent), no answer evidence yet: "Waiting for the answer..."
- Partial score at least 1 (no-report branch, or template branch with a partial underneath): "Waiting for the answer: N of 12 sections so far.", updating as N grows.
- Template only: "That is the instructions text, not the report."
- Report spotted but still changing: "Answer arriving: making sure it has finished..."
- Report stable (Compile lights): "Self-report found: press Compile."
- Evidence seen, then no evidence for two consecutive scans (answer removed, new chat): hint clears, status returns to "The request goes in the box. You press send, always."
- Step 1 re-run at any point: back to the press-Send state with latches cleared.

The deliver flow is untouched: its hint ("Capsule is in the box: press Send in the chat.") is set through the same `setCollapsed` call as before, the watcher never writes hints unless `watching`, and a sim scenario proves the string survives a watcher cycle unchanged.

## Send detection: outcome per platform

Implemented, uniformly, not per host. `composerSent()` reuses `findComposer()`, the same finder Step 1 already depends on: if Step 1 could fill the box, the watcher can read the box. Rule: the box is found, its text no longer contains the request marker ("clonemy.ai/extract"), and it reads empty. Every host in the platform table (ChatGPT, Claude, Gemini, Grok, Perplexity, Muse, Meta AI) clears its composer on send, so the filled-then-empty transition is the send signal on all seven; no host needed its own code path. In-sim evidence: the ChatGPT-shaped page sim drives fill, clear, and the waiting transition end to end. Live per-host verification is not possible from a local build, so the claim rests on the shared finder plus the clear-on-send behavior the fill flow already assumes.

Considered and rejected: a URL-change reset for new chats. Several hosts change the URL on the first send of a chat (history push, no reload), so a changed URL cannot tell a send from a new chat; using it would kill the waiting state at exactly the wrong moment.

Residual gaps, named rather than papered over:

1. Composer unreadable at scan time: `composerSent()` returns false and says nothing; the heading trigger still moves the hint to waiting-with-count the moment the first section lands. The only uncovered stretch is sent-but-nothing-arrived-yet on a page whose box cannot be found.
2. Full navigation (Perplexity's search-to-answer hop, any reload): watch state is per-document memory, so the new document starts unwatched. The expanded status line still narrates there; the collapsed hint joins in only if Step 1 is used in that document. Not simulated or faked.
3. Abandon before first evidence: if the user sends, then starts a new chat before anything arrives (no partial, no template sighting), the waiting hint persists in the new chat. That state is indistinguishable from a slow first answer, so the reset requires evidence seen first, then gone for two scans. Re-running Step 1, or any report state change, resolves it.
4. Template masking, handled in code: on hosts that render the just-sent message, that message scores as the template (it carries the whole extraction document), which used to be all the watcher could report. The template branch now checks the non-template partial count first and narrates the arriving answer on both faces when one exists.

## Sims

- `test-page-sim.js`: ALL PASS, 40 checks (23 pre-existing, 17 new). New scenario 2 walks the state machine: fill collapses with press-Send; expand hides the face, re-collapse restores it; Send (box cleared) gives waiting with no count; template alone gives the short template face; a partial under the template gives counts of 3 then 5, with the expanded status agreeing; clearing the thread resets both faces; Step 1 again restores press-Send; a settled report gives the ready face with Compile lit. New scenario 3 seeds a pending capsule, installs it, and proves the deliver hint is the capsule-in-box line word for word and unchanged after a watcher cycle.
- `test-cleanup-sim.js`: ALL PASS (includes the pre-existing collapse/expand case and the template-only case).
- `test-vault-sim.js`: ALL PASS.
- `test-pair-sim.js`: 8 passed, 0 failed.

## Invariants

- `manifest.json`: version 0.5.8 to 0.5.9 only, verified byte-identical to the previous file apart from the version string.
- `compiler.js`: untouched. MD5 before and after: `1db1fde72805d891a0f514b1312f267e` (the canonical hash).
- No new strings contain an em dash; `content.js` as a whole contains none.
- No network, permission, or host changes. Nothing published.
