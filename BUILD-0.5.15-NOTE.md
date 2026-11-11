# Build note: extension v0.5.15 (2026-11-09)

Status: LOCAL ONLY, not published. Built at about 3:35 AM PT, minutes after the v0.5.14 store submission went in, so the two builds ship in sequence: 0.5.14 through its review first, then 0.5.15 as the next draft once 0.5.14 clears. The Chrome Web Store serves v0.5.7 until the 0.5.14 review lands.

## Tony's direction

Watching the compiled capsule panel live on the Mac during the 0.5.14 screenshot session (2026-11-09, about 3:30 AM PT): "we should consolidate the icons and have best guess in default and the rest in drop down". The guess rule, settled in his reply minutes later: "go with last use and never default to where they transferred out of".

This is his standing dropdown rule applied at home: a dropdown's two-click cost is worth it only when it collapses many buttons. Seven door buttons was the many-buttons case.

## The change (content.js only)

- The deliver row's destination list (CMAI_TARGETS, seven doors) used to render as seven stacked chip buttons through targetButtons(). It now renders one primary door chip, a "More destinations ▾" toggle, and a hidden container with the remaining six chips. Both call sites get the consolidation: the after-compile source row ("Capsule ready to deliver. Take it to:") and the after-install done row ("Or take this capsule to another AI:"). Discard and Forget buttons are unchanged.
- Best guess, in order: (1) the last door recorded for this source host, (2) the last door recorded anywhere, (3) the starter guess: Claude, or ChatGPT when the source host is Claude. A candidate equal to the current host is always rejected, per Tony's rule, so the primary is never the place the capsule was compiled. The source host remains available inside the dropdown.
- Memory: chrome.storage.local key cmai_lastdoor, shape { byHost: { <platformId>: <doorName> }, any: <doorName> }. Door anchors carry data-cmai-dest; the deliver row's delegated click handler records the name on click and lets the navigation proceed. The value is cached at bar boot for the synchronous render, and the cache updates on every recorded click. No new permissions, no network, same storage story as the vault.

## Verification

- test-page-sim.js Scenario 5 (new): eleven door checks, all PASS. Boots on Gemini (starter Claude, source in dropdown, toggle opens, Grok click records byHost.gemini and any), Gemini with seeded memory (Grok becomes primary), Claude with a global memory of Claude (primary is ChatGPT, never the source; Claude still in the dropdown), ChatGPT with a source-equal memory (skipped, primary Claude).
- test-page-sim.js full suite: ALL EXTENSION SIM TESTS PASS (including the v0.5.14 Gemini-shape scenario and the deliver flow scenario).
- test-merged-sim.js: ALL PASS. test-cleanup-sim.js: ALL CLEANUP SIM TESTS PASS. test-vault-sim.js: ALL VAULT SIM TESTS PASS. test-pair-sim.js: 8 passed, 0 failed.
- content.js: 83,318 bytes, MD5 620392fea74829f41eda520390cc4f77. compiler.js untouched (MD5 d9b62dad6b8f1e2cc7eafedcc90c656f, canonical). extract-doc.js untouched (MD5 259a9674ec74966c962679a259429b9f). manifest.json: version only, 0.5.14 to 0.5.15 (1,104 bytes class, minified).
- Package: clonemy-extension-0.5.15.zip, same 14-file set as 0.5.14.

## Ship order and follow-ups

- 0.5.14 completes its store review first (it carries the pre-send fix, the refreshed listing copy, and the new screenshots). When it publishes, upload 0.5.15 as the next draft and submit.
- The doors store screenshot (shot-3-ready-doors.png, taken from 0.5.14) shows the old seven-button stack. Refresh that one screenshot from the 0.5.15 build before the 0.5.15 submission. The Mac's unpacked staging folder (~/clonemy-ext-0513) still holds 0.5.14 bytes; restage with 0.5.15 content.js and manifest.json at that session.
