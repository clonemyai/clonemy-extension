# Build note: v0.5.14 (2026-11-09, submitted to the Chrome Web Store the same night)

The pre-send face fix. Tony caught it live during the v0.5.13 store screenshot session on the Mac Studio (2026-11-09, about 2:43 AM PT): on Gemini, in a temporary chat, Step 1 filled the box and the folded bar at top right read "That is the instructions text, not the report." His direction, verbatim in substance: the text at top right should say "Click send when ready" at this stage. The build was made the same night, before the store submission, so v0.5.14 supersedes v0.5.13 as the package that ships; the dashboard draft's copy and privacy answers carry over unchanged.

## Diagnosis

The watcher reads report evidence from a block set that includes the page's main element. Gemini renders its composer inside that same main, so the moment the Step 1 fill lands in the box, the fill's own text is on the page in a scanned block. findReport() scores it as the template (score 6 or more, template markers present) and returns the template hit even though nothing has been sent. The template branch of scan() then did two wrong things at this stage:

- It replaced both faces: the expanded status became TEMPLATE_NOTE and the folded hint became TEMPLATE_HINT ("That is the instructions text, not the report."), stomping the press-Send guidance the fill had just set.
- It latched answerSeen = true, recording an answer as seen when the only text present was the unsent request.

The page sim never reproduced this because its fake composer is a textarea outside main, and a textarea's value is not page text. On hosts whose composer is a plain textarea the bug does not fire; on Gemini (and any host rendering the composer inside a scanned container) it fired on every fill.

## The fix (content.js only)

- The Step 1 handler now folds the bar with Tony's words: setCollapsed(true, "Click send when ready."). The expanded status the fill sets is unchanged.
- In scan()'s template branch, a pre-send gate is computed before any face is written: preSend = watching && !sentSeen && !composerSent(). composerSent() is the existing v0.5.9 helper: every host in the platform table clears its box on send, so a box still holding the request marker means no send has happened. While preSend holds, the template branch writes neither face and latches nothing: the sighting is the request, not an answer. The branch's structure is otherwise untouched (the partial-count narration above it cannot fire pre-send, because the template block is excluded from partialScore()).
- Once the box clears, the gate opens and the template face behaves exactly as in v0.5.9 through v0.5.13: the just-sent message legitimately is the template for the whole wait, and the recall grade still outranks it.

## Sims

- test-page-sim.js: the PRESS_SEND constant moves to "Click send when ready." (three existing checks ride it). New Scenario 4, a Gemini-shaped page: the fill is echoed into a div inside main, as Gemini renders its composer. Four checks: the fill face asks for the send; the unsent fill is not the template face after watcher scans run; the unsent fill keeps the fill status; after the box clears, the same text gets the template face. All pass.
- test-merged-sim.js: the M1 collapsed-face pin moves to "Click send when ready." (41 checks, all pass).
- test-cleanup-sim.js: unmodified and passing. Its template-only case never fills, so watching is false and the gate cannot engage; the template status still names the trap there.
- test-vault-sim.js, test-pair-sim.js: unmodified and passing (pair sim 8 passed, 0 failed).

## Invariants

- compiler.js untouched: MD5 d9b62dad6b8f1e2cc7eafedcc90c656f (canonical).
- extract-doc.js untouched: MD5 259a9674ec74966c962679a259429b9f; the canonical document is unchanged by this build.
- manifest.json: version only (0.5.13 to 0.5.14), compact formatting preserved.
- Zero em dashes in the new strings and records.

## Submission (2026-11-09, dashboard session 3:30 to 3:39 AM PT)

- Submitted to the Chrome Web Store from the dashboard (item ejoibikgcgekmoejipegnpabjpndofdo, publisher accounts@clonemy.ai). Dashboard status after submission: "Pending review", with the toast "Item submitted." The option to publish automatically after passing review was left checked, as the dashboard defaults it.
- Screenshots: the set is now five, in this order: (1) shot-1, the extraction request in the Gemini chat box with the folded bar reading "Click send when ready."; (2) shot-3, "Done. capsule.md downloaded: 12 of 12 sections" with the delivery doors; (3) shot-4, the empty-capsule warning panel; (4) the kept older shot of the self-report being graded as it arrives; (5) the kept older compile-ready shot. The three new shots were captured live from this build on the Mac Studio the same night (see the capture record in ~/memory/2026-11-09.md). Three older screenshots that duplicated the new ones were removed. Icon and promo tiles untouched.
- Pre-submit checks held: package read Draft Version 0.5.14 with no warning, published version still 0.5.7; summary and the 4,532 character detailed description are the Section B copy in LISTING-MATERIALS.md; privacy answers as saved (host permissions carry the standing note that they may trigger an in-depth review, the only delay note on the item).
- Review timing is Google's: the submission dialog says review can take up to several weeks. Nothing about the outcome is known until the dashboard status changes. v0.5.15 (door consolidation) is built and packaged locally and goes in as the next draft once 0.5.14 clears.

## Rejection and resubmission (2026-11-09, about 3:57 AM PT)

- The submission was rejected within about twenty minutes on a listing-copy flag, not code: Keyword Spam, violation reference ID Yellow Argon. The violating content quoted by Google is one line of the detailed description: "Supported: ChatGPT, Claude, Gemini, Grok, Perplexity, Muse, and Meta AI."
- This is the second time this exact string has drawn this exact flag: the listing dress-up submission of 2026-11-03 was rejected on 2026-11-04 for the same platform list. The fix then was to strip the bare name sequence from the description entirely; the live listing (listing-v3/description.txt) says "the supported AI sites" and "the major AI assistants" and passed. The Section B copy written on 2026-11-08 reintroduced the list under a "Supported:" label and the lesson did not carry over. Vivian's miss, owned here plainly.
- Fix applied the same night: in submission-0.5.13/store-copy.txt (the file the dashboard copy came from) and in LISTING-MATERIALS.md, the line now reads: "The major AI assistants are supported. The bar appears inside your chats on the supported AI sites and nowhere else on the web." (In LISTING-MATERIALS the wording wraps across lines.) A standing rule against the bare sequence, with both dates and the violation reference, is now written into LISTING-MATERIALS.md at the top. The package itself is unchanged: same 0.5.14 zip, no code touched.
- Resubmission: the dashboard draft gets the one-line description fix, a save, and a fresh Submit for review, with auto-publish on approval as before. The published version stays 0.5.7 throughout.
- Resubmission CONFIRMED (browser task report, run 2026-11-09 3:59-4:04 AM PT): the dashboard showed the Rejected status with the Yellow Argon violation quoted as above; the one line was replaced in place in the Detailed Description and nothing else was touched (package still Draft Version 0.5.14; summary, screenshots, privacy answers, and Tools category unchanged). After Save draft ("Item saved."), a reload re-read the description at 4,587 characters (was 4,532, +55, exactly the line-length difference), the old line gone, the new sentence present exactly once, and a line-by-line comparison against the DESCRIPTION section of store-copy.txt found no other difference. Submit for review was confirmed with "Publish automatically after it has passed review" checked; no new warning or declaration appeared. Dashboard status after resubmission: "Pending review", draft tab "This draft is pending review.", and the Yellow Argon notice no longer shown. Awaiting Google review; on approval 0.5.14 publishes automatically and 0.5.15 goes in as the next draft.
