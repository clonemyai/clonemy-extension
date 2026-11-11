// clonemy.ai extension pairing page (v0.5.7).
// The sender half of the shuttle, hosted in a full extension
// page because a popup closes on focus loss and a transfer
// host must outlive the user picking up their phone. This
// page mints a one-shot shuttle code, registers as the
// shuttle's sending peer, and shows the rendezvous as a QR
// code (generated locally by the bundled qrcode-generator;
// no QR service is ever called) plus the code in large text.
// The payload is the newest capsule in the extension vault,
// or one the user picks. The protocol is the shuttle's own:
// knock, named offer, accept, 16 KB chunks inside a 16 chunk
// ack window, and the code dies after one completed or
// declined transfer or ten minutes, whichever comes first.
// Nothing here talks to a network beyond the PeerJS broker
// the shuttle already uses and discloses, and the WebRTC
// channel to the receiving browser.

"use strict";

var LETTERS = "ABCDEFGHIJKLMNPQRSTUVWXYZ"; // 25 letters, no O
var CODE_MS = 10 * 60 * 1000;
var CHUNK = 16384;
var WINDOW = 16;
var MAX_BYTES = 25 * 1024 * 1024;
var VAULT_KEY = "cmai_vault";
var PLATFORM_NAMES = {
  chatgpt: "ChatGPT", claude: "Claude", gemini: "Gemini", grok: "Grok",
  perplexity: "Perplexity", muse: "Muse", metaai: "Meta AI"
};

function $(id) { return document.getElementById(id); }
function fmtBytes(n) {
  if (n < 1024) { return n + " B"; }
  if (n < 1024 * 1024) { return (n / 1024).toFixed(1) + " KB"; }
  return (n / (1024 * 1024)).toFixed(2) + " MB";
}
function mintCode() {
  var c = "";
  for (var i = 0; i < 2; i++) { c += LETTERS.charAt(Math.floor(Math.random() * LETTERS.length)); }
  for (var j = 0; j < 4; j++) { c += String(Math.floor(Math.random() * 10)); }
  return c;
}
function setStatus(text, isErr) {
  var el = $("pairStatus");
  el.textContent = text;
  el.classList.toggle("err", !!isErr);
}

var payload = null;        // { name, bytes: Uint8Array }
var pairPeer = null, pairConn = null, pairCode = "";
var pairState = "minting"; // minting, live, connected, offered, sending, done, declined, expired, error
var spent = false;
var mintedAt = 0, timerInt = null, mintRetries = 0;
var ackWaiter = null;

function setPayload(text) {
  var bytes = new TextEncoder().encode(text);
  if (bytes.length > MAX_BYTES) {
    setStatus("That capsule is " + fmtBytes(bytes.length) + ". The shuttle carries up to " + fmtBytes(MAX_BYTES) + ".", true);
    return;
  }
  payload = { name: "capsule.md", bytes: bytes };
  if (pairState === "connected") { sendOffer(); }
}

function loadVault() {
  chrome.storage.local.get([VAULT_KEY], function (d) {
    var vault = d[VAULT_KEY] || {};
    var ids = Object.keys(vault).filter(function (id) { return vault[id] && vault[id].cur && vault[id].cur.text; });
    if (!ids.length) {
      $("vaultNote").textContent = "The vault is empty. Compile a capsule in one of your AI tabs first; it will be waiting here.";
      $("pickBox").querySelector("select").disabled = true;
      return;
    }
    ids.sort(function (a, b) { return vault[b].cur.ts - vault[a].cur.ts; });
    var pick = $("vaultPick");
    ids.forEach(function (id) {
      var cur = vault[id].cur;
      var opt = document.createElement("option");
      opt.value = id;
      opt.textContent = (PLATFORM_NAMES[id] || id) + " capsule, version " + cur.version + ", " + new Date(cur.ts).toLocaleString();
      pick.appendChild(opt);
    });
    $("vaultNote").textContent = "The newest capsule is picked. It is read from this browser's vault on this machine only.";
    setPayload(vault[ids[0]].cur.text);
    pick.addEventListener("change", function () {
      if (pairState === "connected" || pairState === "offered" || pairState === "sending") { return; }
      setPayload(vault[pick.value].cur.text);
    });
    $("codeBox").hidden = false;
    startSender();
  });
}

function renderQr(code) {
  var url = "https://clonemy.ai/shuttle.html#c=" + code;
  var qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  $("qrBox").innerHTML = qr.createSvgTag({ cellSize: 5, margin: 12, scalable: true });
}

function startSender() {
  pairCode = mintCode();
  $("pairCode").textContent = pairCode;
  renderQr(pairCode);
  mintedAt = Date.now();
  pairState = "minting";
  setStatus("Registering the code…");
  pairPeer = new Peer(pairCode);
  pairPeer.on("open", function () {
    pairState = "live";
    setStatus("Live. Scan the code with your phone, or type " + pairCode + " on the shuttle page there. Waiting for the phone to connect.");
    tickTimer();
    timerInt = setInterval(tickTimer, 250);
  });
  pairPeer.on("connection", onIncoming);
  pairPeer.on("error", function (err) {
    if (err && err.type === "unavailable-id" && mintRetries < 5 && !spent) {
      mintRetries++;
      try { pairPeer.destroy(); } catch (e) {}
      startSender();
      return;
    }
    if (pairState === "done" || pairState === "declined") { return; }
    if (err && err.type === "browser-incompatible") {
      pairState = "error";
      setStatus("This browser cannot make direct transfers. Try a current Chrome, Edge, Firefox, or Safari.", true);
      return;
    }
    pairState = "error";
    setStatus("The rendezvous could not be reached. Check the connection and reload.", true);
  });
  pairPeer.on("disconnected", function () {
    if (!spent && pairPeer && !pairPeer.destroyed) { try { pairPeer.reconnect(); } catch (e) {} }
  });
}

function tickTimer() {
  var left = CODE_MS - (Date.now() - mintedAt);
  if (left <= 0) { expireCode(); return; }
  var s = Math.ceil(left / 1000);
  $("pairTimer").textContent = "Dies in " + Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
}
function expireCode() {
  if (spent) { return; }
  spent = true;
  pairState = "expired";
  clearInterval(timerInt);
  $("pairTimer").textContent = "Expired.";
  setStatus("That code has expired. Nothing was sent under it.", true);
  $("pairAgain").hidden = false;
  if (pairPeer) { try { pairPeer.destroy(); } catch (e) {} }
}

function onIncoming(conn) {
  // One shot is literal: a second knock is refused, and a
  // spent code serves nobody.
  if (spent || pairConn) {
    conn.on("open", function () { try { conn.close(); } catch (e) {} });
    return;
  }
  pairConn = conn;
  conn.on("data", onSenderData);
  conn.on("close", function () {
    if (!spent && pairState !== "done") {
      setStatus("The phone closed the connection before the transfer finished.", true);
    }
  });
  conn.on("open", function () {
    pairState = "connected";
    $("vaultPick").disabled = true;
    setStatus("Phone found. The capsule is named in an offer; the phone decides next.");
    if (payload) { sendOffer(); }
  });
}

function sendOffer() {
  if (!pairConn || !payload) { return; }
  pairState = "offered";
  pairConn.send({ t: "offer", name: payload.name, size: payload.bytes.length, chunks: Math.ceil(payload.bytes.length / CHUNK) });
  setStatus("Offered " + payload.name + " (" + fmtBytes(payload.bytes.length) + "). Waiting for the phone to accept.");
}

function onSenderData(msg) {
  if (!msg || typeof msg !== "object") { return; }
  if (msg.t === "knock") {
    if (pairState === "live") {
      pairState = "connected";
      if (payload) { sendOffer(); }
    }
    return;
  }
  if (msg.t === "accept") {
    // The gate: this branch is the only road to sendChunks.
    if (pairState === "offered" && payload && pairConn) { sendChunks(); }
    return;
  }
  if (msg.t === "ack") {
    if (ackWaiter && typeof msg.n === "number" && msg.n >= ackWaiter.target) {
      var w = ackWaiter; ackWaiter = null; w.resolve();
    }
    return;
  }
  if (msg.t === "decline") { endSend("declined"); return; }
  if (msg.t === "received") { endSend("done"); return; }
}

// The one road in: chunks leave this browser only from the
// accept branch above. Nothing else in this file calls this
// function.
function sendChunks() {
  pairState = "sending";
  $("pairBarWrap").hidden = false;
  var total = Math.ceil(payload.bytes.length / CHUNK);
  var sent = 0;
  setStatus("Accepted. Sending " + payload.name + "…");
  function windowAck(target) {
    return new Promise(function (resolve) { ackWaiter = { target: target, resolve: resolve }; });
  }
  function step() {
    if (sent >= total) {
      pairConn.send({ t: "done" });
      setStatus("Sent whole. Waiting for the phone to confirm it arrived.");
      return;
    }
    var upto = Math.min(sent + WINDOW, total);
    for (var i = sent; i < upto; i++) {
      var start = i * CHUNK, end = Math.min(start + CHUNK, payload.bytes.length);
      pairConn.send({ t: "chunk", i: i, data: payload.bytes.buffer.slice(start, end) });
    }
    sent = upto;
    $("pairBar").style.width = Math.round((sent / total) * 100) + "%";
    windowAck(sent).then(step);
  }
  step();
}
function endSend(kind) {
  if (spent) { return; }
  spent = true;
  pairState = kind;
  clearInterval(timerInt);
  $("pairTimer").textContent = "This code is spent.";
  if (kind === "done") {
    $("pairBar").style.width = "100%";
    setStatus("Across. The capsule arrived whole on the phone.");
  } else {
    setStatus("The phone declined. Nothing was sent. This code is spent; mint a fresh one to try again.", true);
  }
  $("pairAgain").hidden = false;
  var p = pairPeer;
  setTimeout(function () { if (p) { try { p.destroy(); } catch (e) {} } }, 600);
}

$("pairAgain").addEventListener("click", function () { window.location.reload(); });
window.addEventListener("beforeunload", function () {
  if (pairPeer) { try { pairPeer.destroy(); } catch (e) {} }
});
if (typeof Peer === "undefined" || typeof qrcode === "undefined") {
  $("codeBox").hidden = false;
  setStatus("A bundled library did not load. Reinstall the extension and try again.", true);
} else {
  loadVault();
}
// A small handle for headless checks: the mint, and the state
// read. It moves no data and opens nothing.
window.PAIRING = { mintCode: mintCode, state: function () { return pairState; } };
