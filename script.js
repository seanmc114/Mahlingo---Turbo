/* Mahlingo Tiles — Persistent Mahjong board you CLEAR
  - EN / ES / DE
  - Difficulty affects: board size + layers + distractors
  - Blocking rule:
      playable if:
        (1) no tile exists at same (x,y) with z > current z
        (2) AND (left side free OR right side free) at same z
  - Prompts are chosen ONLY if solvable from remaining tiles (prevents “ran out of subjects/objects”).
  - Shuffle = rearrange remaining tiles on the SAME layout slots (no new tiles).
*/

const $ = (id) => document.getElementById(id);

const els = {
  langSelect: $("langSelect"),
  diffSelect: $("diffSelect"),
  startBtn: $("startBtn"),
  shuffleBtn: $("shuffleBtn"),
  undoBtn: $("undoBtn"),
  clearBtn: $("clearBtn"),
  checkBtn: $("checkBtn"),
  promptText: $("promptText"),
  promptLabel: $("promptLabel"),
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
  sentence: [],       // removed tiles waiting in the sentence bar
  boardTiles: [],     // tiles currently on board
  slots: [],          // layout slots: {x,y,z}
  currentPrompt: null
};

// ------------ Language rules ------------
const LANG = {
  en: { name: "English", pronounRequired: true, normalize: s => s.trim().toLowerCase() },
  es: {
    name: "Spanish",
    pronounRequired: false,
    normalize: s => s.trim().toLowerCase().replaceAll("ñ","n") // allowance ñ≡n
  },
  de: { name: "German", pronounRequired: true, normalize: s => s.trim().toLowerCase() }
};
const norm = (s) => LANG[state.lang].normalize(s);

// agreement tag helper
const ak = (p, n) => `${p}${n}`; // 1sg, 3pl etc.

// tile constructors
function t(text, pos, meta=null){ return { id:`t${state.tileId++}`, text, pos, meta, x:0, y:0, z:0 }; }
function tPron(text, agrees){ return t(text, "pronoun", { agrees }); }
function tVerb(text, agrees){ return t(text, "verb", { agrees }); }

// ------------ Dictionaries ------------
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
  en: [ ["to","prep"],["school","noun"],["football","noun"],["an","det"],["apple","noun"],["Spanish","noun"],["homework","noun"] ]
    .map(([w,p])=>t(w,p)),
  es: [ ["a","prep"],["la","det"],["escuela","noun"],["al","prep"],["fútbol","noun"],["una","det"],["manzana","noun"],["español","noun"],["tarea","noun"] ]
    .map(([w,p])=>t(w,p)),
  de: [ ["zur","prep"],["schule","noun"],["fußball","noun"],["einen","det"],["apfel","noun"],["deutsch","noun"],["hausaufgaben","noun"] ]
    .map(([w,p])=>t(w,p))
};

// Prompts (we’ll only pick ones we can still build from remaining board tiles)
const PROMPTS = {
  en: [
    { goal:"I go to school", accept:[["I","go","to","school"]] },
    { goal:"He plays football", accept:[["he","plays","football"]] },
    { goal:"She eats an apple", accept:[["she","eats","an","apple"]] },
    { goal:"We study Spanish", accept:[["we","study","Spanish"]] },
    { goal:"They have homework", accept:[["they","have","homework"]] },
    { goal:"He goes to school", accept:[["he","goes","to","school"]] },
  ],
  es: [
    { goal:"I go to school", accept:[["voy","a","la","escuela"],["yo","voy","a","la","escuela"]] },
    { goal:"He plays football", accept:[["juega","al","fútbol"],["él","juega","al","fútbol"]] },
    { goal:"She eats an apple", accept:[["come","una","manzana"],["ella","come","una","manzana"]] },
    { goal:"We study Spanish", accept:[["estudiamos","español"],["nosotros","estudiamos","español"]] },
    { goal:"They have homework", accept:[["tienen","tarea"],["ellos","tienen","tarea"],["ellas","tienen","tarea"]] },
    { goal:"They go to school", accept:[["van","a","la","escuela"],["ellos","van","a","la","escuela"],["ellas","van","a","la","escuela"]] },
  ],
  de: [
    { goal:"I go to school", accept:[["ich","gehe","zur","schule"]] },
    { goal:"He plays football", accept:[["er","spielt","fußball"]] },
    { goal:"She eats an apple", accept:[["sie","isst","einen","apfel"]] },
    { goal:"We study German", accept:[["wir","lernen","deutsch"]] },
    { goal:"They have homework", accept:[["sie","haben","hausaufgaben"]] },
    { goal:"We go to school", accept:[["wir","gehen","zur","schule"]] },
  ]
};

// ------------ Layout templates ------------
function makeSlots(diff){
  // x,y are grid coords. We keep it simple but layered.
  const slots = [];

  // base grid sizes
  const cfg = diff === "easy"
    ? { w:6, h:4, layers:1 }
    : diff === "hard"
      ? { w:8, h:5, layers:3 }
      : { w:7, h:5, layers:2 };

  // layer 0: full-ish rectangle with a couple of holes for side freedom
  for (let y=0; y<cfg.h; y++){
    for (let x=0; x<cfg.w; x++){
      // carve a few holes to guarantee side-free tiles
      const hole = (y===1 && x===0) || (y===cfg.h-2 && x===cfg.w-1);
      if (!hole) slots.push({x,y,z:0});
    }
  }

  // upper layers smaller “islands”
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

// ------------ Board generation (single board to clear) ------------
function freshBoard(){
  state.score = 0;
  state.tileId = 1;
  state.sentence = [];
  state.currentPrompt = null;

  state.slots = makeSlots(state.diff);

  // Decide how many tiles we can place (one per slot)
  const N = state.slots.length;

  // Build a balanced multiset so we don’t “run out”
  // (lots of verbs/pronouns + enough nouns/objects)
  const tiles = [];

  const pron = PRONOUNS[state.lang].map(cloneFresh);
  const verbs = VERBS[state.lang].map(cloneFresh);
  const other = OTHER[state.lang].map(cloneFresh);

  // weights by difficulty
  const mix = state.diff === "easy"
    ? { pron:0.20, verbs:0.25, other:0.55 }
    : state.diff === "hard"
      ? { pron:0.22, verbs:0.28, other:0.50 }
      : { pron:0.20, verbs:0.27, other:0.53 };

  // start by forcing multiple duplicates of essentials:
  // - 6 pronouns (or less if language has fewer)
  // - 10 verbs
  // - rest other
  addRandomCopies(tiles, pron, Math.min(8, Math.floor(N*mix.pron)));
  addRandomCopies(tiles, verbs, Math.min(12, Math.floor(N*mix.verbs)));
  while (tiles.length < N){
    // prefer other, but sprinkle extra verbs so you can keep building
    const pickFrom = (Math.random() < 0.72) ? other : verbs;
    tiles.push(cloneFresh(pickFrom[Math.floor(Math.random()*pickFrom.length)]));
  }

  // Place tiles onto slots
  shuffleInPlace(tiles);
  state.boardTiles = tiles.slice(0,N).map((ti, i) => {
    const s = state.slots[i];
    return { ...ti, x:s.x, y:s.y, z:s.z };
  });

  // Pick a solvable prompt from this board
  chooseNextPromptOrEnd();
  renderAll();
  setFeedback("Board created. Clear it by building correct sentences!", "neutral");
}

function addRandomCopies(out, sourceArr, count){
  for (let i=0;i<count;i++){
    const t0 = sourceArr[Math.floor(Math.random()*sourceArr.length)];
    out.push(cloneFresh(t0));
  }
}

function cloneFresh(base){
  // base tile has id from previous build; ignore it
  return { ...base, id:`t${state.tileId++}` };
}

// ------------ Prompt selection based on remaining tiles ------------
function chooseNextPromptOrEnd(){
  if (state.boardTiles.length === 0){
    state.currentPrompt = null;
    els.promptText.textContent = "🎉 Board cleared!";
    setFeedback("Legend. You cleared the whole board.", "ok");
    return;
  }

  const candidates = (PROMPTS[state.lang] || []).filter(p => promptPossibleWithBoard(p));
  if (candidates.length === 0){
    state.currentPrompt = null;
    els.promptText.textContent = "No solvable prompt left";
    setFeedback(
      "You’ve hit a dead-end with the remaining tiles.\nUse “Shuffle layout” to rearrange the same tiles, or make a New Board.",
      "bad"
    );
    return;
  }

  state.currentPrompt = candidates[Math.floor(Math.random()*candidates.length)];
  updateHints();
}

function promptPossibleWithBoard(p){
  // check if ANY accepted sentence can be made from remaining tiles (by counts)
  const boardWords = state.boardTiles.map(ti => norm(ti.text));
  const boardCount = countMap(boardWords);

  return p.accept.some(arr => {
    const needCount = countMap(arr.map(w => norm(w)));
    for (const [w, c] of Object.entries(needCount)){
      if ((boardCount[w] || 0) < c) return false;
    }
    return true;
  });
}

function countMap(arr){
  const m = {};
  for (const k of arr) m[k] = (m[k]||0)+1;
  return m;
}

// ------------ Mahjong “playable” logic ------------
function isPlayable(tile){
  // (1) no tile above at same x,y
  const hasAbove = state.boardTiles.some(t => t.x===tile.x && t.y===tile.y && t.z>tile.z);
  if (hasAbove) return false;

  // (2) side freedom: left OR right empty on same z
  const leftBlocked  = state.boardTiles.some(t => t.z===tile.z && t.y===tile.y && t.x===tile.x-1);
  const rightBlocked = state.boardTiles.some(t => t.z===tile.z && t.y===tile.y && t.x===tile.x+1);
  return !(leftBlocked && rightBlocked);
}

// ------------ Interactions ------------
function clickTile(tileId){
  const tile = state.boardTiles.find(t => t.id===tileId);
  if (!tile) return;
  if (!isPlayable(tile)) return;

  // remove from board into sentence
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

  // Keep same multiset of tiles; just reassign slots
  const remaining = [...state.boardTiles];
  const slots = [...state.slots].slice(0, remaining.length);

  // shuffle both and re-place
  shuffleInPlace(remaining);
  shuffleInPlace(slots);

  state.boardTiles = remaining.map((ti, i) => ({ ...ti, x: slots[i].x, y: slots[i].y, z: slots[i].z }));

  // prompt might become solvable again
  if (!state.currentPrompt || !promptPossibleWithBoard(state.currentPrompt)) {
    chooseNextPromptOrEnd();
  }

  renderAll();
  setFeedback("Layout shuffled (same tiles).", "neutral");
}

// ------------ Sentence checking ------------
function checkSentence(){
  if (!state.currentPrompt){
    setFeedback("No active prompt. Make a New Board or Shuffle.", "bad");
    return;
  }

  const built = state.sentence.map(ti => ti.text);
  const builtNorm = built.map(norm);

  if (builtNorm.length === 0){
    setFeedback("Build the sentence first.", "bad");
    return;
  }

  const verbTile = state.sentence.find(t => t.pos==="verb");
  if (!verbTile){
    setFeedback(`Missing a verb.\nExample: ${exampleSentence()}`, "bad");
    return;
  }

  const pronTile = state.sentence.find(t => t.pos==="pronoun") || null;

  // EN/DE require pronoun
  if (LANG[state.lang].pronounRequired && !pronTile){
    setFeedback(`Missing the subject pronoun.\nExample: ${exampleSentence()}`, "bad");
    return;
  }

  // if pronoun present, must agree with verb
  if (pronTile?.meta?.agrees && verbTile?.meta?.agrees){
    const ok = pronTile.meta.agrees.some(a => verbTile.meta.agrees.includes(a));
    if (!ok){
      setFeedback(
        `Pronoun/verb mismatch.\nYou used “${pronTile.text}” but “${verbTile.text}” doesn’t match.\nExample: ${exampleSentence()}`,
        "bad"
      );
      return;
    }
  }

  // exact match against any accepted sentence
  const accepted = state.currentPrompt.accept.some(arr => arraysEqual(arr.map(norm), builtNorm));
  if (!accepted){
    setFeedback(
      `Almost — word order/choice is off.\nYour: ${built.join(" ")}\nExample: ${exampleSentence()}`,
      "bad"
    );
    return;
  }

  // ✅ correct: keep tiles removed (they're already off board)
  state.score++;
  state.sentence = [];

  // choose next solvable prompt from remaining tiles
  chooseNextPromptOrEnd();
  renderAll();

  if (state.currentPrompt){
    setFeedback(`✅ Correct. Keep clearing!\nNext: ${state.currentPrompt.goal}`, "ok");
  } else if (state.boardTiles.length === 0){
    // already handled
  } else {
    // dead-end handled
  }
}

// ------------ Rendering ------------
function renderAll(){
  els.score.textContent = String(state.score);
  els.tilesLeft.textContent = String(state.boardTiles.length);

  // prompt
  if (state.currentPrompt){
    els.promptText.textContent = state.currentPrompt.goal;
  }

  renderSentence();
  renderBoard();
  updateHints();
}

function renderSentence(){
  els.sentenceBar.innerHTML = "";
  if (!state.sentence.length){
    const hint = document.createElement("div");
    hint.style.color = "rgba(0,0,0,.45)";
    hint.style.fontWeight = "700";
    hint.textContent = "Tap playable tiles to build the sentence…";
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

  // Set board size based on max x/y in slots so it doesn’t clip
  const maxX = Math.max(...state.slots.map(s=>s.x), 0);
  const maxY = Math.max(...state.slots.map(s=>s.y), 0);
  const approxW = (maxX+1) * (px("--tw") + px("--gap")) + 80;
  const approxH = (maxY+1) * (px("--th") + px("--gap")) + 80;
  els.board.style.width = `${approxW}px`;
  els.board.style.height = `${approxH}px`;

  // render lowest first, highest last
  const tiles = [...state.boardTiles].sort((a,b)=>a.z-b.z);

  for (const ti of tiles){
    const div = document.createElement("div");
    div.className = "tile";
    div.dataset.pos = ti.pos || "other";

    const playable = isPlayable(ti);
    div.classList.add(playable ? "playable" : "blocked");
    if (playable) div.addEventListener("click", ()=>clickTile(ti.id));

    // position
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

function px(cssVar){
  // read css variable (e.g. --tw) and return px number
  const v = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  if (v.endsWith("px")) return parseFloat(v);
  // for clamp() etc: browser returns computed px
  return parseFloat(v) || 70;
}

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

function updateHints(){
  const L = LANG[state.lang];
  els.promptLabel.textContent = `${L.name} (${state.diff})`;

  if (state.lang === "es"){
    els.ruleHint.textContent = "Spanish: pronoun optional (voy = I go). If you use a pronoun, it MUST match the verb.";
  } else if (state.lang === "en"){
    els.ruleHint.textContent = "English: pronoun required here. Match: he plays / I play / they play.";
  } else {
    els.ruleHint.textContent = "German: pronoun required here. Match: ich gehe / er geht / wir gehen.";
  }
}

function setFeedback(text, kind){
  els.feedback.textContent = text;
  els.feedback.classList.remove("ok","bad");
  if (kind==="ok") els.feedback.classList.add("ok");
  if (kind==="bad") els.feedback.classList.add("bad");
}

function exampleSentence(){
  const arr = state.currentPrompt?.accept?.[0] || [];
  return arr.join(" ");
}

function arraysEqual(a,b){
  if (a.length!==b.length) return false;
  for (let i=0;i<a.length;i++) if (a[i]!==b[i]) return false;
  return true;
}

function shuffleInPlace(arr){
  for (let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
}

// ------------ Wiring ------------
els.langSelect.addEventListener("change", ()=>{
  state.lang = els.langSelect.value;
  freshBoard();
});
els.diffSelect.addEventListener("change", ()=>{
  state.diff = els.diffSelect.value;
  freshBoard();
});
els.startBtn.addEventListener("click", freshBoard);
els.shuffleBtn.addEventListener("click", shuffleLayout);
els.undoBtn.addEventListener("click", undo);
els.clearBtn.addEventListener("click", clearSentence);
els.checkBtn.addEventListener("click", checkSentence);

// initial
freshBoard();
