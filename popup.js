// clonemy.ai extension popup.
// Shows the local usage tally in plain numbers, and, when one of
// your AIs counts as a regular (used on 3+ different days, or in 5+
// sessions), asks Tony's question: sync it, transfer it, or sync two
// AIs. Those actions run in the AI's own tab with the clonemy bar;
// the popup only points you there. Nothing here talks to a network.

"use strict";

var REGULAR_MIN_DAYS = 3;
var REGULAR_MIN_SESSIONS = 5;

function isRegular(entry) {
  return entry.days.length >= REGULAR_MIN_DAYS || entry.sessions >= REGULAR_MIN_SESSIONS;
}

function render() {
  chrome.storage.local.get(["cmai_tally"], function (data) {
    var tally = data.cmai_tally || {};
    var ids = Object.keys(tally);
    var box = document.getElementById("tally");
    var offer = document.getElementById("offer");
    if (!ids.length) {
      box.innerHTML = "<p>No visits counted yet.</p>";
      offer.style.display = "none";
      return;
    }
    var entries = ids.map(function (id) { return tally[id]; });
    entries.sort(function (a, b) { return b.days.length - a.days.length || b.sessions - a.sessions; });
    box.innerHTML = entries.map(function (e) {
      return '<div class="row"><span><b>' + e.name + "</b>" + (isRegular(e) ? ' <span class="tag">your regular</span>' : "") +
        "</span><span>" + e.days.length + " days · " + e.sessions + " sessions</span></div>";
    }).join("");
    var top = entries[0];
    if (top && isRegular(top)) {
      offer.style.display = "block";
      offer.innerHTML = "<b>You use " + top.name + " most.</b><br />Would you like to sync with clonemy.ai? Or transfer or sync to another AI?<br />Open " + top.name + " and use the clonemy bar in the tab: it extracts, compiles, and hands you your capsule.";
    } else {
      offer.style.display = "none";
    }
  });
}

document.getElementById("erase").addEventListener("click", function () {
  chrome.storage.local.remove(["cmai_tally"], render);
});

// Send to phone (v0.5.7): the pairing flow lives in a full
// extension page, because this popup closes on focus loss and
// a transfer host must stay alive. The popup only opens it.
document.getElementById("pair-open").addEventListener("click", function () {
  chrome.tabs.create({ url: chrome.runtime.getURL("pair.html") });
});

render();

// Browser sync (v0.5.0). The passphrase derives an AES-GCM key
// (PBKDF2); only the derived key, its salt, and a short check of
// the key are kept, in this browser's local storage. The content
// scripts use that key to publish and read encrypted vault chunks
// in chrome.storage.sync. The passphrase itself is never stored.
var SYNC_ITER = 100000;
var SYNC_WORDS = ["amber", "anchor", "angle", "apple", "arch", "arrow", "aspen", "atlas", "autumn", "avocado", "bacon", "badge", "bagel", "bamboo", "banana", "banner", "barley", "basil", "basket", "beacon", "bear", "beaver", "berry", "birch", "biscuit", "blanket", "blossom", "blueberry", "bolt", "bonnet", "border", "bottle", "boulder", "bouquet", "branch", "brandy", "breeze", "brick", "bridge", "bridle", "brief", "brook", "broom", "brother", "bubble", "bucket", "budget", "buffalo", "bugle", "building", "bulb", "bulk", "bullet", "bundle", "bunker", "burden", "burger", "bushel", "business", "butter", "button", "cabin", "cable", "cactus", "cafe", "cage", "cake", "calm", "camel", "camera", "camp", "canal", "candle", "candy", "canoe", "canvas", "canyon", "capital", "captain", "caramel", "carbon", "card", "cargo", "carpet", "carrot", "cart", "cascade", "case", "cash", "castle", "casual", "catalog", "catch", "cattle", "cedar", "ceiling", "cellar", "cement", "census", "center", "century", "ceramic", "chain", "chair", "chalk", "champion", "chance", "channel", "chaos", "chapter", "charge", "charm", "chart", "chase", "cheese", "cherry", "chest", "chicken", "chief", "child", "chill", "choice", "chorus", "chrome", "church", "cider", "circle", "circus", "citizen", "city", "civil", "claim", "class", "claw", "clay", "clean", "clear", "clerk", "clever", "click", "client", "cliff", "climb", "clinic", "clock", "cloth", "cloud", "club", "clue", "coach", "coast", "coat", "cobalt", "cobra", "cocoa", "coconut", "coffee", "coil", "coin", "cold", "collar", "color", "column", "comb", "comfort", "comic", "comma", "command", "commerce", "common", "company", "compass", "complex", "concept", "concert", "concrete", "cone", "copper", "copy", "coral", "cord", "core", "cork", "corn", "corner", "cotton", "couch", "cough", "council", "county", "couple", "course", "cousin", "cover", "coyote", "crack", "cradle", "craft", "crane", "crash", "crate", "crawl", "cream", "credit", "creek", "crest", "cricket", "crime", "crisp", "crop", "cross", "crowd", "crown", "crucial", "cruise", "crumb", "crush", "crystal", "cube", "culture", "cupboard", "curious", "current", "curtain", "curve", "cushion", "custom", "cycle", "dagger", "daily", "dairy", "daisy", "damage", "dance", "danger", "daring", "dark", "dawn", "dazzle", "deal", "dear", "debate", "debris", "debut", "decay", "december", "decide", "deck", "decline", "decor", "decrease", "deer", "defeat", "defend", "degree", "delay", "delta", "demand", "demo", "dense", "desert", "design", "desk", "detail", "detect", "develop", "device", "diagram", "dial", "diamond", "diary", "dice", "diesel", "diet", "differ", "digit", "dilemma", "dinner", "dinosaur", "direct", "dirt", "disco", "discount", "dish", "dismiss", "display", "distance", "ditch", "dive", "diver", "doctor", "dollar", "dolphin", "domain", "door", "dose", "double", "dove", "dozen", "draft", "dragon", "drain", "drama", "dream", "dress", "drift", "drill", "drink", "drive", "drop", "drum", "duck", "dude", "dune", "dust", "duty", "dwarf", "dynamic", "eager", "eagle", "early", "earn", "earth", "ease", "east", "easy", "eat", "echo", "economy", "edge", "edit", "educate", "effort", "egg", "eight", "either", "elbow", "elder", "elect", "elegant", "element", "elephant", "elevator", "elite", "else", "email", "embrace", "emerald", "emotion", "empire", "employ", "empty", "enable", "enamel", "encounter", "energy", "engine", "english", "enjoy", "enormous", "enough", "enrich", "enroll", "ensure", "enter", "entire", "entry", "equal", "equip", "era", "erase", "error", "escape", "essay", "essence", "estate", "ethics", "even", "evening", "event", "every", "exact", "example", "excess", "exchange", "excite", "excuse", "exercise", "exit", "expand", "expect", "expense", "expert", "export", "expose", "express", "extend", "extra", "fabric", "face", "factor", "factory", "faculty", "fade", "faint", "fair", "faith", "falcon", "fall", "false", "family", "famous", "fancy", "farm", "fashion", "fast", "fate", "father", "fault", "favor", "fear", "feast", "feather", "feature", "february", "federal", "fee", "feed", "feel", "fellow", "fence", "fern", "ferry", "festival", "fetch", "fever", "fiber", "fiction", "field", "fierce", "fifth", "fight", "figure", "file", "film", "final", "finance", "finger", "finish", "fire", "firm", "first", "fiscal", "fish", "fishing", "fit", "fitness", "fix", "flag", "flame", "flash", "flat", "flavor", "fleece", "fleet", "flesh", "flex", "flick", "flight", "flip", "float", "flock", "flood", "floor", "flour", "flow", "fluent", "fluid", "flute", "foam", "focus", "fog", "foil", "fold", "folk", "follow", "food", "fool", "foot", "forest", "forget", "fork", "form", "formal", "format", "former", "fortune", "forum", "forward", "fossil", "foster", "fox", "fraction", "frame", "free", "freeze", "frequent", "fresh", "friend", "frog", "front", "frost", "fruit", "fuel", "full", "fun", "function", "fund", "funny", "furnace", "future", "gadget", "gain", "galaxy", "gallery", "game", "gap", "garage", "garden", "garlic", "garment", "gas", "gate", "gather", "gauge", "gaze", "general", "genius", "genre", "gentle", "genuine", "gesture", "ghost", "giant", "gift", "ginger", "giraffe", "girl", "give", "glad", "glance", "glass", "glide", "glimpse", "globe", "glory", "glove", "glow", "goal", "goat", "gold", "golf", "good", "goose", "gorilla", "gospel", "gossip", "govern", "grace", "grade", "grain", "grand", "grant", "grape", "graph", "grasp", "grass", "gravel", "gravity", "graze", "great", "green", "greet", "grid", "grief", "grill", "grin", "grip", "grocery", "ground", "group", "grove", "grow", "guard", "guess", "guest", "guide", "guilt", "guitar", "gun", "habit", "habitat", "hail", "hair", "half", "hall", "halo", "hamster", "hand", "happy", "harbor", "hard", "harm", "harvest", "hat", "have", "hawk", "hazard", "head", "health", "hear", "heart", "heat", "heaven", "heavy", "hedgehog", "height", "hello", "helmet", "help", "hen", "hero", "heron", "hidden", "high", "hill", "hint", "hippo", "history", "hobby", "hockey", "hold", "hole", "holiday", "hollow", "home", "honey", "hood", "hope", "horizon", "horn", "horse", "hotel", "hour", "house", "hover", "howl", "hub", "huge", "human", "humor", "hundred", "hungry", "hunt", "hurdle", "hurry", "hurt", "husband", "hybrid", "ice", "icon", "idea", "ideal", "idle", "idol", "igloo", "ignore", "ill", "image", "imagine", "immune", "impact", "import", "impose", "improve", "impulse", "inch", "income", "indeed", "index", "indoor", "infant", "inflate", "inform", "inhale", "initial", "inject", "injury", "inner", "input", "insect", "inside", "insist", "inspire", "install", "instant", "intact", "intake", "integer", "intend", "intense", "interim", "intern", "interpret", "interrupt", "interval", "intro", "invent", "invest", "invite", "involve", "iron", "island", "isolate", "issue", "item", "ivory", "jacket", "jaguar", "january", "jazz", "jeans", "jelly", "jewel", "job", "join", "joint", "joke", "journal", "journey", "joy", "judge", "juice", "july", "jump", "june", "jungle", "junior", "jury", "just", "keen", "keep", "kernel", "kettle", "key", "kick", "kid", "kidney", "kind", "kingdom", "kiss", "kit", "kitchen", "knee", "kneel", "knife", "knock", "know", "koala", "label", "labor", "ladder", "lady", "lake", "lamp", "land", "lane", "language", "lantern", "large", "laser", "last", "late", "laugh", "laundry", "lava", "lawn", "lawsuit", "layer", "lazy", "leader", "leaf", "league", "lean", "learn", "leather", "leave", "lecture", "left", "leg", "legal", "legend", "lemon", "lend", "length", "lens", "leopard", "lesson", "letter", "level", "lever", "liberty", "library", "license", "life", "lift", "light", "like", "limb", "limit", "line", "link", "lion", "lipid", "liquid", "list", "little", "live", "livestock", "load", "loan", "lobster", "local", "lock", "lodge", "logic", "lonely", "long", "look", "loose", "lose", "loss", "lot", "loud", "lounge", "love", "loyal", "lucky", "luggage", "lunar", "lunch", "luxury", "lyric", "machine", "mad", "magic", "magnet", "maid", "mail", "main", "major", "make", "male", "mall", "mammal", "manage", "manner", "manual", "maple", "marble", "march", "marine", "market", "marriage", "marsh", "mask", "mass", "master", "match", "mate", "math", "matrix", "matter", "maximum", "mayor", "meal", "mean", "measure", "meat", "medal", "media", "melon", "melt", "member", "memory", "mental", "menu", "mercy", "merge", "merit", "mess", "metal", "meter", "method", "middle", "might", "mild", "mile", "milk", "mill", "mind", "mine", "mineral", "minimum", "minor", "mint", "minute", "miracle", "mirror", "miss", "mistake", "mix", "mobile", "model", "modern", "modify", "module", "moment", "monitor", "monkey", "month", "moon", "moose", "moral", "more", "morning", "mosquito", "moth", "motion", "motor", "mount", "mouse", "mouth", "move", "movie", "much", "mule", "museum", "music", "must", "mutual", "myself", "myth", "nail", "name", "napkin", "narrow", "nasty", "nation", "native", "nature", "near", "neat", "neck", "need", "needle", "negative", "neglect", "neither", "neon", "nerve", "nest", "net", "network", "neutral", "never", "new", "next", "nice", "night", "noble", "noise", "nomad", "none", "noodle", "noon", "norm", "north", "nose", "note", "nothing", "notice", "notion", "novel", "now", "nuclear", "number", "nurse", "nut", "oak", "object", "ocean", "october", "odd", "offer", "office", "often", "oil", "old", "olive", "olympic", "omit", "once", "one", "onion", "online", "only", "open", "opera", "opinion", "oppose", "optic", "option", "orange"];
function b64e(bytes) {
  var s = "", CH = 0x8000;
  for (var i = 0; i < bytes.length; i += CH) { s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH)); }
  return btoa(s);
}
function b64d(s) {
  var bin = atob(s), out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) { out[i] = bin.charCodeAt(i); }
  return out;
}
function deriveSync(pass, saltB64, iter, done) {
  crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]).then(function (base) {
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64d(saltB64), iterations: iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  }).then(function (key) {
    crypto.subtle.exportKey("raw", key).then(function (raw) {
      crypto.subtle.digest("SHA-256", raw).then(function (dg) {
        var check = b64e(new Uint8Array(dg).slice(0, 16));
        crypto.subtle.exportKey("jwk", key).then(function (jwk) { done({ jwk: jwk, salt: saltB64, iter: iter, check: check }); });
      });
    });
  }).catch(function () { done(null); });
}
function renderSync() {
  chrome.storage.local.get(["cmai_synckey", "cmai_syncnote", "cmai_syncconf", "cmai_syncphrase"], function (d) {
    var on = !!d.cmai_synckey;
    document.getElementById("sync-off").style.display = on ? "none" : "block";
    document.getElementById("sync-disable").style.display = on ? "block" : "none";
    document.getElementById("sync-show").style.display = on && d.cmai_syncphrase ? "block" : "none";
    if (d.cmai_syncphrase) { document.getElementById("sync-phrase").textContent = d.cmai_syncphrase; }
    var st = document.getElementById("sync-status");
    st.textContent = on ? "Browser sync is on. Compiles publish your vault as encrypted chunks through your browser's own sync." : "Browser sync is off.";
    var parts = [];
    if (d.cmai_syncnote) { parts.push(d.cmai_syncnote.text); }
    if (d.cmai_syncconf && Object.keys(d.cmai_syncconf).length) { parts.push("A sync fold is on record above; nothing was deleted."); }
    document.getElementById("sync-note").textContent = parts.join(" ");
  });
}
function unlockWithPhrase(pass) {
  var st = document.getElementById("sync-status");
  chrome.storage.sync.get(["csmeta"], function (d) {
    var meta = d.csmeta;
    if (meta && meta.salt) {
      deriveSync(pass, meta.salt, meta.iter, function (rec) {
        if (!rec) { st.textContent = "Something went wrong deriving the key."; return; }
        if (rec.check !== meta.check) { st.textContent = "That phrase does not open the synced vault. Nothing was changed."; return; }
        chrome.storage.local.set({ cmai_synckey: rec }, renderSync);
      });
    } else {
      var salt = b64e(crypto.getRandomValues(new Uint8Array(16)));
      deriveSync(pass, salt, SYNC_ITER, function (rec) {
        if (!rec) { st.textContent = "Something went wrong deriving the key."; return; }
        chrome.storage.local.set({ cmai_synckey: rec }, renderSync);
      });
    }
  });
}
document.getElementById("sync-on").addEventListener("click", function () {
  var pass = document.getElementById("sync-pass").value;
  var st = document.getElementById("sync-status");
  if (!pass) { st.textContent = "Type your sync phrase first, or create one above."; return; }
  unlockWithPhrase(pass);
});
document.getElementById("sync-disable").addEventListener("click", function () {
  var keys = ["csmeta"];
  for (var i = 0; i < 64; i++) { keys.push("cs" + i); }
  chrome.storage.sync.remove(keys, function () {
    chrome.storage.local.remove(["cmai_synckey", "cmai_syncbase", "cmai_syncconf", "cmai_syncphrase"], renderSync);
  });
});
renderSync();

function makeSyncPhrase() {
  var idx = new Uint16Array(6);
  crypto.getRandomValues(idx);
  var words = [];
  for (var i = 0; i < 6; i++) { words.push(SYNC_WORDS[idx[i] % SYNC_WORDS.length]); }
  return words.join(" ");
}
document.getElementById("sync-create").addEventListener("click", function () {
  var st = document.getElementById("sync-status");
  chrome.storage.sync.get(["csmeta"], function (d) {
    if (d.csmeta) { st.textContent = "A synced vault already exists. Type its phrase below instead, so this browser joins it rather than starting a second one."; return; }
    var phrase = makeSyncPhrase();
    var salt = b64e(crypto.getRandomValues(new Uint8Array(16)));
    deriveSync(phrase, salt, SYNC_ITER, function (rec) {
      if (!rec) { st.textContent = "Something went wrong creating the phrase."; return; }
      chrome.storage.local.set({ cmai_synckey: rec, cmai_syncphrase: phrase }, function () {
        renderSync();
        document.getElementById("sync-phrasebox").style.display = "block";
      });
    });
  });
});
document.getElementById("sync-show").addEventListener("click", function () {
  var box = document.getElementById("sync-phrasebox");
  box.style.display = box.style.display === "none" ? "block" : "none";
});
document.getElementById("sync-copy").addEventListener("click", function () {
  var phrase = document.getElementById("sync-phrase").textContent;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(phrase).catch(function () {});
  }
});

function syncPhraseTxt(phrase) {
  return "clonemy.ai browser sync phrase\n\n" + phrase + "\n\n" +
    "Enter these six words in the clonemy popup on each of your other browsers (or pick this file there) to sync your capsule vault to that browser.\n" +
    "Anyone who has this phrase can open your synced capsules. Keep this file like a password.\n";
}
document.getElementById("sync-download").addEventListener("click", function () {
  var phrase = document.getElementById("sync-phrase").textContent;
  if (!phrase) { return; }
  var blob = new Blob([syncPhraseTxt(phrase)], { type: "text/plain" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "clonemy-sync-phrase.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
});
document.getElementById("sync-filebtn").addEventListener("click", function () {
  document.getElementById("sync-file").click();
});
document.getElementById("sync-file").addEventListener("change", function (e) {
  var st = document.getElementById("sync-status");
  var file = e.target.files && e.target.files[0];
  if (!file) { return; }
  file.text().then(function (text) {
    var tokens = text.toLowerCase().split(/[^a-z]+/).filter(function (t) { return SYNC_WORDS.indexOf(t) !== -1; });
    if (tokens.length < 6) { st.textContent = "That file does not contain a sync phrase. Nothing was changed."; return; }
    var phrase = tokens.slice(0, 6).join(" ");
    document.getElementById("sync-pass").value = phrase;
    unlockWithPhrase(phrase);
  }).catch(function () { st.textContent = "That file could not be read. Nothing was changed."; });
});
