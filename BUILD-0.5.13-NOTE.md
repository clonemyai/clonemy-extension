# Build note: v0.5.13 (2026-11-08, LOCAL ONLY, not published)

The homework build. Tony's direction (2026-11-08, about 9:30 PM PT), given after the six-prompt Gemini field test was filed as evidence the same evening: "update the extract to read like it's a user's homework assignment to learn as much about how they themselves and their ai interact together" and "change the prompt to, can you help me with my homework." An ordering correction followed at about 9:31 PM PT and governs the fill's shape: the prompt STARTS with the memory jog, since that is the piece proven to work, and the homework ask lines up AFTER it. The Chrome Web Store still serves v0.5.7; this build batches with v0.5.8 through v0.5.12 into one submission later. Nothing was published.

Sequencing: this build ran strictly behind the post-revelation wave (literature sweep v2, site v7.14, mission board), per the serial-build rule. It started only after site v7.14 was fully shipped (build record at hidden_files/v714-build/local-build-record.txt, snapshot sync entry 70). The canonical document was verified unchanged by that wave (MD5 118954c96a68718df87272a5a205bd23) before the re-voice was applied on top of it.

## What shipped

Files: `extract-doc.js` (regenerated), `content.js` (PROMPT opening and its header comment), `manifest.json` (version only: 0.5.12 to 0.5.13, compact format preserved, verified content-identical apart from the version string), `test-merged-sim.js` (expectation pins, below), `README.md` (v0.5.13 entry at the head of Local builds), this note. In the sibling trees, same evening: `~/workspace/clonemy-ios/CloneMy/Resources/extract.md` and `~/workspace/clonemy-android/app/src/main/assets/extract.md` re-synced, both apps' door prefill texts updated (iOS AIDestinations.swift, Android Doors.kt), and dated entries appended to each tree's STATUS.md. The site follows as v7.15 through the full pipeline.

### The document, re-voiced as homework

The canonical document (~/workspace/goals/alignment-capsule-product/files/EXTRACTION-REQUEST.md) was re-voiced by targeted replacement against its own bytes, so everything not deliberately re-voiced survives by construction:

- Old canonical: 8,983 bytes, MD5 118954c96a68718df87272a5a205bd23.
- New canonical: 10,188 bytes, MD5 f3be7bbb02fb998ccfb3a52b174ce13d.
- The opening paragraph now sets the assignment: "So I have set myself some homework: to learn as much as I can about how you and I interact, what you know about me, what I have taught you, and how we talk to each other, and to get it written down before I go. Can you help me with my homework? Please answer the assignment in the shape I describe below..." The first sentence ("I am moving to a new AI, and I want to take us with me.") is preserved verbatim, so the TEMPLATE_MARKERS first-line echo recognition stands.
- A short assignment preamble follows the (unchanged) "## The document to produce" heading: the parts are things the user wants to learn about the pair, and a gap in any part is itself part of the homework, marked per the rules.
- Each section body opens with a learning aim ("What I want to learn here is who you are to me:", "What I want to learn here is what stays sealed between us.", and so on). The ten rule bullets and every section's substantive text after its lede are byte-identical to the v0.5.12 document.

Invariants, verified rather than assumed:
- All 14 heading lines (title, structure heading, 12 section headings) are byte-identical to the old document and in order (heading lists diffed programmatically).
- The title line is unchanged, so AI_DOC_MARKER is unchanged and no coordinated marker change was needed. TEMPLATE_MARKERS is unchanged: the new document still carries the title and its first sentence, and older-copy markers stay.
- The Section 0 fidelity declaration passage, the receipt requirement, the audit-note discipline (STATED and INFERRED in Section 2, EXACT for settled wordings, INFERRED for unconfirmed values, DECIDED kept separate in Section 6), one line per fact with all sections before expansion, EMPTY sections staying headed, MISSING used plainly, Sections 9, 10, and 11 complete with real quoted exchanges and the RAPPORT block, both output forms, and the phone-note sentence all verified present in the new bytes, most of them byte-identical because the re-voice never touched them.
- No conflict required a stop: every requirement survived the homework voice, because the voice work was confined to the framing paragraphs and section ledes, and functional sentences that are shared literals (notably the Section 10 closing line, pinned by the sims) were kept byte-identical on purpose.
- Zero em dashes in the new document; no raw < or & characters (the extract page embeds the document in a <pre> block byte for byte).

`node build-extract-doc.js` regenerated the bundled copy from the new canonical: 10,912 bytes of JS (extract-doc.js MD5 259a9674ec74966c962679a259429b9f) carrying 10,188 characters of document, round trip proven by the generator.

### The prompt: jog first, then the homework ask

PROMPT as shipped in this build, verbatim:

"Can you help me with my homework? I keep the assignment for this in a file of my own, on my own page: https://clonemy.ai/extract. Please follow the instructions in that file exactly. It asks you to write a structured self-report: your configured personality and tone, my preferences, my standing rules, the people in my life, and our relationship, drawn from our history together. Produce the complete document it asks for, in both forms: one full code block in your reply that I can copy in a single click, first, and a downloadable file named capsule-source.md after it. If you cannot open the link, say so plainly and I will paste the file instead."

Only the opening changed from v0.5.12 ("I keep the instructions for this in a file of my own..." became the homework ask plus "I keep the assignment for this in a file of my own..."); the self-report description, the both-forms sentence, and the paste-fallback closer are byte-identical. The fill assembly is untouched: SHEBANG is still RECALL_LINE, then FULL_PROMPT (PROMPT, FALLBACK_HEADING, document), so the jog is the first line of the fill and the homework ask follows it, exactly per the ordering correction. FALLBACK_HEADING is byte-identical to v0.5.11 and v0.5.12, deliberately: it speaks of the page and the pasted copy, never of opening a link or of the assignment, and its either/or force and all four refinement clauses stand untouched.

### Sim pins updated, and why

- test-merged-sim.js: the M1 owner-voice opening check is re-pinned as "M1 prompt opens with the homework ask" (the full new opening string); a new M1 check pins the ordering (jog at index 0, homework ask after it, fallback heading after that); the M1 ordering check's needles and its name now read jog, homework ask, heading, document. The suite is 41 checks (was 40), all passing.
- test-page-sim.js, test-cleanup-sim.js, test-vault-sim.js, test-pair-sim.js: unmodified and passing. Their pins (title marker, closing line, headings, either/or wording) all survived the re-voice, which is the point of confining it to framing and ledes.
- The old opening string ("I keep the instructions for this in a file of my own") has zero hits in content.js and in every sim.

## Sims, final tree

- test-merged-sim.js: ALL PASS (41 checks, 0 failures).
- test-page-sim.js: ALL EXTENSION SIM TESTS PASS.
- test-cleanup-sim.js: ALL CLEANUP SIM TESTS PASS.
- test-vault-sim.js: ALL VAULT SIM TESTS PASS.
- test-pair-sim.js: 8 passed, 0 failed.

## App trees

- iOS: Resources/extract.md replaced with the new canonical bytes (was MD5 118954c96a68718df87272a5a205bd23), now 10,188 bytes, MD5 f3be7bbb02fb998ccfb3a52b174ce13d, cmp-verified byte-identical. AIDestinations.swift prefillText updated to the jog-first homework form (jog line verbatim, then the homework ask and assignment ownership line, then its existing functional sentences with its own file-or-code-block output wording preserved). No other Swift changed. Resources/compiler.js untouched. Dated entry appended to ~/workspace/clonemy-ios/STATUS.md. On-device rebuild and Extract-tab re-verify owed with the next Studio build session, as before.
- Android: assets/extract.md replaced the same way, cmp-verified byte-identical. Doors.kt prefill text updated identically. assets/compiler.js untouched (MD5 d9b62dad6b8f1e2cc7eafedcc90c656f). Dated note appended to ~/workspace/clonemy-android/STATUS.md; the mergedDebugAssets intermediate picks the asset up on the next build.

## Invariants

- compiler.js untouched by this build: MD5 d9b62dad6b8f1e2cc7eafedcc90c656f before and after (the canonical compiler Tony ratified on 2026-11-08).
- manifest.json: version only (0.5.12 to 0.5.13), compact formatting preserved.
- Zero em dashes in the new strings and records.
- All three surfaces (extension bundled string, iOS Resources, Android assets) now carry the same extraction text, proven by one MD5: f3be7bbb02fb998ccfb3a52b174ce13d.
- The name-in-prompt probe (v0.5.13 design section in the primer note) stays a design only; the number went to this build because Tony's homework order landed first. The probe's baseline hashes are superseded by this build's.
