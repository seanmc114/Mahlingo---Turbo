/* Mahjong Sentence Builder (Spanish)
   - Click FREE tiles to add them to the sentence tray
   - Submit a valid POS pattern to remove those tiles
   - “Free” rule (classic-ish): tile has no tile on top AND has at least one open side (left or right) on the same layer
*/

const boardEl = document.getElementById("board");
const trayEl = document.getElementById("tray");
const statusEl = document.getElementById("status");
const tilesLeftEl = document.getElementById("tilesLeft");
const freeCountEl = document.getElementById("freeCount");
const sentencesClearedEl = document.getElementById("sentencesCleared");

const btnNew = document.getElementById("btnNew");
const btnShuffle = document.getElementById("btnShuffle");
const btnHint = document.getElementById("btnHint");
const btnUndo = document.getElementById("btnUndo");
const btnClear = document.getElementById("btnClear");
const btnSubmit = document.getElementById("btnSubmit");

// --- POS datasets (small but fun; expand as you like) ---
const WORD_BANK = {
  DET: [
    { w: "el", tag: "DET" }, { w: "la", tag: "DET" }, { w: "los", tag: "DET" }, { w: "las", tag: "DET" },
    { w: "un", tag: "DET" }, { w: "una", tag: "DET" }, { w: "mi", tag: "DET" }, { w: "tu", tag: "DET" },
    { w: "su", tag: "DET" }, { w: "este", tag: "DET" }, { w: "esa", tag: "DET" }
  ],
  NOUN: [
    { w: "chico", tag: "NOUN" }, { w: "chica", tag: "NOUN" }, { w: "perro", tag: "NOUN" }, { w: "gata", tag: "NOUN" },
    { w: "profesor", tag: "NOUN" }, { w: "clase", tag: "NOUN" }, { w: "pizza", tag: "NOUN" }, { w: "libro", tag: "NOUN" },
    { w: "casa", tag: "NOUN" }, { w: "amigo", tag: "NOUN" }, { w: "amiga", tag: "NOUN" }, { w: "música", tag: "NOUN" }
  ],
  VERB: [
    { w: "come", tag: "VERB" }, { w: "bebe", tag: "VERB" }, { w: "lee", tag: "VERB" }, { w: "escribe", tag: "VERB" },
    { w: "tiene", tag: "VERB" }, { w: "quiere", tag: "VERB" }, { w: "mira", tag: "VERB" }, { w: "juega", tag: "VERB" },
    { w: "habla", tag: "VERB" }, { w: "vive", tag: "VERB" }, { w: "estudia", tag: "VERB" }
  ],
  ADJ: [
    { w: "grande", tag: "ADJ" }, { w: "pequeño", tag: "ADJ" }, { w: "rápida", tag: "ADJ" }, { w: "lento", tag: "ADJ" },
    { w: "bonita", tag: "ADJ" }, { w: "feo", tag: "ADJ" }, { w: "nuevo", tag: "ADJ" }, { w: "vieja", tag: "ADJ" }
  ],
  PRON: [
    { w: "yo", tag: "PRON" }, { w: "tú", tag: "PRON" }, { w: "él", tag: "PRON" }, { w: "ella", tag: "PRON" },
    { w: "nosotros", tag: "PRON" }, { w: "vosotros", tag: "PRON" }, { w: "ellos", tag: "PRON" }, { w: "ellas", tag: "PRON" }
  ],
  PREP: [
    { w: "con", tag: "PREP" }, { w: "sin", tag: "PREP" }, { w: "en", tag: "PREP" }, { w: "a", tag: "PREP" },
    { w: "de", tag: "PREP" }, { w: "para", tag: "PREP" }
  ],
};

// --- Accepted POS patterns (keep it “grammar-first”, not agreement-first) ---
const ACCEPTED_PATTERNS = [
  ["DET","NOUN","VERB"],
  ["DET","NOUN","VERB","DET","NOUN"],
  ["PRON","VERB"],
  ["PRON","VERB","DET","NOUN"],
  ["PRON","VERB","PREP","DET","NOUN"],
  ["DET","NOUN","ADJ","VERB"],
  ["DET","NOUN","VERB","PREP","DET","NOUN"],
];

// --- Board layout (x,y,z grid units) ---
const LAYOUT = (() => {
  const coords = [];

  // Base layer: 8x4 block
  for (let y = 0; y < 4; y++){
    for (let x = 0; x < 8; x++){
      coords.push({ x: x*2, y: y*2, z: 0 });
    }
  }

  // Mid layer: 6x3 centered
  for (let y = 0; y < 3; y++){
    for (let x = 0; x < 6; x++){
      coords.push({ x: (x*2)+1, y: (y*2)+1, z: 1 });
    }
  }

  // Top layer: 4x2 centered
  for (let y = 0; y < 2; y++){
    for (let x = 0; x < 4; x++){
      coords.push({ x: (x*2)+2, y: (y*2)+2, z: 2 });
    }
  }

  // Crown: 2 tiles
  coords.push({ x: 5, y: 3, z: 3 });
  coords.push({ x: 6, y: 3, z: 3 });

  return coords;
})();

let tiles = [];      // {id, x,y,z, word, pos, removed:false, el}
let tray = [];       // {tileId}
let sentencesCleared = 0;

btnNew.addEventListener("click", newDeal);
btnShuffle.addEventListener("click", shuffleRemaining);
btnHint.addEventListener("click", hintFreeTiles);
btnUndo.addEventListener("click", undoTray);
btnClear.addEventListener("click", clearTray);
btnSubmit.addEventListener("click", submitTray);

newDeal();

// --------------------------- Core ---------------------------

function newDeal(){
  sentencesCleared = 0;
  tray = [];
  tiles = [];

  boardEl.innerHTML = "";
  trayEl.innerHTML = "";
  setStatus("New deal. Tap a free tile to begin.");

  const deck = buildDeck(LAYOUT.length);

  tiles = LAYOUT.map((c, i) => {
    const card = deck[i];
    return {
      id: cryptoId(),
      x: c.x, y: c.y, z: c.z,
      word: card.w,
      pos: card.tag,
      removed: false,
      el: null
    };
  });

  for (const t of tiles){
    const el = document.createElement("button");
    el.className = `tile ${posClass(t.pos)}`;
    el.type = "button";
    el.setAttribute("aria-label", `${t.word} (${t.pos})`);
    el.dataset.id = t.id;

    // POS text intentionally not rendered (colour is enough)
    el.innerHTML = `<div class="word">${escapeHtml(t.word)}</div>`;

    el.addEventListener("click", () => onTileClick(t.id));
    t.el = el;
    boardEl.appendChild(el);
  }

  positionTiles();
  updateFreeStates();
  renderTray();
  renderStats();
}

function shuffleRemaining(){
  const inTray = new Set(tray.map(x => x.tileId));
  const remaining = tiles.filter(t => !t.removed && !inTray.has(t.id));

  const deck = remaining.map(t => ({ w: t.word, tag: t.pos }));
  shuffle(deck);

  remaining.forEach((t, idx) => {
    t.word = deck[idx].w;
    t.pos = deck[idx].tag;
    t.el.querySelector(".word").textContent = t.word;
    t.el.className = `tile ${posClass(t.pos)}`;
    t.el.setAttribute("aria-label", `${t.word} (${t.pos})`);
  });

  updateFreeStates();
  setStatus("Shuffled remaining tiles (not in your tray).");
}

function hintFreeTiles(){
  const free = getFreeTiles();
  if (free.length === 0){
    setStatus("No free tiles right now — clear your tray or shuffle.");
    return;
  }
  for (const t of free){
    t.el.classList.remove("hintPulse");
    void t.el.offsetWidth;
    t.el.classList.add("hintPulse");
  }
  setStatus(`Hint: ${free.length} free tile(s) pulsed.`);
}

function onTileClick(tileId){
  const t = tiles.find(x => x.id === tileId);
  if (!t || t.removed) return;

  updateFreeStates();
  const freeSet = new Set(getFreeTiles().map(x => x.id));
  if (!freeSet.has(tileId)){
    setStatus("That tile is blocked. Pick a free tile (open side + nothing on top).");
    t.el.classList.add("shake");
    setTimeout(() => t.el.classList.remove("shake"), 450);
    return;
  }

  tray.push({ tileId });
  t.el.classList.add("selected");
  renderTray();
  renderStats();
}

function undoTray(){
  const last = tray.pop();
  if (!last){
    setStatus("Tray is empty.");
    return;
  }
  const t = tiles.find(x => x.id === last.tileId);
  if (t && t.el) t.el.classList.remove("selected");
  renderTray();
  renderStats();
  setStatus("Undid last tile.");
}

function clearTray(){
  for (const item of tray){
    const t = tiles.find(x => x.id === item.tileId);
    if (t && t.el) t.el.classList.remove("selected");
  }
  tray = [];
  renderTray();
  renderStats();
  setStatus("Cleared tray.");
}

function submitTray(){
  if (tray.length === 0){
    setStatus("Add tiles to the tray first.");
    return;
  }

  const sequence = tray
    .map(item => tiles.find(t => t.id === item.tileId)?.pos)
    .filter(Boolean);

  const match = ACCEPTED_PATTERNS.some(p => sameArray(p, sequence));
  if (!match){
    setStatus(`Not a valid pattern: ${sequence.join(" + ")}. Try one of the listed patterns.`);
    trayEl.classList.remove("shake");
    void trayEl.offsetWidth;
    trayEl.classList.add("shake");
    setTimeout(() => trayEl.classList.remove("shake"), 450);
    return;
  }

  for (const item of tray){
    const t = tiles.find(x => x.id === item.tileId);
    if (!t || t.removed) continue;
    t.removed = true;
    t.el.classList.add("removed");
    t.el.classList.remove("selected");
  }

  sentencesCleared += 1;
  const sentenceText = tray
    .map(item => tiles.find(t => t.id === item.tileId)?.word)
    .filter(Boolean)
    .join(" ");

  tray = [];

  updateFreeStates();
  renderTray();
  renderStats();

  if (tiles.every(t => t.removed)){
    setStatus(`✅ Sentence cleared: “${sentenceText}”. You removed the final tiles — board complete!`);
  } else {
    setStatus(`✅ Sentence cleared: “${sentenceText}”. Nice — keep going.`);
  }
}

// --------------------------- Rendering ---------------------------

function positionTiles(){
  const boardRect = boardEl.getBoundingClientRect();
  const css = getComputedStyle(document.documentElement);
  const tileW = px(css.getPropertyValue("--tileW"));
  const tileH = px(css.getPropertyValue("--tileH"));
  const stepX = px(css.getPropertyValue("--stepX"));
  const stepY = px(css.getPropertyValue("--stepY"));
  const stepZ = px(css.getPropertyValue("--stepZ"));

  const xs = tiles.map(t => t.x);
  const ys = tiles.map(t => t.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  const gridW = (maxX - minX) * (stepX/2) + tileW + 40;
  const gridH = (maxY - minY) * (stepY/2) + tileH + 40;

  const offsetX = Math.max(10, (boardRect.width - gridW) / 2);
  const offsetY = Math.max(10, (boardRect.height - gridH) / 2);

  for (const t of tiles){
    const left = offsetX + (t.x - minX) * (stepX/2) + (t.z * stepZ);
    const top  = offsetY + (t.y - minY) * (stepY/2) - (t.z * stepZ);

    t.el.style.left = `${left}px`;
    t.el.style.top = `${top}px`;
    t.el.style.zIndex = `${100 + t.z*10 + t.y}`;
  }
}

function renderTray(){
  trayEl.innerHTML = "";

  if (tray.length === 0){
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.style.color = "rgba(255,255,255,0.62)";
    empty.style.fontSize = "13px";
    empty.textContent = "Tray empty. Tap free tiles on the board.";
    trayEl.appendChild(empty);
    return;
  }

  tray.forEach((item, idx) => {
    const t = tiles.find(x => x.id === item.tileId);
    if (!t) return;

    const token = document.createElement("div");
    token.className = `token ${posClass(t.pos)}`;

    // No POS label; colour does the job
    token.innerHTML = `
      <div class="tokenMain">
        <div class="tokenWord">${escapeHtml(t.word)}</div>
      </div>
      <div class="tokenBtns">
        <button class="tbtn" title="Move left" aria-label="Move left">◀</button>
        <button class="tbtn" title="Move right" aria-label="Move right">▶</button>
      </div>
    `;

    const [leftBtn, rightBtn] = token.querySelectorAll(".tbtn");

    leftBtn.addEventListener("click", () => {
      if (idx === 0) return;
      const tmp = tray[idx-1];
      tray[idx-1] = tray[idx];
      tray[idx] = tmp;
      renderTray();
    });

    rightBtn.addEventListener("click", () => {
      if (idx === tray.length - 1) return;
      const tmp = tray[idx+1];
      tray[idx+1] = tray[idx];
      tray[idx] = tmp;
      renderTray();
    });

    trayEl.appendChild(token);
  });
}

function renderStats(){
  const left = tiles.filter(t => !t.removed).length;
  const free = getFreeTiles().length;
  tilesLeftEl.textContent = String(left);
  freeCountEl.textContent = String(free);
  sentencesClearedEl.textContent = String(sentencesCleared);
}

function setStatus(msg){
  statusEl.textContent = msg;
}

// --------------------------- Free-tile logic ---------------------------

function updateFreeStates(){
  for (const t of tiles){
    if (!t.el) continue;
    t.el.classList.remove("free", "blocked");
  }

  const free = new Set(getFreeTiles().map(t => t.id));
  for (const t of tiles){
    if (t.removed) continue;
    if (free.has(t.id)) t.el.classList.add("free");
    else t.el.classList.add("blocked");
  }
  renderStats();
}

function getFreeTiles(){
  const remaining = tiles.filter(t => !t.removed);

  const key = (x,y,z) => `${x},${y},${z}`;
  const map = new Map();
  for (const t of remaining) map.set(key(t.x,t.y,t.z), t);

  const hasTop = (t) => {
    for (const u of remaining){
      if (u.z <= t.z) continue;
      const dx = Math.abs(u.x - t.x);
      const dy = Math.abs(u.y - t.y);
      if (dx <= 1 && dy <= 1) return true;
    }
    return false;
  };

  const free = [];
  for (const t of remaining){
    if (hasTop(t)) continue;

    const leftNeighbor = map.get(key(t.x - 2, t.y, t.z));
    const rightNeighbor = map.get(key(t.x + 2, t.y, t.z));

    const openLeft = !leftNeighbor;
    const openRight = !rightNeighbor;

    if (openLeft || openRight) free.push(t);
  }
  return free;
}

// --------------------------- Deck building ---------------------------

function buildDeck(n){
  const bag = [];
  const addMany = (arr, count) => {
    for (let i=0;i<count;i++){
      const item = arr[i % arr.length];
      bag.push({ w: item.w, tag: item.tag });
    }
  };

  addMany(WORD_BANK.DET, 40);
  addMany(WORD_BANK.NOUN, 40);
  addMany(WORD_BANK.VERB, 34);
  addMany(WORD_BANK.ADJ, 22);
  addMany(WORD_BANK.PRON, 22);
  addMany(WORD_BANK.PREP, 22);

  shuffle(bag);
  const deck = bag.slice(0, n);
  shuffle(deck);
  return deck;
}

// --------------------------- Utils ---------------------------

function shuffle(arr){
  for (let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sameArray(a,b){
  if (a.length !== b.length) return false;
  for (let i=0;i<a.length;i++) if (a[i] !== b[i]) return false;
  return true;
}

function posClass(pos){
  switch(pos){
    case "DET": return "det";
    case "NOUN": return "noun";
    case "VERB": return "verb";
    case "ADJ": return "adj";
    case "PRON": return "pron";
    case "PREP": return "prep";
    default: return "";
  }
}

function px(v){
  return Number(String(v).replace("px","").trim()) || 0;
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function cryptoId(){
  return (crypto.randomUUID ? crypto.randomUUID() : `id_${Math.random().toString(16).slice(2)}_${Date.now()}`);
}

window.addEventListener("resize", () => {
  if (!tiles.length) return;
  positionTiles();
});
