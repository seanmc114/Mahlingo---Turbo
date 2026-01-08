/* Mahlingo Tiles — Free sentence clearing + Mahjong blocking
  - EN / ES / DE
  - Persistent board: clear it by making ANY valid sentence from playable tiles
  - Mahjong-ish blocking:
      playable if:
        (1) no tile above at same (x,y) with higher z
        (2) AND at least one side (left/right) free at same z
  - Grammar checks (kept “hard but not impossible”):
      * Always requires a VERB
      * EN/DE: requires a PRONOUN somewhere (typically first)
      * ES: pronoun optional; BUT if pronoun exists it must agree with verb
      * If pronoun exists in EN/DE, it must agree with verb too
      * Basic structure allowed:
          (Pron)? Verb (NP or PP or both, any number)
          NP = (Det)? Noun
          PP = Prep (Det)? Noun
    This allows loads of “good” sentences without forcing prompts.
*/

const $ = (id) => document.getElementById(id);

const els = {
  langSelect: $("langSelect"),
  diffSelect: $("diffSelect"),
  newBoardBtn: $("newBoardBtn"),
  shuffleBtn: $("shuffleBtn"),
  undoBtn: $("undoBtn"),
  clearBtn: $("clearBtn"),
  checkBtn: $("checkBtn"),
  ruleHint: $("ruleHint"),
  score: $("score"),
  tilesLeft: $("tilesLeft"),
  sentenceBar: $("sentenceBar"),
  feedback: $("feedback"),
  board: $("board"),
};

const state = {
  lang: "es",
  diff: "medium",
  score: 0,
  tileId: 1,
  sentence: [],     // tiles removed from board into current sentence
  boardTiles: [],   // tiles currently on board
  slots: [],        // layout slots
};

const LANG = {
  en: { name: "English", pronounRequired: true, normalize: s => s.trim().toLowerCase() },
  es: {
    name: "Spanish",
    pronounRequired: false,
    normalize: s => s.trim().toLowerCase().replaceAll("ñ","n") // ñ≡n allowed
  },
  de: { name: "German", pronounRequired: true, normalize: s => s.trim().toLowerCase() }
};
const norm = (s) => LANG[state.lang].normalize(s);
const ak = (p, n) => `${p}${n}`; // 1sg, 3pl

function t(text, pos, meta=null){ return { id:`t${state.tileId++}`, text, pos, meta, x:0, y:0, z:0 }; }
function tPron(text, agrees){ return t(text, "pronoun", { agrees }); }
function tVerb(text, agrees){ return t(text, "verb", { agrees }); }

const PRONOUNS = {
  en: [
    tPron("I",   [ak(1,"sg")]),
    tPron("you", [ak(2,"sg"), ak(2,"pl")]),
    tPron("he",  [ak(3,"sg")]),
    tPron("she", [ak(3,"sg")]),
    tPron("we",  [ak(1,"pl")]),
    tPron("they",[ak(3,"pl")]),
  ],
  es: [
    tPron("yo",[ak(1,"sg")]),
    tPron("tú",[ak(2,"sg")]),
    tPron("él",[ak(3,"sg")]),
    tPron("ella",[ak(3,"sg")]),
    tPron("nosotros",[ak(1,"pl")]),
    tPron("vosotros",[ak(2,"pl")]),
    tPron("ellos",[ak(3,"pl")]),
    tPron("ellas",[ak(3,"pl")]),
  ],
  de: [
    tPron("ich",[ak(1,"sg")]),
    tPron("du",[ak(2,"sg")]),
    tPron("er",[ak(3,"sg")]),
    tPron("sie",[ak(3,"sg")]), // she
    tPron("wir",[ak(1,"pl")]),
    tPron("ihr",[ak(2,"pl")]),
    tPron("sie",[ak(3,"pl")]), // they
  ]
};

const VERBS = {
  en: [
    tVerb("go",   [ak(1,"sg"),ak(2,"sg"),ak(2,"pl"),ak(1,"pl"),ak(3,"pl")]),
    tVerb("goes", [ak(3,"sg")]),
    tVerb("play", [ak(1,"sg"),ak(2,"sg"),ak(2,"pl"),ak(1,"pl"),ak(3,"pl")]),
    tVerb("plays",[ak(3,"sg")]),
    tVerb("eat",  [ak(1,"sg"),ak(2,"sg"),ak(2,"pl"),ak(1,"pl"),ak(3,"pl")]),
    tVerb("eats", [ak(3,"sg")]),
    tVerb("study",[ak(1,"sg"),ak(2,"sg"),ak(2,"pl"),ak(1,"pl"),ak(3,"pl")]),
    tVerb("studies",[ak(3,"sg")]),
    tVerb("have", [ak(1,"sg"),ak(2,"sg"),ak(2,"pl"),ak(1,"pl"),ak(3,"pl")]),
    tVerb("has",  [ak(3,"sg")]),
  ],
  es: [
    tVerb("voy",[ak(1,"sg")]),
    tVerb("vas",[ak(2,"sg")]),
    tVerb("va",[ak(3,"sg")]),
    tVerb("vamos",[ak(1,"pl")]),
    tVerb("vais",[ak(2,"pl")]),
    tVerb("van",[ak(3,"pl")]),
    tVerb("juego",[ak(1,"sg")]),
    tVerb("juegas",[ak(2,"sg")]),
    tVerb("juega",[ak(3,"sg")]),
    tVerb("jugamos",[ak(1,"pl")]),
    tVerb("jugáis",[ak(2,"pl")]),
    tVerb("juegan",[ak(3,"pl")]),
    tVerb("como",[ak(1,"sg")]),
    tVerb("comes",[ak(2,"sg")]),
    tVerb("come",[ak(3,"sg")]),
    tVerb("comemos",[ak(1,"pl")]),
    tVerb("coméis",[ak(2,"pl")]),
    tVerb("comen",[ak(3,"pl")]),
    tVerb("estudio",[ak(1,"sg")]),
    tVerb("estudias",[ak(2,"sg")]),
    tVerb("estudia",[ak(3,"sg")]),
    tVerb("estudiamos",[ak(1,"pl")]),
    tVerb("estudiáis",[ak(2,"pl")]),
    tVerb("estudian",[ak(3,"pl")]),
    tVerb("tengo",[ak(1,"sg")]),
    tVerb("tienes",[ak(2,"sg")]),
    tVerb("tiene",[ak(3,"sg")]),
    tVerb("tenemos",[ak(1,"pl")]),
    tVerb("tenéis",[ak(2,"pl")]),
    tVerb("tienen",[ak(3,"pl")]),
  ],
  de: [
    tVerb("gehe",[ak(1,"sg")]),
    tVerb("gehst",[ak(2,"sg")]),
    tVerb("geht",[ak(3,"sg"),ak(2,"pl")]),
    tVerb("gehen",[ak(1,"pl"),ak(3,"pl")]),
    tVerb("spiele",[ak(1,"sg")]),
    tVerb("spielst",[ak(2,"sg")]),
    tVerb("spielt",[ak(3,"sg"),ak(2,"pl")]),
    tVerb("spielen",[ak(1,"pl"),ak(3,"pl")]),
    tVerb("esse",[ak(1,"sg")]),
    tVerb("isst",[ak(2,"sg"),ak(3,"sg")]),
    tVerb("esst",[ak(2,"pl")]),
    tVerb("essen",[ak(1,"pl"),ak(3,"pl")]),
    tVerb("lerne",[ak(1,"sg")]),
    tVerb("lernst",[ak(2,"sg")]),
    tVerb("lernt",[ak(3,"sg"),ak(2,"pl")]),
    tVerb("lernen",[ak(1,"pl"),ak(3,"pl")]),
    tVerb("habe",[ak(1,"sg")]),
    tVerb("hast",[ak(2,"sg")]),
    tVerb("hat",[ak(3,"sg")]),
    tVerb("habt",[ak(2,"pl")]),
    tVerb("haben",[ak(1,"pl"),ak(3,"pl")]),
  ]
};

const OTHER = {
  en: [
    ["to","prep"],["school","noun"],["football","noun"],["an","det"],["apple","noun"],["Spanish","noun"],["homework","noun"],
  ].map(([w,p])=>t(w,p)),
  es: [
    ["a","prep"],["la","det"],["escuela","noun"],["al","prep"],["fútbol","noun"],["una","det"],["manzana","noun"],["español","noun"],["tarea","noun"],
  ].map(([w,p])=>t(w,p)),
  de: [
    ["zur","prep"],["schule","noun"],["fußball","noun"],["einen","det"],["apfel","noun"],["deutsch","noun"],["hausaufgaben","noun"],
  ].map(([w,p])=>t(w,p))
};

// ---------- Layout ----------
function makeSlots(diff){
  const slots = [];
  const cfg = diff === "easy"
    ? { w:6, h:4, layers:1 }
    : diff === "hard"
      ? { w:8, h:5, layers:3 }
      : { w:7, h:5, layers:2 };

  for (let y=0; y<cfg.h; y++){
    for (let x=0; x<cfg.w; x++){
      const hole = (y===1 && x===0) || (y===cfg.h-2 && x===cfg.w-1);
      if (!hole) slots.push({x,y,z:0});
    }
  }
  if (cfg.layers >= 2){
    for (let y=1; y<cfg.h-1; y++){
      for (let x=1; x<cfg.w-1; x++){
        if ((x+y)%2===0) slots.push({x,y,z:1});
      }
    }
  }
  if (cfg.layers >= 3){
    for (let y=2; y<cfg.h-2; y++){
      for (let x=2; x<cfg.w-2; x++){
        if ((x+y)%2===0) slots.push({x,y,z:2});
      }
    }
  }
  return slots;
}

function cloneFresh(base){
  return { ...base, id:`t${state.tileId++}` };
}

function shuffleInPlace(arr){
  for (let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
}

function freshBoard(){
  state.score = 0;
  state.tileId = 1;
  state.sentence = [];

  state.slots = makeSlots(state.diff);
  const N = state.slots.length;

  const tiles = [];
  const pron = PRONOUNS[state.lang].map(cloneFresh);
  const verbs = VERBS[state.lang].map(cloneFresh);
  const other = OTHER[state.lang].map(cloneFresh);

  // keep it “difficult but not impossible”: load plenty of verbs/nouns
  const pronTarget = Math.max(6, Math.floor(N * 0.20));
  const verbTarget = Math.max(10, Math.floor(N * 0.28));
  addRandomCopies(tiles, pron, pronTarget);
  addRandomCopies(tiles, verbs, verbTarget);

  while (tiles.length < N){
    const pickFrom = (Math.random() < 0.65) ? other : verbs;
    tiles.push(cloneFresh(pickFrom[Math.floor(Math.random()*pickFrom.length)]));
  }

  shuffleInPlace(tiles);
  state.boardTiles = tiles.slice(0,N).map((ti, i) => {
    const s = state.slots[i];
    return { ...ti, x:s.x, y:s.y, z:s.z };
  });

  renderAll();
  setFeedback("Board created. Make any correct sentence to remove those tiles.", "neutral");
  updateHints();
}

function addRandomCopies(out, src, count){
  for (let i=0;i<count;i++){
    out.push(cloneFresh(src[Math.floor(Math.random()*src.length)]));
  }
}

// ---------- Mahjong playable ----------
function isPlayable(tile){
  const hasAbove = state.boardTiles.some(t => t.x===tile.x && t.y===tile.y && t.z>tile.z);
  if (hasAbove) return false;
  const leftBlocked  = state.boardTiles.some(t => t.z===tile.z && t.y===tile.y && t.x===tile.x-1);
  const rightBlocked = state.boardTiles.some(t => t.z===tile.z && t.y===tile.y && t.x===tile.x+1);
  return !(leftBlocked && rightBlocked);
}

// ---------- Interactions ----------
function clickTile(tileId){
  const tile = state.boardTiles.find(t => t.id===tileId);
  if (!tile) return;
  if (!isPlayable(tile)) return;

  state.boardTiles = state.boardTiles.filter(t => t.id!==tileId);
  state.sentence.push(tile);
  renderAll();
}

function undo(){
  const last = state.sentence.pop();
  if (!last) return;
  state.boardTiles.push(last);
  renderAll();
}

function clearSentence(){
  if (!state.sentence.length) return;
  state.boardTiles.push(...state.sentence);
  state.sentence = [];
  renderAll();
}

function shuffleLayout(){
  if (state.boardTiles.length === 0) return;

  const remaining = [...state.boardTiles];
  const slots = [...state.slots].slice(0, remaining.length);
  shuffleInPlace(remaining);
  shuffleInPlace(slots);

  state.boardTiles = remaining.map((ti, i) => ({ ...ti, x: slots[i].x, y: slots[i].y, z: slots[i].z }));
  renderAll();
  setFeedback("Layout shuffled (same tiles).", "neutral");
}

// ---------- Grammar checker (free play) ----------
function intersects(a, b){
  const setB = new Set(b);
  return a.some(x => setB.has(x));
}

function checkSentence(){
  if (state.boardTiles.length === 0 && state.sentence.length === 0){
    setFeedback("Board already cleared. New Board to play again.", "ok");
    return;
  }

  if (state.sentence.length === 0){
    setFeedback("Build a sentence first (tap playable tiles).", "bad");
    return;
  }

  const tiles = state.sentence;
  const verbTile = tiles.find(t => t.pos === "verb");
  if (!verbTile){
    setFeedback("Missing a verb. A valid sentence must include a verb tile.", "bad");
    return;
  }

  const pronTile = tiles.find(t => t.pos === "pronoun") || null;

  // EN/DE require pronoun somewhere
  if (LANG[state.lang].pronounRequired && !pronTile){
    setFeedback("Missing the subject pronoun (English/German need it here).", "bad");
    return;
  }

  // If pronoun exists, must agree with verb
  if (pronTile?.meta?.agrees && verbTile?.meta?.agrees){
    if (!intersects(pronTile.meta.agrees, verbTile.meta.agrees)){
      setFeedback(`Pronoun/verb mismatch: “${pronTile.text}” doesn’t match “${verbTile.text}”.`, "bad");
      return;
    }
  }

  // Basic structure check (POS-based)
  const pos = tiles.map(t => t.pos);

  // Find first verb index (we accept pronoun before it; other stuff before verb is rejected to keep it learnable)
  const vIdx = pos.indexOf("verb");
  if (vIdx === -1) {
    setFeedback("Missing a verb.", "bad");
    return;
  }

  // Before verb: allow only pronouns (and only one, really)
  for (let i=0;i<vIdx;i++){
    if (pos[i] !== "pronoun"){
      setFeedback("In this game, the sentence should start with a subject (or verb in Spanish). Move extra words after the verb.", "bad");
      return;
    }
  }

  // Spanish special: verb can be first; pronoun optional.
  // For EN/DE: we already required pronoun, but we don’t force it to be first; still strongly preferred.
  // Now parse after verb as repeating chunks of NP and/or PP:
  // NP = (det)? noun
  // PP = prep (det)? noun
  let i = vIdx + 1;

  function parseNP(){
    if (pos[i] === "det") i++;
    if (pos[i] === "noun") { i++; return true; }
    return false;
  }
  function parsePP(){
    if (pos[i] !== "prep") return false;
    i++;
    if (pos[i] === "det") i++;
    if (pos[i] === "noun") { i++; return true; }
    return false;
  }

  // If there are tokens after the verb, they must be parseable as (NP|PP)+
  while (i < pos.length){
    if (parsePP()) continue;
    if (parseNP()) continue;
    setFeedback("The words after the verb don’t form a clean noun phrase or prepositional phrase (try det+noun or prep+det+noun).", "bad");
    return;
  }

  // ✅ valid: keep tiles removed permanently, increment score, clear sentence bar
  state.score++;
  state.sentence = [];
  renderAll();

  if (state.boardTiles.length === 0){
    setFeedback("🎉 Correct — and the board is cleared!", "ok");
  } else {
    setFeedback("✅ Correct sentence! Keep going to clear the board.", "ok");
  }
}

// ---------- Rendering ----------
function prettyPOS(pos){
  switch(pos){
    case "pronoun": return "Pronoun";
    case "verb": return "Verb";
    case "det": return "Det";
    case "noun": return "Noun";
    case "prep": return "Prep";
    default: return "Other";
  }
}

function px(cssVar){
  const v = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  return parseFloat(v) || 70; // computed clamp becomes px
}

function renderSentence(){
  els.sentenceBar.innerHTML = "";
  if (!state.sentence.length){
    const hint = document.createElement("div");
    hint.style.color = "rgba(0,0,0,.45)";
    hint.style.fontWeight = "700";
    hint.textContent = "Tap playable tiles to build a sentence…";
    els.sentenceBar.appendChild(hint);
    return;
  }
  for (const ti of state.sentence){
    const chip = document.createElement("div");
    chip.textContent = ti.text;
    chip.style.padding = "8px 10px";
    chip.style.borderRadius = "999px";
    chip.style.border = "1px solid #e5e7eb";
    chip.style.background = "#fff";
    chip.style.fontWeight = "900";
    els.sentenceBar.appendChild(chip);
  }
}

function renderBoard(){
  els.board.innerHTML = "";

  const maxX = Math.max(...state.slots.map(s=>s.x), 0);
  const maxY = Math.max(...state.slots.map(s=>s.y), 0);
  const approxW = (maxX+1) * (px("--tw") + px("--gap")) + 110;
  const approxH = (maxY+1) * (px("--th") + px("--gap")) + 110;
  els.board.style.width = `${approxW}px`;
  els.board.style.height = `${approxH}px`;

  const tiles = [...state.boardTiles].sort((a,b)=>a.z-b.z);

  for (const ti of tiles){
    const div = document.createElement("div");
    div.className = "tile";
    div.dataset.pos = ti.pos || "other";

    const playable = isPlayable(ti);
    div.classList.add(playable ? "playable" : "blocked");
    if (playable) div.addEventListener("click", ()=>clickTile(ti.id));

    const left = ti.x * (px("--tw")+px("--gap")) + ti.z * px("--zdx");
    const top  = ti.y * (px("--th")+px("--gap")) - ti.z * px("--zdy");

    div.style.left = `${left}px`;
    div.style.top = `${top}px`;
    div.style.zIndex = String(10 + ti.z);

    const w = document.createElement("div");
    w.className = "word";
    w.textContent = ti.text;

    const p = document.createElement("div");
    p.className = "pos";
    p.textContent = prettyPOS(ti.pos);

    div.appendChild(w);
    div.appendChild(p);
    els.board.appendChild(div);
  }
}

function updateHints(){
  if (state.lang === "es"){
    els.ruleHint.textContent = "Spanish: pronoun optional (voy = I go). If you use a pronoun, it MUST match the verb.";
  } else if (state.lang === "en"){
    els.ruleHint.textContent = "English: pronoun required. Match: he plays / I play / they play.";
  } else {
    els.ruleHint.textContent = "German: pronoun required. Match: ich gehe / er geht / wir gehen.";
  }
}

function renderAll(){
  els.score.textContent = String(state.score);
  els.tilesLeft.textContent = String(state.boardTiles.length);
  renderSentence();
  renderBoard();
  updateHints();
}

function setFeedback(text, kind){
  els.feedback.textContent = text;
  els.feedback.classList.remove("ok","bad");
  if (kind==="ok") els.feedback.classList.add("ok");
  if (kind==="bad") els.feedback.classList.add("bad");
}

// ---------- Wiring ----------
els.langSelect.addEventListener("change", ()=>{
  state.lang = els.langSelect.value;
  freshBoard();
});
els.diffSelect.addEventListener("change", ()=>{
  state.diff = els.diffSelect.value;
  freshBoard();
});
els.newBoardBtn.addEventListener("click", freshBoard);
els.shuffleBtn.addEventListener("click", shuffleLayout);
els.undoBtn.addEventListener("click", undo);
els.clearBtn.addEventListener("click", clearSentence);
els.checkBtn.addEventListener("click", checkSentence);

// start
freshBoard();
