# Listing dress-up package, v2 (prepared 2026-11-03)

Files only. Nothing here has been uploaded. Tony pastes and uploads these
in the Chrome Web Store developer console himself. The shipped extension
is unchanged: this package dresses the store page for v0.1.9, the version
already published.

## What is in this folder

- description.txt: the rewritten store copy. A summary candidate at the
  top (exactly 120 characters, inside the store's 132 limit), then the
  detailed description, paste-ready plain text with caps headers and no
  markdown.
- screenshot-1-put-the-request-in.png (1280x800): the request placed in
  the chat box, bar idle.
- screenshot-2-self-report.png (1280x800): the AI's self-report arriving,
  bar counting sections, Compile still greyed.
- screenshot-3-compile-in-the-tab.png (1280x800): full report found,
  Compile lit in its gradient ready state.
- screenshot-4-capsule-is-yours.png (1280x800): capsule.md downloaded,
  shown as a file card; the bar reports Done.
- screenshot-5-take-it-anywhere.png (1280x800): a fresh chat in a
  different room, capsule.md attached, ready to install.
- promo-tile-small-440x280.png (440x280): the small promotional tile.
- promo-marquee-1400x560.png (1400x560): the marquee promotional tile.
- build_assets.py: the generator for every image in this folder
  (Python 3, PIL, Noto Sans). Rerun it to rebuild all images at once.

## Where each file goes in the console

Item: clonemy.ai: clone your AI, Store listing tab.

1. Summary field: paste the summary line from the top of description.txt.
2. Detailed description field: paste from "Your AI knows you." to the end
   of description.txt.
3. Screenshots: upload the five screenshot PNGs in numbered order, 1 to 5.
   The store minimum is one; five tell the whole loop.
4. Promotional images: upload promo-tile-small-440x280.png as the small
   promo tile and promo-marquee-1400x560.png as the marquee.
5. Save and submit the listing update for review, the usual way. A
   listing-only change does not need a new extension package.

## About the screenshots (read before uploading)

These are drawn composites, not captures of real chats. The backdrops are
generic chat rooms built from abstract message shapes: no platform logos,
no readable conversation text, no real user data. Each room is tinted to
suggest a different host without naming one.

The bar is drawn from the shipped code, not from memory. Values taken
from content.js in this repo: background #10101c, text #eaf2ff, border
1px rgba(140,150,255,.45), corner radius 12px, max width 300px, the two
button labels exactly as shipped, the idle Compile button at its shipped
grey, and the ready Compile button in the shipped gradient
linear-gradient(90deg,#7b6cff,#37c8e8 55%,#ff5da2) with dark ink #0b0b14
and a white border. Every status line in the bar is a string the product
itself displays, with one disclosure: the Done status in screenshot 4 is
the product's Done sentence shortened, because the shipped string also
names the capsule's flavor and a second sentence about compiling again.

Two deliberate differences from a live capture, both made for the store
page and both visible on inspection:

- The shipped bar's header reads "clonemy.ai on <site name>". The
  composites show the wordmark alone, so no host is named in the images.
- The caption strip along the bottom of each screenshot is part of the
  listing asset, not part of the product. It is drawn in the same style
  on all five so the story reads in sequence.

## Claims audit

Every factual claim in description.txt, traced to its source. Sources:
content.js and LISTING-MATERIALS.md in the extension folder, plus the
shipped behavior of v0.1.9.

- "It puts the extraction request into the chat box. It never presses
  send. You do." Source: content.js, the fill button handler and
  fillComposer; the bar's own idle status says "You press send, always."
- "Your AI writes its self-report... across 11 sections." Source:
  content.js SECTION_TITLES lists the 11 Capsule Format section titles.
- "The extension recognizes the finished report." Source: content.js
  findReport and scoreText, which score page text against those titles.
- "Compiles it locally into one file, capsule.md, and downloads it."
  Source: content.js compile handler calling the compiler and its
  download of capsule.md, all inside the tab.
- "Send capsule.md to any other AI, with the install line the capsule
  carries inside it." Source: the capsule artifact itself; the install
  line is part of the compiled file, per the Capsule Format.
- "A capsule compiled by this extension is the same artifact as one
  compiled on the website." Source: LISTING-MATERIALS.md, the published
  detailed description carried over unchanged on this point.
- "The Capsule Format is published at clonemy.ai/format." Source: the
  live format page; also stated in LISTING-MATERIALS.md.
- "One capsule moves between ChatGPT, Claude, Gemini, Grok, and
  Perplexity." Source: content.js PLATFORMS table, the five supported
  hosts of v0.1.9.
- "Capsules are restored into fresh chats and scored." The one testing
  line allowed in this copy, stated plainly. Source: the project's own
  restore testing practice.
- "Zero network requests: no fetch, no XMLHttpRequest, no WebSocket, no
  analytics, no telemetry." Source: content.js header comment and code
  inspection; there is no network code anywhere in the extension.
- "Plain, readable, dependency-free JavaScript." Source: the shipped
  package, vanilla JS with no dependencies, per LISTING-MATERIALS.md.
- "The only data stored is a small usage tally: which of your AIs you
  use, counted by days and sessions, kept in your browser's own local
  storage... The popup shows the tally in plain numbers and gives you an
  erase button." Source: content.js recordVisit (sessions and distinct
  days per platform, chrome.storage.local) and the privacy answers in
  LISTING-MATERIALS.md.
- The problem framing at the top of the description (months of teaching
  an AI, starting over when you switch) is framing, not a product claim,
  and asserts nothing about the extension.

Nothing in the copy states or implies user counts, ratings, reviews,
awards, or future features.
