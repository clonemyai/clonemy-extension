# QR pairing build, overnight 2026-11-07

Tony's ask, about 03:31 PT: flesh out the QR idea and build it while
he slept. The idea, as agreed that night: the extension shows a QR
code, a phone scans it, and the capsule follows. The QR is the
handshake, never the cargo. It encodes one thing, the shuttle
rendezvous URL with a one-shot code in the hash
(https://clonemy.ai/shuttle.html#c=CODE), and the capsule itself
still crosses over the shuttle's accept-gated, chunked WebRTC
channel after the receiving screen accepts a named offer.

## What shipped

**The spec.** files/strategy/QR-PAIRING-SPEC.md in the clonemy goal
workspace: roles and flow, the payload format, why the transfer host
is a full extension page (popups close on focus loss), the bundled
library requirement under MV3, the security model (one-shot code,
ten minute expiry, accept gate, broker sees code and IPs and time,
never the file), receiver v2 as the future iOS app scanner, the sync
phrase courier noted as a later build on the same handshake, and
the failure and degradation behaviour, including the code in large
text for manual entry when no scan is possible.

**The site, v6.73, live.** Commit b92da64b on clonemyai.github.io.
The shuttle page now reads a code from its URL hash, fills it into
the receive field, and names it in the status line. A lowercase
scan is normalised, a malformed hash is ignored silently, and
nothing connects by itself: the visitor still knocks with the
ordinary Connect tap, and the accept gate from v6.72 is untouched.
The homepage changed only in its two version stamps. Full record:
goals/alignment-capsule-product/hidden_files/v673-build/live-verified.txt.

**The extension, build 0.5.7, packaged, not submitted.**
clonemy-extension-0.5.7.zip sits beside the 0.5.6 zip. Nothing was
sent to the Chrome Web Store and the listing was not touched. What
is new inside:

- The popup gains a "Send to phone" section whose button opens the
  pairing flow in a full extension page (pair.html, pair.js). The
  popup itself stays a pointer, because a popup closes on focus
  loss and a transfer host must outlive the user picking up their
  phone.
- The pairing page lists the vault's capsules newest first with
  platform names and versions, picks the newest by default, mints a
  one-shot shuttle code, registers as the shuttle's sending peer,
  and runs the shuttle protocol exactly: knock, named offer,
  accept, 16 KB chunks in a 16 chunk ack window, progress, and the
  code dying after one completed or declined transfer or ten
  minutes. A capsule picker change is locked out once the phone
  connects, so an offer can never be swapped mid-flight.
- The QR is drawn locally by the bundled qrcode-generator library
  from the rendezvous URL. No QR web service is ever called.
  PeerJS 1.5.4 is bundled at the same bytes the shuttle page loads
  from its CDN (92,865 bytes, MD5 c2c48b561e5d9099fd76b204ba543fe9).
- The code also stands in large text beside the QR, with its
  countdown, for the no-camera path.

## What is proven

Site, live and verified byte for byte: index.html 629,477 bytes,
MD5 c3a57c2a92a1d11c60bac7bbec0db6b3; shuttle.html 31,295 bytes,
MD5 6ab0d58667166bc2ea3b6b2d843b3c96. The jsdom suite passes 219 of
219 against the build and again against the live bytes (214 carried
checks plus new group AL, 5 checks, pinning the prefill, the
no-auto-knock property, the normalisation, the silent ignore, and
the hash block's construction). The canary passes 11 of 11 against
the live homepage, its compiler output identical to the golden.
The compiler block, the install line, and the tagline are
byte-identical to v6.72, and both changed files carry scope proofs:
reversing the edits reproduces the v6.72 baselines exactly. A
headless probe loading the real PeerJS library from its CDN passes
for all four hash shapes, valid, lowercase, malformed, and absent,
against the build and against the live bytes.

Extension, code level: the manifest diff against the published
0.5.6 package is exactly one field, the version. Permissions stay
storage-only, host permissions untouched, and no HTML file in the
package names a remote script source; every script the pairing
page loads is a bundled local file. The new pairing sim
(test-pair-sim.js) passes 8 of 8: bundled libraries load, the
vault picker lists a seeded two-entry vault newest first with
names and versions, the code box opens, the displayed code matches
the shuttle recipe, the QR rendered in the page is verifiably the
QR of the displayed code's rendezvous URL (module count and
viewBox recomputed from the bundled generator), the mint holds
over 200 samples, and the empty-vault load mints nothing and
explains itself. The three existing sims (cleanup, page, vault)
all still pass. Zero em dashes in every new file.

Protocol honesty: the pairing page's sender is the shuttle's
sender, adapted line for line from the page whose receiver side
was already exercised end to end at the application layer in the
v6.72 shuttle test on the Studio.

## What is NOT proven

No live end-to-end QR transfer has been run. jsdom has no
RTCPeerConnection, so no headless run here could complete a real
crossing, and the pairing page inside the Studio's Chrome plus a
phone scanning its QR is a two-device act that needs Tony awake.
Inside jsdom the page lands on the same friendly
browser-incompatible error the shuttle probe established in v6.72;
that is the environment's limit, not a product result. Also
unproven, by design: the unpacked test build runs beside the store
build with its own extension ID and its own empty vault, so the
morning test compiles a fresh capsule under the test build first.

## How to try it, three steps

1. On the Studio's Chrome: chrome://extensions, turn on Developer
   mode, Load unpacked, and pick the clonemy-extension folder in
   the workspace. It installs as a second clonemy beside the store
   copy, with its own empty vault.
2. Open any AI tab and compile a capsule with that test build's
   bar, so its vault has one. Then click the extension icon and
   press "Send to phone".
3. Scan the QR with your phone, tap Connect on the shuttle page it
   opens, accept the named offer, and watch capsule.md arrive. The
   code dies behind the transfer, as designed.

If it sings, the 0.5.7 zip is ready to upload whenever you say the
word. Nothing about the store changes until then.
