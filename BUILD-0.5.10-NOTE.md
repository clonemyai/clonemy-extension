# Build note: v0.5.10 (2026-11-08, LOCAL ONLY, not published)

What this build delivered, and what it deliberately did not. The brief for this build carried three fixes. Fix 1 (the collapsed bar narrating the wait) had already shipped separately as v0.5.9 before this build rebased onto it. Fix 3 (auto-expand on ready) is this build's delivered change. Fix 2 (link-first Step 1 with an automatic full-text fallback fill) was designed and built in full against the 0.5.9 tree, then CUT before landing by Tony's whole-shebang decision (2026-11-08, about 7:58 PM PT): "Whole shebang upfront. The only friction we reduce by making it a two step process is processing speed. But users likely will only do this a few times so speed was never the requirement." Step 1 therefore fills the full text in one fill, exactly as in v0.5.9. Nothing from the cut design ships in this build; the merge design that supersedes it (v0.5.11, the recall jog riding on top of the full prompt) is a separate build that landed after this one and owns the final fill text.

The Chrome Web Store still serves v0.5.7. This build batches with v0.5.8, v0.5.9, and v0.5.11 into one submission later, per Tony's standing rule. Nothing was published.

## Files changed by this build

- `content.js`: the auto-expand change only (see the diff proof under Invariants).
- `manifest.json`: version 0.5.9 to 0.5.10, nothing else.
- `test-page-sim.js`: scenario 2's ready assertions composed with auto-expand, plus a new scenario 4 for the expand behavior.
- `README.md`: the v0.5.10 entry. (As landed in the tree, that entry also summarizes the cut link-first design for the record; the fuller account is here.)

## Fix 3, auto-expand on ready (delivered)

Tony's report, from live use: when Compile lights (a stable report found) while the bar is collapsed, the bar sat there showing its previous face until he expanded it by hand. The glowing button and the "Self-report found" line were exactly what he needed on screen at that moment, hidden behind the strip.

Implementation, inside `scan()`'s stable-find branch, the same transition that lights Compile:

- `var firstLight = compileBtn.disabled;` is captured before the branch enables the button, so it is true only on the scan where Compile first lights for a find.
- After the existing found handling (status line, and the v0.5.9 ready hint via `setHint(READY_HINT)`), the branch ends with `if (firstLight && collapsed) { setCollapsed(false); }`.

That is the whole change. Consequences, each pinned by a sim below:

- Collapsed at the find: the bar unfolds itself, once, at the ready moment.
- The user folds it again afterwards: respected. The gate is the Compile button's disabled flag, which never returns to disabled, so a later re-settle (the answer grows, then settles again) cannot unfold it a second time.
- Already expanded: untouched (the `collapsed` check makes the call a no-op in effect; nothing about the expanded face changes).
- Manual collapse and expand at any other time: unchanged, they are the same `setCollapsed` calls as before.

Composition with v0.5.9: the ready hint remains state under the expand. In the expanded face the status line reads "Self-report found, N of 12 sections. Press Compile."; folding the bar by hand after the auto-expand shows the collapsed face reading "Self-report found: press Compile.", word for word what v0.5.9 put there.

## Fix 2, link-first with automatic fallback (designed and built, then cut before landing)

Recorded so the work and the decision are both on file. As built against the 0.5.9 tree (and removed before this build landed):

- Step 1 filled only PROMPT (the link instruction). FULL_PROMPT stayed in code as the fallback payload.
- The watcher tracked one attempt per Step 1 fill: send detection by occurrence counting (the request gone from the box and rendered in the thread), a baseline snapshot of page blocks taken at fill time, and refusal capture over new post-send blocks only (six narrow English refusal patterns; the request echo, the instructions template, any block scoring as a report, and blocks over 4,000 characters excluded).
- Failure meant only: a matching refusal in the following reply, or `FALLBACK_TIMEOUT_MS` = 5 minutes of total silence after the send (any new block, any growth, or any spotted heading cancelled it for that attempt).
- On failure, the bar filled the composer with FULL_PROMPT exactly once, never pressed Send (the standing invariant), and narrated on both faces ("Full text is in the box: press Send in the chat." on the collapsed hint, with the watcher's waiting lines locked out until the fill left the box).
- PROMPT's closing sentence had been reworded to match the automatic mechanism ("the full instructions will be pasted in here instead"). The cut reverted it; the shipped sentence is the original "I will paste the file instead." The flagged site divergence (the website's prefilled door URLs carrying the same sentence) is moot for this build, since the sentence never changed in the end.

Sim state at the moment of the cut, for honesty: the refusal-path scenarios (fire once, both faces narrated, never-send, delete-resets, quote-back and template and older-refusal discipline) passed in the temporary sim file; the silence-timeout scenario was still failing in sim (unresolved, likely sim-harness timing) and never got its diagnosis, because the feature was cut first. The temporary sim file was removed with the feature. None of this code is in the tree: the cut was executed by restoring content.js to the verified v0.5.9 bytes (MD5 `97f211701a89f0fa17712f41bc85afad`) and re-applying only the auto-expand change, which is what makes the diff proof below exact.

## Sims (this build's tree, before the v0.5.11 merge landed on top)

- `test-page-sim.js`: ALL PASS, 47 checks (40 from v0.5.9, 7 new or recomposed). Scenario 2's ending now asserts the composition: at the ready moment the bar is unfolded, the status carries the found line, and folding by hand reveals the v0.5.9 ready hint word for word, with the fold respected when the answer grows and settles again. New scenario 4 proves the expand on its own: a hand-folded bar unfolds at ready, and an expanded bar is unaffected.
- `test-cleanup-sim.js`: ALL PASS.
- `test-vault-sim.js`: ALL PASS.
- `test-pair-sim.js`: 8 passed, 0 failed.
- `test-merged-sim.js` belongs to the v0.5.11 build and is not part of this build's suite.

## Invariants

- `content.js` diff against the verified v0.5.9 file is exactly two hunks, both in the stable-find branch of `scan()`: the `firstLight` capture line, and the commented expand call (9 added lines total, no deletions, nothing else anywhere in the file). Step 1 still inserts FULL_PROMPT; no link-first identifier (`FALLBACK_TIMEOUT_MS`, `REFUSAL_PATTERNS`, the attempt machinery) exists in the shipped file.
- `manifest.json`: version 0.5.9 to 0.5.10 only, in the file as this build left it. (The tree's manifest has since moved to 0.5.11 with the merge build.)
- `compiler.js`: not touched by this build. At this build's verification it read MD5 `1db1fde72805d891a0f514b1312f267e`, the canonical hash. (The merge build later changed the compiler file itself; that is its record to keep.)
- `extract-doc.js`: untouched. MD5 `06b8960de801fc8a391fe2ab23546cab`.
- No new strings contain an em dash; `content.js` as a whole contains none.
- No network, permission, or host changes. Nothing published.
