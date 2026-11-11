# Chrome Web Store listing materials
Drafted 2026-11-01 by Vivian for Tony's submission pass.
Revised 2026-11-08 for the intake change that landed that
night, and for the positioning Tony set the same night.
Corrected again late 2026-11-08: the pending local build is
v0.5.12 (the document re-sync build), not v0.5.11; every
pending-version reference below now names v0.5.12.
Updated 2026-11-09: the batch shipped as v0.5.14 (v0.5.13
carried the homework build, v0.5.14 the pre-send face fix),
submitted to the Chrome Web Store on 2026-11-09 and pending
review, set to publish automatically on approval. Section B
below is the copy submitted with it.
Everything below is paste-ready only where it says so, and the
live versus pending split in this file governs what can be
pasted today.

## The split, read this first

- LIVE, in the Chrome Web Store today: v0.5.7. The store
  listing that serves today is listing-v3/description.txt.
  Section A below describes only what that version does, and
  only Section A copy can go into the store today.
- IN REVIEW: v0.5.14, submitted 2026-11-09, batching v0.5.8
  through v0.5.14 into one submission. It is set to publish
  automatically when Google's review passes, and the public
  listing stays on v0.5.7 until that moment.
  Section B below is the copy submitted with v0.5.14. Do not
  imply anywhere that it is downloadable today.
- STANDING RULE, burned twice (2026-11-04 and 2026-11-09,
  violation reference Yellow Argon): never put the seven
  platform names in a bare sequence anywhere in store copy.
  Google's keyword-spam filter rejects it on sight, however
  the line is labelled ("Supported:", "Supported at launch:",
  "Works with"). The phrasing that passes is the live
  listing's: "the supported AI sites", "the major AI
  assistants", no names in a row. The names belong in the
  screenshots and promo images, not in description text.
- Extension code, manifest, and README were not edited for
  this materials pass. This file is materials only.

## Positioning, applies to both sections (Tony, 2026-11-08)

"everyone on this topic is focused on files, storage and byte
for byte transfer when we are trying to transfer vibes."

Everyone else's transfer question is bytes: exports, storage,
lossless copies of the logs. clonemy transfers the calibrated
pattern: the persona, the rules, the judgement, and the voice
an AI built with its user. A capsule is a file because a file
is what a user can hold, read, back up, and carry himself,
not because the file is the point. Where the copy below used
to lead with file mechanics (put a request in, get a file
out), it now leads with that pattern first and treats the
file as the container. The mechanics stay, stated plainly,
underneath it.

## Name (decided 2026-11-01, delegated by Tony, chosen by Vivian)
"clonemy.ai: clone your AI". The em dash form broke the house
rule for public copy. Applied to the manifest and the package
rebuilt.

## Short description (decided with the name; this is now the manifest description)
Your Capsule. A(i) personality, in a file, yours to keep. Forever. Compile your AI's self-report into a capsule you own.
(120 characters, inside the store's 132 limit. A variant
carrying the "nothing leaves your browser" line measured 147
characters and did not fit. That promise leads the detailed
description instead. The short description is unchanged in
both the live v0.5.7 and the pending v0.5.12 manifest.)

---

## Section A: LIVE, v0.5.7, copy that is accurate today

### Detailed description, live version

Your Capsule. A(i) personality, in a file, yours to keep.
Forever.

Everyone on this topic is focused on files, storage and byte
for byte transfer. clonemy is trying to transfer vibes: the
pattern your AI spent months calibrating with you, its
persona with you, your rules, your judgement calls, and its
voice with you. Switch AIs and that pattern stays behind,
locked inside one company's product, even if you keep a
perfect export of every log. The logs are not the pattern.
The capsule carries the pattern in a plain file because a
file is what you can hold, read, and carry yourself, not
because the file is the point.

You have spent months teaching your AI how you work: your
preferences, your rules, your people, your projects. clonemy
lets you take that tuning with you.

This extension lives inside your AI's chat tab and does three
things:

1. It puts the clonemy.ai extraction request into the chat
   box. It never presses send. You do.
2. It watches for your AI's finished self-report and
   recognizes it by the Capsule Format's 12 sections.
3. It compiles the report into capsule.md, locally, in the
   tab, and downloads the file. Send that file to any other
   AI, with the install line the capsule carries, and the new
   AI picks up as your AI: your rules, your people, your open
   loops. Every capsule ends with a self-check the new AI
   answers from the capsule alone, then a prediction round:
   three predictions about how you would act, which you grade
   in one line (yes, yes, no), then a voice round: one
   ordinary answer in the voice the capsule installed, graded
   the same way, sounds like them or sounds new, so a miss
   becomes a saved correction instead of a surprise later.

(Update, 2026-11-05: the prediction round shipped in compiler
v6.59 and is also described in the current listing text,
listing-v3/description.txt, under WHY IT IS DIFFERENT. The
short description above is unchanged: it is the manifest
description carried in the store package, 120 characters,
inside the store's 132 limit.)

Nothing leaves your browser. The extension makes zero
network requests: there is no fetch, no XMLHttpRequest, no
WebSocket, no analytics, no telemetry anywhere in its code,
which is plain, readable, dependency-free JavaScript. The
only stored data described in this materials file is a small
usage tally (which of your AIs you use, counted by days and
sessions) kept in your browser's own local storage so the
extension can recognize your regular AI. The popup shows
that tally in plain numbers, with an erase button. See the
flag at the end of this file before reusing this paragraph
for a new submission.

The major AI assistants are supported. The bar appears
inside your chats on the supported AI sites and nowhere
else on the web.

The Capsule Format is open and published at clonemy.ai/format.
The spec is published under CC BY 4.0 at DOI
10.5281/zenodo.24049746. A capsule compiled by this extension
and a capsule compiled on the website are the same artifact.

### What the live version does NOT do yet

So the live copy never borrows from the pending build, the
v0.5.7 store version does not yet have: the recall jog as the
first line of the fill, the AI-facing slice of the document
with the human how-to removed, the watcher grading the
answer's yield, the warning before an empty compile, the
collapsed bar narrating the wait, or the bar opening itself
when Compile is ready. All of those are Section B.

---

## Section B: SUBMITTED with v0.5.14 on 2026-11-09, rejected on a keyword-spam flag the same night, resubmitted with the flagged line removed and confirmed back in Pending review (2026-11-09, ~4:04 AM PT)

Do not paste any of this into the store until the v0.5.14
submission ships. When it ships, this section replaces the
three steps in Section A. The positioning lead, the privacy
promises, the supported list, and the open format note in
Section A carry over unchanged.

### What changes in the pending build, by origin build

- v0.5.11, the intake itself: Step 1 becomes "Prime and
  extract." One prompt, one send, the full document up front.
  A two-step link-first version was built and cut the same
  night. An intake is something a user does a few times, so
  speed was never the point. No second fill exists.
- v0.5.11, the jog: the first line of the fill is a recall
  question, a slot the user swaps for a moment of their own.
  The shipped example is: "Jog your memory first. Can you
  remember which chat you told me to put the dog away?" The
  AI must search its history first, answer the jog honestly,
  and never invent the moment. Section 0 of the report records
  the receipt: whether the moment was found, which chat it
  came from, and which sources were consulted.
- v0.5.12, document re-sync: the bundled extraction document
  is the current canonical document, so the fill's document
  now starts at "# Instructions for MY ai" (the title line
  renamed in site v7.12), and the prompt framing the fill
  opens in the owner's voice: "I keep the instructions for
  this in a file of my own, on my own page." No behavior
  change beyond the document bytes and that opening.
- v0.5.11, the wants page: the fill carries the extraction
  document sliced to its AI-facing part, written as the user's
  own wants, starting at the document's title line (see the
  v0.5.12 note above for its current wording). The human
  title and how-to are packaging for the
  standalone file and stay out of the paste. The framing
  around it carries the live-test fixes: follow the pasted
  document and never rebuild the task from any other page or
  specification, one line per fact, complete all 12 sections
  before expanding any of them, Sections 9, 10, and 11 are
  required with EMPTY or MISSING entries rather than left
  out, and the report comes back in both forms, one full code
  block first and a downloadable capsule-source.md after it.
- v0.5.11, grading and the empty warning: the watcher reads
  the one reply for two signals, the recall answer at its
  head (graded FOUND, PARTIAL, or COLD) and the report behind
  it. The warning keys on the report's yield, with the recall
  grade as corroboration only. A finished report with at most
  5 sections, or at least 10 MISSING, EMPTY, or "Not present"
  markers, counts as empty yield. A cold recall over a rich
  yield compiles normally. A cold recall over an empty yield
  gets the warning face instead of the ready face, with
  Compile still lit: "This AI holds nothing about you yet.
  Compiling now would make an empty capsule."
- v0.5.9, waiting narration: the collapsed bar narrates the
  wait instead of holding a stale label. Its faces, in order:
  "Request is in the box: press Send in the chat." then
  "Waiting for the answer..." with a live count, "Waiting for
  the answer: N of 12 sections so far.", "That is the
  instructions text, not the report." when only the template
  is on the page, "Answer arriving: making sure it has
  finished..." while the answer is still changing, and
  "Self-report found: press Compile." when the report
  settles. If the answer vanishes, both faces reset.
- v0.5.10, auto-open on ready: when Compile lights, a
  collapsed bar opens itself once, so the ready state is on
  screen. Folding it again by hand is respected, and it does
  not open a second time for the same find.
- v0.5.8, in the same batch, cosmetic only: the bar and the
  popup default to light, with dark kept only on positive
  detection. No listing copy is needed for this one.

### Detailed description, pending version (paste only at the v0.5.12 submission)

Your Capsule. A(i) personality, in a file, yours to keep.
Forever.

Everyone on this topic is focused on files, storage and byte
for byte transfer. clonemy is trying to transfer vibes: the
calibrated pattern your AI built with you, its persona with
you, your rules, your judgement, and its voice with you. An
export can move your logs perfectly and still leave that
pattern behind. The capsule carries the pattern in a plain
Markdown file because a file is what you can hold, read, and
carry yourself. The file is the container, not the point.

The intake is one prompt and one send, and it starts by
making sure there is something to transfer:

1. Prime and extract, in one fill. One click puts the whole
   request into the chat box, full document up front. The
   extension never presses send. You do. The first line is a
   jog, a recall question you can swap for a moment of your
   own, that makes the AI search its history before it
   writes. The shipped example asks about a chat where you
   told it to put the dog away. If that moment never
   happened, the AI must say so plainly and never invent it,
   and it records that receipt, and the sources it checked,
   at the top of its report. The document behind the jog is
   written as your wants page, not a system template, and
   the copy the AI reads has the human instructions taken
   out of it entirely. It asks for all 12 sections of the
   Capsule Format, one line per fact, every section finished
   before any is expanded.
2. Watch, grade, and warn if it came back empty. The
   extension watches the answer arrive and narrates the
   wait, even folded down: waiting, a live section count,
   still arriving, and found. It grades the recall answer at
   the head of the reply and, separately, how much of the
   report actually came back. This matters because the same
   AI can return a rich report from one session and an
   honestly empty one, 11 of 12 sections empty or missing,
   from another, when a session never loaded its memory of
   you. If the yield is empty, the bar warns you before you
   compile an empty capsule. Compile stays available if you
   want the empty file on purpose, and a missed jog moment
   over a rich report compiles normally.
3. Compile it, in the tab. When the report settles, the bar
   opens itself and lights Compile. One click compiles the
   report locally into capsule.md and downloads it. Nothing
   is uploaded, because nothing leaves the browser. Install
   that file into any other AI with the line it carries, and
   the new AI picks up as your AI. Every capsule ends with a
   self-check the new AI answers from the capsule alone, a
   prediction round you grade in one line, and a voice round
   graded the same way, so the pattern is verified against
   you, not just hoped for.

Nothing leaves your browser. The watcher, the grading, and
the compiler all run locally in the tab. The extension makes
zero network requests of its own.

---

## Privacy practices (dashboard answers, as drafted 2026-11-01)
- Single purpose: extract the user's AI self-report on
  supported AI sites and compile it into a portable capsule
  file, locally in the tab.
- Permission justification, storage: stores a per-site usage
  tally (sessions and days) in browser-local storage only, so
  the extension can tell which AI the user relies on. Nothing
  is transmitted; the popup displays the tally and offers an
  erase button.
- Permission justification, host access (the seven supported
  AI sites): required to show the clonemy bar on those pages,
  fill the chat box with the extraction request at the user's
  click, and read the AI's self-report from the page so it can
  be compiled locally.
- Data collected: none. No user data is collected,
  transmitted, sold, or shared. There is no network code in
  the extension.
- Remote code: none. All code is in the package.
- Pending build note: the v0.5.9 to v0.5.12 changes add no
  network code, no new permissions, and no new host access.
  The recall grading and yield grading read the same page the
  watcher already reads, and run locally.

## Screenshots (1280x800 PNG)

Live, v0.5.7, already covered by the existing shot set:
1. The clonemy bar on ChatGPT, idle state ("1. Put the
   request in the chat").
2. The bar with a finished report found and the Compile
   button lit ("Self-report found, 12 of 12 sections").
3. capsule.md after download: the head of the file (capsule
   title and install protocol) or the human block at the end.
One screenshot is the store minimum; these three tell the
whole story of the live version.

Pending, to capture from the local v0.5.12 build at
submission time, never from the store build:
4. The fill in the box with the jog as its first line, and
   the line about swapping in a moment of your own.
5. The folded bar mid-wait, reading "Waiting for the answer:
   N of 12 sections so far."
6. The warning face on an empty yield, Compile still lit:
   "This AI holds nothing about you yet. Compiling now would
   make an empty capsule."
7. The bar opened by itself at the ready moment, Compile lit.
Shots 4 to 7 replace or extend shots 1 to 2 at the v0.5.12
submission. They cannot be taken today from anything a store
visitor can download.

## Package
Live: clonemy-extension-0.5.7.zip is the package the store
serves. This materials file makes no claim about its contents
beyond the version.
Pending: the v0.5.12 submission package is to be built from
this folder at submission time (manifest.json, compiler.js,
content.js, popup.html, popup.js, README.md, icons/, and the
other files the build notes name). Test simulators and this
document are excluded. No v0.5.12 package is published yet.

## Submission order (Tony, dashboard, for the pending batch)
1. Reload the unpacked extension at v0.5.12 and run the live
   checks named in the build notes.
2. Upload the v0.5.12 zip under the clonemy.ai publisher
   account.
3. Paste name, short description, and the Section B detailed
   description, category Productivity, language English. Only
   at this step does the listing start describing the jog,
   the grading, the waiting narration, and the auto-open.
4. Upload the screenshots, including the pending shots above.
5. Fill the privacy tab, after resolving the flag below.
6. Submit for review. Review timing is Google's from there.
   Until the submission ships, the store keeps serving
   v0.5.7 and Section A stays the accurate listing.

## Flagged, not changed in this pass
- Privacy and storage scope: this materials file was drafted
  at v0.1.9 and describes storage as the usage tally only.
  The current code and listing-v3/description.txt also
  describe a capsule vault and optional browser sync of that
  vault as encrypted chunks in the browser's own sync
  storage. That wider description was not folded into the
  privacy answers above in this pass, because this pass was
  scoped to the intake change and the positioning line, and
  the sync story has its own gating in Tony's rules. Resolve
  the privacy answers against listing-v3 and the shipped code
  before the v0.5.12 submission is filed. Do not file with
  the v0.1.9 tally-only answers if the shipped package does
  more than they say.
- No sync claim was added to any Reddit draft in the
  companion pass, per the same gating. The browser sync
  paragraph already present in listing-v3 was left exactly
  as it was, in that file, untouched by this pass.

---

## Audit correction, 2026-11-11 (Limited Use audit of v0.5.15)

A rule-by-rule audit of the live v0.5.15 package against the
Chrome Web Store Limited Use requirements found the blanket
wording in Sections A and B above ("Nothing leaves your
browser", "zero network requests", "no WebSocket anywhere in
its code") inaccurate for any package that includes the phone
shuttle: pair.js registers its one-time code with the public
PeerJS broker over a WebSocket, and the capsule crosses to the
user's phone over a direct encrypted connection after the
phone accepts. The shuttle is disclosed on the pair page
itself and on the shuttle page, but the listing text never
mentioned it and denied the connection existed.

Corrected copy now stands in listing-v3/description.txt (the
PRIVACY, PLAINLY paragraph rewritten, the shuttle named in
the flow) and in the package README. The live store listing
still carries the old wording until the corrected description
is pasted in the dashboard or the next version is submitted.
That paste is a remaining action for Tony.

The privacy practices answers drafted 2026-11-01 in this file
(the flag at the end already warned about them) must be
checked in the dashboard against the shipped code before any
next filing: the shipped package keeps a usage tally, a
pending capsule, the vault, a delivered record, and a
last-door preference in local storage, offers optional
browser sync of the vault as encrypted chunks, and includes
the shuttle transfer above. Full audit record:
~/workspace/goals/alignment-capsule-product/files/limited-use-audit-v0.5.15.md

---

## Privacy practices, brushed up 2026-11-11 (supersedes the 2026-11-01 draft above)

Tony approved the brush-up on 2026-11-11, the same day as the
Limited Use audit of v0.5.15. The dashboard-ready paste sheet is
~/workspace/goals/alignment-capsule-product/files/privacy-answers-v0.5.15.md
(each dashboard field labelled, text ready to paste verbatim).
The answers below match it in substance and supersede the
"Privacy practices (dashboard answers, as drafted 2026-11-01)"
section above, which described the tally only. This resolves the
standing flag at the end of this file: the answers are now
resolved against listing-v3 and the shipped code, as audited.
The dashboard itself cannot be read from outside, so what the
live privacy tab currently says is still unverified until the
sheet is pasted.

- Single purpose: extract the user's own AI self-report on
  supported AI sites and compile it into a portable capsule
  file the user owns, locally in the tab; keep the user's
  capsules in a local vault for delivery into another of their
  AI accounts, optional sync across their own browsers, or the
  phone shuttle, always at the user's click.
- Permission justification, storage: chrome.storage.local
  holds the platform tally (cmai_tally, per-platform days and
  sessions with timestamps, shown in the popup with an erase
  button), one pending capsule (cmai_pending, 24-hour TTL), the
  vault (cmai_vault, latest capsule per AI plus one retained
  previous version), the delivered record (cmai_delivered), the
  last-door preference (cmai_lastdoor, orders the delivery
  buttons only), and, only when the user turns sync on, the
  sync settings and phrase (cmai_synckey, cmai_syncbase,
  cmai_syncconf, cmai_syncnote, cmai_syncphrase; the phrase is
  stored only so the popup can show it back on request).
  chrome.storage.sync holds the vault as AES-GCM ciphertext
  chunks (csmeta plus cs0 to cs63) only when sync is on,
  encrypted under a key derived from the user's six-word
  phrase (PBKDF2, 100,000 iterations) and carried by Chrome
  Sync to the user's own browsers. Correction to the v0.5.13
  staging copy: the phrase IS stored, for that show-back
  purpose; the staging copy's "never stores" wording was
  wrong and is superseded here.
- Permission justification, host access: exactly the 10
  origins of the 7 supported platforms (chatgpt.com,
  chat.openai.com, claude.ai, gemini.google.com, grok.com,
  www.perplexity.ai, perplexity.ai, muse.ai, www.meta.ai,
  meta.ai), required to show the bar, fill the chat box at the
  user's click (the extension never presses send), read page
  text locally to recognize the finished self-report (the
  watcher), and place a capsule into another supported AI's
  chat box at the user's click.
- Data handled: website content (the self-report text, read
  locally and processed in memory) and the narrow tally form
  of web history (the 7 supported sites only, counted by days
  and sessions, never transmitted). Nothing else. No
  analytics, no telemetry, no third-party calls.
- Transfers, complete list, each user-initiated or
  user-enabled: (1) Chrome Sync ciphertext, as above; (2) the
  phone shuttle: rendezvous metadata (one-time code, both IP
  addresses, time) to the public PeerJS broker, and the
  capsule peer-to-peer over WebRTC to the user's own phone
  after the phone accepts a named offer, one-shot code,
  10-minute life, 25 MB cap; (3) delivery into another AI at
  the user's click, sent only when the user presses send
  there. Nothing is transferred to clonemy; there is no
  clonemy server in any flow, and nothing readable ever
  leaves the device.
- No sale or transfer of user data to third parties outside
  the approved use cases; no use or transfer for purposes
  unrelated to the single purpose; no use or transfer to
  determine creditworthiness or for lending purposes. No
  advertising use. No human reading of user data. The three
  Limited Use certifications on the dashboard can each be
  certified yes.
- Remote code: none. All code is in the package.
