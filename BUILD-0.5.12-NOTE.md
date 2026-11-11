# Build note: v0.5.12 (2026-11-08, LOCAL ONLY, not published)

A regeneration build: the bundled extraction document catches up with the canonical document after two site builds landed on it the same evening (v7.11: the human header removed at the source and the framing reframed in the user's first-person wants-page voice; v7.12: the title line renamed). Tony's standing direction covers this class of change: same document, every surface. The Chrome Web Store still serves v0.5.7; this build batches with v0.5.8 through v0.5.11 into one submission later. Nothing was published.

## What shipped

Files: `extract-doc.js` (regenerated), `content.js` (slice marker, template markers, PROMPT opening, two comments), `manifest.json` (version only: 0.5.11 to 0.5.12, compact format preserved, verified content-identical apart from the version string), `test-merged-sim.js`, `test-page-sim.js`, `test-cleanup-sim.js` (expectation pins, below), `README.md` (v0.5.12 entry; the v0.5.11 entry's marker quote annotated with the rename), this note. In the sibling trees, same evening: `~/workspace/clonemy-ios/CloneMy/Resources/extract.md` and `~/workspace/clonemy-android/app/src/main/assets/extract.md` re-synced, with dated entries appended to each tree's STATUS.md. No Swift or Kotlin code changed anywhere.

### The document, regenerated

`node build-extract-doc.js` regenerated the bundled copy from the canonical source (~/workspace/goals/alignment-capsule-product/files/EXTRACTION-REQUEST.md). The generator proves its own round trip: the string inside the generated file equals the source byte for byte, or it writes nothing. It wrote: 9,705 bytes of JS carrying 8,983 characters of document (extract-doc.js MD5 b95417941c90991ace0fd77768702db4).

The canonical document as regenerated: 8,983 bytes, MD5 118954c96a68718df87272a5a205bd23. Verified in the bundled string directly: first-person framing present (the document opens "I am moving to a new AI, and I want to take us with me"), human header absent (no "Send this file to your current AI", no "How to use"), old framing absent (no "You are being asked to write a structured self-report"). The document shrank from the pre-reframe 9,546 bytes in two steps: v7.11's restructure took it to 8,997, and the v7.12 title rename (a 14-character shorter line) to 8,983.

### The rename: "# Instructions for MY ai"

Tony's order (2026-11-08 ~8:17 PM PT): the document's title line changes from "# Instructions for the AI reading this" to "# Instructions for MY ai" (exact string, MY capitalized, ai lowercase), so the title speaks as the owner, matching the wants-page voice. That line is the extension's slice marker, so the rename is a coordinated change:

- `AI_DOC_MARKER` in content.js is now "# Instructions for MY ai". The canonical file landed with the new title before this build's regeneration (verified at the regeneration step: first line of the canonical file, MD5 above), so the final state is built from the renamed canonical.
- Since site v7.11 the document is AI-only from its first line, so the slice (`EXTRACT_DOC.slice(indexOf(marker))`) normally returns the whole document; the marker logic remains as a guard and the markerless fallback (fill the whole document rather than failing) is unchanged, still sim-covered (M7, with its doctored string updated to the new title).
- TEMPLATE_MARKERS: the new title added; the old title kept, so an echo of a pre-rename copy (a downloaded file from before tonight) is still recognized as the template; and the second AI-instruction marker updated from the dead "You are being asked to write a structured self-report" to the document's new first line, "I am moving to a new AI, and I want to take us with me". The three legacy human-header markers stay for the by-hand route with older copies.
- The 12 section headings (### 0. Meta through ### 11. Voice) are not the title line and are byte-identical; every heading expectation in the suites passes unchanged.

### The link instruction, in the owner's voice

Tony's addition (2026-11-08 ~8:18 PM PT): where the fill introduces the extract link, it reads as the user presenting their own file on their own page, not as a product directing traffic. PROMPT as shipped in this build, verbatim:

"I keep the instructions for this in a file of my own, on my own page: https://clonemy.ai/extract. Please follow the instructions in that file exactly. It asks you to write a structured self-report: your configured personality and tone, my preferences, my standing rules, the people in my life, and our relationship, drawn from our history together. Produce the complete document it asks for, in both forms: one full code block in your reply that I can copy in a single click, first, and a downloadable file named capsule-source.md after it. If you cannot open the link, say so plainly and I will paste the file instead."

Only the opening changed (it read "Open https://clonemy.ai/extract and follow the instructions in that file exactly."); the self-report description and the closer are byte-identical to v0.5.11. This text is canonical: the site's PROMPT and door prefill values are being matched to this exact wording by the parallel site build.

FALLBACK_HEADING is byte-identical to v0.5.11, deliberately: it speaks of "the page" ("IF THE PAGE DID NOT OPEN... if the page opened, follow the page"), never of opening a link, so the ownership treatment does not apply to it, and its either/or force and all four refinement clauses stand untouched.

### Sim pins updated, and why

- test-merged-sim.js: M1 ordering check now keys on the new opening ("I keep the instructions for this in a file of my own") and the new title; two new M1 checks pin the owner-voice opening and the paste-fallback closer verbatim; M1 slice check and the M7 doctored-doc replacement use the new title; the M1 closing-line pin follows the reframed Section 10 text ("This section protects both of us from your guesses, so be thorough.", was "everyone").
- test-page-sim.js: payload ordering and marker checks use the new title; closing-line pin updated as above.
- test-cleanup-sim.js: fallback-document completeness check uses the new title; closing-line pin updated as above.
- Heading expectations were not touched in any suite and pass unchanged.

## Sims, final tree

- test-merged-sim.js: ALL PASS (40 checks, 0 failures; includes the byte-composition shebang checks, all three recall grades, both yield combinations, the no-second-fill rule, and the markerless fallback).
- test-page-sim.js: ALL EXTENSION SIM TESTS PASS.
- test-cleanup-sim.js: ALL CLEANUP SIM TESTS PASS.
- test-vault-sim.js: ALL VAULT SIM TESTS PASS.
- test-pair-sim.js: 8 passed, 0 failed.

Template recognition against the new document was exercised by the page and cleanup suites (the echoed shebang on synthetic pages reads as the template via the new title and first-line markers) and by the merged suite's composition checks.

## App trees

- iOS: ~/workspace/clonemy-ios/CloneMy/Resources/extract.md replaced with the canonical bytes (was MD5 36ac6b4ecaf27942686af10292cf9e33), now 8,983 bytes, MD5 118954c96a68718df87272a5a205bd23, cmp-verified byte-identical to the canonical file. Dated entry appended to ~/workspace/clonemy-ios/STATUS.md (it also notes the compiler ratification, already recorded there in its own "Compiler canon ratified" entry). Resources/compiler.js untouched. No Swift code changed. On-device rebuild and Extract-tab re-verify owed with the next Studio build session, recorded in the STATUS entry.
- Android: ~/workspace/clonemy-android/app/src/main/assets/extract.md replaced the same way (was MD5 36ac6b4ecaf27942686af10292cf9e33), cmp-verified byte-identical. assets/compiler.js untouched (MD5 d9b62dad6b8f1e2cc7eafedcc90c656f). Dated note appended to ~/workspace/clonemy-android/STATUS.md; the mergedDebugAssets intermediate under app/build/ picks the asset up on the next build.

## Invariants

- compiler.js untouched by this build: MD5 d9b62dad6b8f1e2cc7eafedcc90c656f before and after (the canonical compiler Tony ratified on 2026-11-08).
- manifest.json: version only (0.5.11 to 0.5.12), compact formatting preserved.
- Zero em dashes in the new strings and records.
- All three surfaces (extension bundled string, iOS Resources, Android assets) now carry the same extraction text, proven by one MD5: 118954c96a68718df87272a5a205bd23.
