# Build note: v0.5.11 (2026-11-08, LOCAL ONLY, not published)

The merged intake, whole shebang upfront. Tony approved the primer design, then merged it, then simplified the fill, all in one evening (design note: files/strategy/primer-first-two-prompt-intake-2026-11-08.md in the clonemy goal workspace, decision record items 10 to 13). The Chrome Web Store still serves v0.5.7. This build batches with v0.5.8, v0.5.9, and v0.5.10 into one submission later, per Tony's standing rule. Nothing was published.

## Sequencing, stated plainly

This build was written twice. The first write sat on top of the in-flight link-first tree; at 19:59 PT that tree was replaced wholesale by the sibling build's final state (v0.5.9 waiting states plus the auto-expand, no link-first machinery, original PROMPT and FALLBACK_HEADING), which discarded the first write's content.js changes. The build was then rewritten on that base, which turned out to be the cleaner foundation: the final design needed no failure-capture machinery at all, and this base never had any. The sim files and README entries from the first write survived the replacement and were updated, not rewritten. Final base: manifest 0.5.9 tree as replaced. Version: 0.5.11 (0.5.10 is the auto-expand build, recorded in the README).

## What shipped

Files: `content.js`, `manifest.json` (version only: 0.5.9 to 0.5.11 in this tree's line), `test-merged-sim.js` (new), `test-page-sim.js` and `test-cleanup-sim.js` (payload expectations for the sliced fill), `README.md` (v0.5.10 and v0.5.11 entries), this note.

### The fill: one shebang, one send

Step 1 is renamed "Step 1. Prime and extract" and fills SHEBANG, composed in code as:

1. The jog line (RECALL_LINE): "Jog your memory first. Can you remember which chat you told me to put the dog away? Answer from our actual past conversations. If you cannot find that exact moment, say so plainly, and do not rebuild a plausible version of it from guesses." First line of the fill, the swappable slot, the dog-away example as the default. The fill-time status line carries the invitation: "Swap the first line for a moment of your own, or send it with the example."
2. The bridge: PROMPT (the canonical link instruction, unchanged) and FALLBACK_HEADING.
3. The AI-facing slice of the bundled extraction document (see below).

The merged prompt as shipped, in full, is therefore the jog line above, then the link instruction, then the refined fallback heading (quoted in the refinements section), then the document slice beginning "# Instructions for the AI reading this". Step 1 is never disabled and nothing gates it. The bar never sends; the user presses send, always.

Tony's final framing, recorded in the design note as decision 13: the two-step split only bought processing speed (the AI reading the full text), an intake is something a user does a few times in a relationship, so speed was never the requirement. There is no link dependency and no failure-capture fallback fill in this build; a refusal reply and silence both leave the box exactly as the user left it (sim M5).

### The four refinements (from the live merged-prompt test)

The test capsule (Gemini, highest tier) proved the jog works and Sections 1 to 7 came back rich, and failed in four precise places. All four are carried in FALLBACK_HEADING's instructing text, which is the framing the AI reads wrapped around the document:

1. **Spec substitution.** Gemini stated in Section 0 that clonemy.ai/extract could not be opened directly, so it structured the report from clonemy.ai/format instead, an older shape as it described it. Heading now: the pasted copy "is the whole document, so never rebuild the task from any other page or specification."
2. **Late sections starved.** Section 8 truncated mid-word and Sections 9, 10, 11 arrived as "Not present in the source document." Heading now: "Keep it tight: one line per fact, no elaboration, and complete all 12 sections before expanding any of them. Sections 9, 10, and 11 are required: write them with EMPTY or MISSING entries rather than leaving them out, and in Section 11 include real quoted exchanges between us and the rapport block, or mark them MISSING."
3. **Section 0 receipt.** Heading now: "In Section 0, record the receipt: whether you found the moment in the first line above and which chat it came from, or plainly that you could not find it, and which sources you consulted: saved memory, custom instructions, conversation history, files."
4. **Output form.** Heading now: "Produce the complete report in both forms: one full code block in your reply that I can copy in a single click, first, and a downloadable file named capsule-source.md after it. No partial or summary versions."

Per-platform expectation, from the same test: Gemini's browser is search-bound. It could not open /extract "because it is not indexed by web search" and retrieved /format instead. With the whole shebang in the fill, no fetch is needed at all, so the substitution path is closed by construction rather than by confession.

### The header slice

The fill's document portion is sliced at runtime in content.js from the "# Instructions for the AI reading this" marker to the end of EXTRACT_DOC (AI_DOC). Everything above the marker (the document's title, the human how-to, the notes) is omitted from the fill. extract-doc.js and the canonical EXTRACTION-REQUEST.md are NOT edited: the bundled document stays whole for parity with the page, and the site file keeps its human header for standalone readers. If the marker is ever absent, AI_DOC falls back to the whole document (sim M7).

Measured saving: the document is 9,546 characters; the human header is 1,158 of them (12.1 percent). The shipped fill is 10,394 characters against 11,552 unsliced (jog 239, link instruction 550, heading 1,211, document slice 8,388, separators included). Reasoning: dual-audience text in an AI-bound paste is dead weight and a confusion surface, the AI reads instructions addressed to the human about itself; the human header remains load bearing only for the standalone file and the page, where a person actually reads it.

One watcher consequence, handled: the template markers were the human header lines, so the sliced echo stopped reading as the template and the watcher mistook the user's own sent shebang for the report. TEMPLATE_MARKERS gains two lines from the AI instructions themselves ("# Instructions for the AI reading this" and "You are being asked to write a structured self-report"), which a genuine report never opens with. Caught by the merged sims, fixed, re-verified.

### Detection: dual signal, split grades

The watcher reads the one reply stream for two signals in sequence: the recall answer at its head, and the report behind it (the existing section watcher, stability, waiting faces, and the v0.5.10 auto-expand, all unchanged).

- **Recall grade.** gradeRecall() runs while watching, once sent evidence exists (the latched flag, an answer seen, or the box itself reading sent, because the template state can persist for a whole wait without latching the flag). It reads the head of the first post-fill reply block, cut where the report's first heading begins, excluding the sent shebang (by its jog line and fallback heading) and baseline blocks. FOUND: a quoted exchange or a detailed locator answer. PARTIAL: a response about the moment with no retrieval detail. COLD (STRONG_COLD_PATTERNS): a holds-nothing admission, which warns immediately. COLD_RECALL (MOMENT_MISSING_PATTERNS): the moment alone not found, which changes no face at grade time.
- **Slot capture.** captureJog() reads the jog line from the box while the fill or the user's edit is there, and from the rendered sent message after; slotEdited records whether it differs from the example. The grade means less with a generic slot, which is one more reason the warning below never keys on the recall alone.
- **The warning keys on yield.** Grades split, per the live test (decision 12): Gemini was honestly cold on the example moment and warm on memory overall. So: the pre-compile warning ("This AI holds nothing about you yet. Compiling now would make an empty capsule.") fires when the recall missed AND the yield is empty, where empty yield means a finished report with at most 5 sections or at least 10 MISSING/EMPTY/"Not present" markers (emptyYield), or a reply that settles with the admission alone and no report behind it (two stable scans at partial score zero). At the ready moment a cold-graded find with an empty yield gets the warning face instead of the celebration, Compile still lit, bar still unfolding: a checked No at one click, or the empty file on purpose. A cold recall over a rich yield compiles normally with the normal ready face (sim M4). While warned, the waiting and template faces yield to the warning on both faces of the bar.

## Compiler identity: resolved, not restored

**This build did not change compiler.js.** No write in this build touched it; the file's mtime (2026-11-09 03:33 UTC, 19:33 PT) predates this build's first edit and falls inside the sibling v0.5.10 build window. At 19:28 PT the tree's compiler still hashed to the recorded canonical 1db1fde72805d891a0f514b1312f267e (21,182 bytes, the bytes in the v0.5.7 store zip, verified). It now hashes d9b62dad6b8f1e2cc7eafedcc90c656f (22,579 bytes).

Provenance of the d9b6 bytes, with evidence:

- They are byte-identical to the compiler.js bundled in the iOS app (~/workspace/clonemy-ios/CloneMy/Resources/compiler.js) and the Android assets (~/workspace/clonemy-android/app/src/main/assets/compiler.js), both verified by hash in this build.
- The source diff against the 1db1 bytes is additions only (11 diff lines, no deletions, no altered lines): a fidelity-stamp feature. The compiler reads a Fidelity declaration or Model line from the source report's head, emits a "Fidelity note" paragraph and a "Source fidelity: HIGH/LOW/UNKNOWN" line in the capsule header, and adds one "Restore fidelity" instruction line to the install protocol.
- Compile parity check, run in this build: the same full 12-section self-report compiled under both byte sets returns identical found, total, and flavor (12 of 12, Playful), and the outputs differ only by the three added fidelity lines. Zero lines removed or changed.

Conclusion: d9b6 is the current canonical compiler, the one the apps already ship; the extension's recorded canonical hash (1db1, in this build's brief and older notes) is the stale record, not the file. Restoring 1db1 would fork the extension compiler away from both apps and delete the fidelity-stamp feature, so it was NOT restored. Flag for the parent: update the canonical-hash record to d9b62dad6b8f1e2cc7eafedcc90c656f wherever it is pinned, and note the Android verify copy (~/workspace/clonemy-android/verify/assets/compiler.js) still holds 1db1 bytes.

## Follow-ups flagged for the extraction document (not built here)

These refinements arguably belong inside the canonical extraction document itself, not only in the extension's heading, for the surfaces that never see the heading (site doors, manual paste, the apps). Exact wording recommended, mirroring the shipped heading:

1. In the document's AI instructions, after the output-form rules: "Follow this document exactly. If you were sent a link to it and cannot open the link, say so plainly and stop; do not rebuild the task from any other page or specification."
2. A length-discipline rule with the existing specifics rules: "One line per fact, no elaboration. Complete all 12 sections before expanding any of them. Sections 9, 10, and 11 are required: write them with EMPTY or MISSING entries rather than leaving them out. Section 11 must include real quoted exchanges and the rapport block, or mark them MISSING."
3. In Section 0's own instructions: "Record the receipt: whether you found the moment the user asked about and which chat it came from, or plainly that you could not find it, and which sources you consulted: saved memory, custom instructions, conversation history, files."

Site follow-ups, from decision record item 12 as corrected against source: verify live /format bytes against files/site/format/index.html (the source is already the 12-section canon; Gemini's "11-section v3" account is unreliable, a stale cache or its own miscount, and AI self-reports about which page they read are unverified claims). Indexing coverage for /extract (Search Console submission, internal links) is a decision for Tony, not a defect: robots.txt allows all and sitemap.xml already includes the URL, and after this build the question is no longer load-bearing, since the fill needs no fetch.

Extraction self-report note: this build's own earlier obligation (the extraction self-report owed since Nov 7) is untouched by this build and remains owed through its own channel.

## Sims

- `test-merged-sim.js`: ALL PASS, 40 checks. M1 shebang composition byte for byte (fill equals SHEBANG, jog first, order jog < link instruction < fallback heading < AI marker), all four refinement clauses in the shipped fill, marker present, human header absent, all 12 headings and the closing line. M2 FOUND grade faces, normal ready. M3 STRONG cold warning on both faces, edited slot graded, empty-yield skeleton gets the warning ready face with Compile lit. M4 cold recall plus rich yield: no warning, normal ready (the live Gemini case). M4b cold recall plus settled empty yield: the warning fires. M5 refusal and silence produce no second fill, bar never sends. M7 markerless document fills whole.
- `test-page-sim.js`: ALL PASS (includes the v0.5.9 collapsed-hint scenario, the deliver hint byte check, and the auto-expand scenario; payload checks updated for the sliced fill).
- `test-cleanup-sim.js`: ALL PASS. `test-vault-sim.js`: ALL PASS. `test-pair-sim.js`: 8 passed, 0 failed.
- The sibling build's test-linkfirst-sim.js is not in this tree (removed with the link-first design it tested); its auto-expand scenario survives inside test-page-sim.js.

## Invariants

- `manifest.json`: version 0.5.11; permissions, hosts, and every other field unchanged from this tree's 0.5.9 manifest.
- `compiler.js`: untouched by this build; current bytes d9b62dad6b8f1e2cc7eafedcc90c656f, resolved in the compiler section above.
- `extract-doc.js`: untouched. MD5 06b8960de801fc8a391fe2ab23546cab before and after.
- No new string in content.js, the README entries, or this note contains an em dash.
- No network, permission, or host changes. Nothing published.
