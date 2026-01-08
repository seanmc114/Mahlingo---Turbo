/* Mahlingo Tiles
   - Spanish: allows null subject (voy = I go). If pronoun present, must agree with verb.
   - German: subject pronoun required, and must agree with verb.
   - Shuffle button randomizes tile order.
   - Feedback explains WHY incorrect.
*/

const $ = (id) => document.getElementById(id);

const state = {
  lang: "es",
  score: 0,
  promptIndex: 0,
  currentPrompt: null,
  sentence: [],        // array of tile objects chosen
  tiles: [],           // array of tile objects available
  tileIdCounter: 1
};

// ---------- DATA ----------

/**
 * tile object:
 * { id, text, pos, meta? }
 *
 * For verbs: meta = { person: 1|2|3, number: "sg"|"pl", lemma?: string }
 * For pronouns: meta = { person, number }
 */

const LANG = {
  es: {
    name: "Spanish",
    pronounRequired: false, // BUT if present, must agree
    // allow ñ ≡ n (keyboard allowance); accents still required because we do NOT strip them
    normalize(s) {
      return s
        .trim()
        .toLowerCase()
        .replaceAll("ñ", "n"); // allowance
    }
  },
  de: {
    name: "German",
    pronounRequired: true,
    normalize(s) {
      return s.trim().toLowerCase();
    }
  }
};

const PRONOUNS = {
  es: [
    tPron("yo", 1, "sg"),
    tPron("tú", 2, "sg"),
    tPron("él", 3, "sg"),
    tPron("ella", 3, "sg"),
    tPron("nosotros", 1, "pl"),
    tPron("vosotros", 2, "pl"),
    tPron("ellos", 3, "pl"),
    tPron("ellas", 3, "pl")
  ],
  de: [
    tPron("ich", 1, "sg"),
    tPron("du", 2, "sg"),
    tPron("er", 3, "sg"),
    tPron("sie", 3, "sg"),  // she
    tPron("wir", 1, "pl"),
    tPron("ihr", 2, "pl"),
    tPron("sie", 3, "pl")   // they
  ]
};

const PROMPTS = {
  es: [
    // Accept both with and without pronoun
    prompt("I go to school", [
      ["voy", "a", "la", "escuela"],
      ["yo", "voy", "a", "la", "escuela"]
    ]),
    prompt("He plays football", [
      ["juega", "al", "fútbol"],
      ["él", "juega", "al", "fútbol"]
    ]),
    prompt("She eats an apple", [
      ["come", "una", "manzana"],
      ["ella", "come", "una", "manzana"]
    ]),
    prompt("We study Spanish", [
      ["estudiamos", "español"],
      ["nosotros", "estudiamos", "español"]
    ]),
    prompt("They have homework", [
      ["tienen", "tarea"],
      ["ellos", "tienen", "tarea"],
      ["ellas", "tienen", "tarea"]
    ])
  ],
  de: [
    // German requires subject pronoun here
    prompt("I go to school", [
      ["ich", "gehe", "zur", "schule"]
    ]),
    prompt("He plays football", [
      ["er", "spielt", "fußball"]
    ]),
    prompt("She eats an apple", [
      ["sie", "isst", "einen", "apfel"]
    ]),
    prompt("We study German", [
      ["wir", "lernen", "deutsch"]
    ]),
    prompt("They have homework", [
      ["sie", "haben", "hausaufgaben"]
    ])
  ]
};

// Verb metadata (agreement rules)
const VERBS = {
  es: [
    tVerb("voy", 1, "sg"),
    tVerb("vas", 2, "sg"),
    tVerb("va", 3, "sg"),
    tVerb("vamos", 1, "pl"),
    tVerb("vais", 2, "pl"),
    tVerb("van", 3, "pl"),

    tVerb("juego", 1, "sg"),
    tVerb("juegas", 2, "sg"),
    tVerb("juega", 3, "sg"),
    tVerb("jugamos", 1, "pl"),
    tVerb("jugáis", 2, "pl"),
    tVerb("juegan", 3, "pl"),

    tVerb("como", 1, "sg"),
    tVerb("comes", 2, "sg"),
    tVerb("come", 3, "sg"),
    tVerb("comemos", 1, "pl"),
    tVerb("coméis", 2, "pl"),
    tVerb("comen", 3, "pl"),

    tVerb("estudio", 1, "sg"),
    tVerb("estudias", 2, "sg"),
    tVerb("estudia", 3, "sg"),
    tVerb("estudiamos", 1, "pl"),
    tVerb("estudiáis", 2, "pl"),
    tVerb("estudian", 3, "pl"),

    tVerb("tengo", 1, "sg"),
    tVerb("tienes", 2, "sg"),
    tVerb("tiene", 3, "sg"),
    tVerb("tenemos", 1, "pl"),
    tVerb("tenéis", 2, "pl"),
    tVerb("tienen", 3, "pl")
  ],
  de: [
    tVerb("gehe", 1, "sg"),
    tVerb("gehst", 2, "sg"),
    tVerb("geht", 3, "sg"),
    tVerb("gehen", 1, "pl"),
    tVerb("geht", 2, "pl"),
    tVerb("gehen", 3, "pl"),

    tVerb("spiele", 1, "sg"),
    tVerb("spielst", 2, "sg"),
    tVerb("spielt", 3, "sg"),
    tVerb("spielen", 1, "pl"),
    tVerb("spielt", 2, "pl"),
    tVerb("spielen", 3, "pl"),

    tVerb("esse", 1, "sg"),
    tVerb("isst", 2, "sg"),
    tVerb("isst", 3, "sg"),
    tVerb("essen", 1, "pl"),
    tVerb("esst", 2, "pl"),
    tVerb("essen", 3, "pl"),

    tVerb("lerne", 1, "sg"),
    tVerb("lernst", 2, "sg"),
    tVerb("lernt", 3, "sg"),
    tVerb("lernen", 1, "pl"),
    tVerb("lernt", 2, "pl"),
    tVerb("lernen", 3, "pl"),

    tVerb("habe", 1, "sg"),
    tVerb("hast", 2, "sg"),
    tVerb("hat", 3, "sg"),
    tVerb("haben", 1, "pl"),
    tVerb("habt", 2, "pl"),
    tVerb("haben", 3, "pl")
  ]
};

// Other tiles needed for prompts
const OTHER_TILES = {
  es: [
    t("a", "prep"),
    t("la", "det"),
    t("escuela", "noun"),
    t("al", "prep"),
    t("fútbol", "noun"),
    t("una", "det"),
    t("manzana", "noun"),
    t("español", "noun"),
    t("tarea", "noun")
  ],
  de: [
    t("zur", "prep"),
    t("schule", "noun"),
    t("fußball", "noun"),
    t("einen", "det"),
    t("apfel", "noun"),
    t("deutsch", "noun"),
    t("hausaufgaben", "noun")
  ]
};

// ---------- HELPERS (tile constructors) ----------
function t(text, pos) {
  return { id: `t${state.tileIdCounter++}`, text, pos };
}
function tPron(text, person, number) {
  return { id: `t${state.tileIdCounter++}`, text, pos: "pronoun", meta: { person, number } };
}
function tVerb(text, person, number) {
  return { id: `t${state.tileIdCounter++}`, text, pos: "verb", meta: { person, number } };
}
function prompt(english, acceptArrays) {
  return { english, accept: acceptArrays };
}

// ---------- UI ----------
const els = {
  langSelect: $("langSelect"),
  startBtn: $("startBtn"),
  promptText: $("promptText"),
  ruleHint: $("ruleHint"),
  score: $("score"),
  tileGrid: $("tileGrid"),
  sentenceBar: $("sentenceBar"),
  feedback: $("feedback"),
  undoBtn: $("undoBtn"),
  clearBtn: $("clearBtn"),
  shuffleBtn: $("shuffleBtn"),
  checkBtn: $("checkBtn")
};

els.langSelect.addEventListener("change", () => {
  state.lang = els.langSelect.value;
  resetGame(true);
});

els.startBtn.addEventListener("click", () => resetGame(true));
els.undoBtn.addEventListener("click", undo);
els.clearBtn.addEventListener("click", clearSentence);
els.shuffleBtn.addEventListener("click", shuffleTiles);
els.checkBtn.addEventListener("click", checkSentence);

// ---------- GAME FLOW ----------
function resetGame(resetScore) {
  state.sentence = [];
  state.tiles = [];
  state.promptIndex = 0;
  state.currentPrompt = null;
  if (resetScore) state.score = 0;

  // seed a good starting pool
  seedTilesForLanguage();

  // pick first prompt
  nextPrompt();

  renderAll();
  setFeedback("Ready. Tap tiles to build the sentence.", "neutral");
}

function seedTilesForLanguage() {
  // Fresh tile pool from components (pronouns + verbs + other), then we'll ensure solvable for each prompt.
  const lang = state.lang;

  // rebuild ids cleanly
  state.tileIdCounter = 1;

  const pool = [
    ...cloneTiles(PRONOUNS[lang]),
    ...cloneTiles(VERBS[lang]),
    ...cloneTiles(OTHER_TILES[lang])
  ];

  // Keep pool size sensible (phone-friendly). We’ll start with a subset but always add what’s needed.
  // Take all verbs + all pronouns + all others for simplicity (still small).
  state.tiles = pool;
}

function nextPrompt() {
  const list = PROMPTS[state.lang];
  if (!list.length) return;

  state.currentPrompt = list[state.promptIndex % list.length];
  state.promptIndex++;

  // Ensure all tiles needed for at least one acceptable answer exist
  ensureSolvableForPrompt(state.currentPrompt);

  // Clear current sentence each prompt
  state.sentence = [];

  updateRuleHint();
}

function updateRuleHint() {
  const langObj = LANG[state.lang];
  if (state.lang === "es") {
    els.ruleHint.textContent = "Spanish: subject pronoun is optional (e.g., “voy…”). If you use a pronoun, it MUST match the verb.";
  } else {
    els.ruleHint.textContent = "German: subject pronoun is required here (e.g., “ich…”). Pronoun MUST match the verb.";
  }
}

function ensureSolvableForPrompt(p) {
  // pick the first acceptable answer as the "example"
  const needed = p.accept[0] || [];
  const neededCounts = countWords(needed, state.lang);

  const currentCounts = countWords(state.tiles.map(t => t.text), state.lang);

  for (const [wNorm, count] of Object.entries(neededCounts)) {
    const have = currentCounts[wNorm] || 0;
    const missing = count - have;
    if (missing > 0) {
      // Create missing tiles with best-guess POS
      for (let i = 0; i < missing; i++) {
        state.tiles.push(makeTileForWord(wNorm));
      }
    }
  }
}

function makeTileForWord(wordNorm) {
  // Find original display word from prompt accept list by matching normalize
  const norm = (s) => LANG[state.lang].normalize(s);
  let display = wordNorm;
  for (const p of PROMPTS[state.lang]) {
    for (const arr of p.accept) {
      for (const w of arr) {
        if (norm(w) === wordNorm) display = w;
      }
    }
  }

  // Determine POS from dictionaries
  const dictAll = [
    ...PRONOUNS[state.lang],
    ...VERBS[state.lang],
    ...OTHER_TILES[state.lang]
  ];
  const found = dictAll.find(ti => norm(ti.text) === wordNorm);
  if (found) {
    // clone with fresh id
    if (found.pos === "pronoun") return tPron(found.text, found.meta.person, found.meta.number);
    if (found.pos === "verb") return tVerb(found.text, found.meta.person, found.meta.number);
    return t(found.text, found.pos);
  }
  // fallback
  return t(display, "other");
}

// ---------- ACTIONS ----------
function onTileClick(tileId) {
  const idx = state.tiles.findIndex(ti => ti.id === tileId);
  if (idx === -1) return;
  const [tile] = state.tiles.splice(idx, 1);
  state.sentence.push(tile);
  renderAll();
}

function undo() {
  const tile = state.sentence.pop();
  if (!tile) return;
  state.tiles.push(tile);
  renderAll();
}

function clearSentence() {
  if (!state.sentence.length) return;
  state.tiles.push(...state.sentence);
  state.sentence = [];
  renderAll();
}

function shuffleTiles() {
  state.tiles = shuffle([...state.tiles]);
  renderTiles();
  setFeedback("Tiles shuffled.", "neutral");
}

// ---------- CHECKING ----------
function checkSentence() {
  if (!state.currentPrompt) return;

  const built = state.sentence.map(ti => ti.text);
  const builtNorm = built.map(w => LANG[state.lang].normalize(w));

  if (builtNorm.length === 0) {
    setFeedback("Build the sentence first.", "bad");
    return;
  }

  // 1) verb present?
  const verbTile = state.sentence.find(ti => ti.pos === "verb");
  if (!verbTile) {
    setFeedback(explainMissingVerb(), "bad");
    return;
  }

  // 2) pronoun/verb agreement checks
  const pronTile = firstPronounTile(state.sentence);

  // German: pronoun required
  if (LANG[state.lang].pronounRequired && !pronTile) {
    setFeedback(
      `Not quite. German needs the subject here (e.g., “ich / du / er / sie / wir …”).\nTry: ${exampleSentence()}`,
      "bad"
    );
    return;
  }

  // If pronoun exists, it must agree
  if (pronTile && verbTile.meta) {
    const ok = (pronTile.meta.person === verbTile.meta.person) && (pronTile.meta.number === verbTile.meta.number);
    if (!ok) {
      setFeedback(
        `Pronoun/verb mismatch.\nYou used “${pronTile.text}” but the verb “${verbTile.text}” is ${personLabel(verbTile.meta)}.\nTry: ${exampleSentence()}`,
        "bad"
      );
      return;
    }
  }

  // 3) exact accept match (with normalization rules)
  const accepted = state.currentPrompt.accept.some(arr => {
    const arrNorm = arr.map(w => LANG[state.lang].normalize(w));
    return arraysEqual(arrNorm, builtNorm);
  });

  if (!accepted) {
    // Give a specific, helpful message
    // If pronoun is missing in Spanish, it's still okay, so main likely issue is order or wrong word choice.
    // Provide best guidance: show an example correct sentence.
    setFeedback(
      `Almost. The word order or choice is off.\nYour: ${joinSentence(built)}\nExample: ${exampleSentence()}`,
      "bad"
    );
    return;
  }

  // Correct!
  state.score++;
  els.score.textContent = String(state.score);

  // Keep used tiles "removed" (they're already out of tile pool). Move to next prompt.
  setFeedback(`✅ Correct!\n${joinSentence(built)}\nNext prompt…`, "ok");

  nextPrompt();
  renderAll();
}

// ---------- EXPLANATIONS ----------
function explainMissingVerb() {
  const ex = exampleSentence();
  if (state.lang === "es") {
    return `Not quite — I can’t see a verb tile.\nSpanish sentences need a conjugated verb (e.g., “voy / juega / come / estudiamos / tienen …”).\nTry: ${ex}`;
  }
  return `Not quite — I can’t see a verb tile.\nGerman sentences need a verb (e.g., “gehe / spielt / isst / lernen / haben …”).\nTry: ${ex}`;
}

function exampleSentence() {
  const arr = state.currentPrompt?.accept?.[0] || [];
  return joinSentence(arr);
}

function personLabel(meta) {
  const p = meta.person;
  const n = meta.number;
  const pStr = (p === 1 ? "1st person" : p === 2 ? "2nd person" : "3rd person");
  const nStr = (n === "sg" ? "singular" : "plural");
  return `${pStr} ${nStr}`;
}

// ---------- RENDER ----------
function renderAll() {
  els.promptText.textContent = state.currentPrompt ? state.currentPrompt.english : "Press Start";
  els.score.textContent = String(state.score);
  renderSentence();
  renderTiles();
}

function renderSentence() {
  els.sentenceBar.innerHTML = "";
  if (!state.sentence.length) {
    const hint = document.createElement("div");
    hint.className = "mutedHint";
    hint.style.color = "rgba(0,0,0,.45)";
    hint.style.fontWeight = "700";
    hint.textContent = "Tap tiles below to build the sentence…";
    els.sentenceBar.appendChild(hint);
    return;
  }
  for (const ti of state.sentence) {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.textContent = ti.text;
    chip.style.padding = "8px 10px";
    chip.style.borderRadius = "999px";
    chip.style.border = "1px solid #e5e7eb";
    chip.style.background = "#fff";
    chip.style.fontWeight = "900";
    els.sentenceBar.appendChild(chip);
  }
}

function renderTiles() {
  els.tileGrid.innerHTML = "";
  for (const ti of state.tiles) {
    const btn = document.createElement("button");
    btn.className = "tile";
    btn.type = "button";
    btn.dataset.pos = ti.pos || "other";
    btn.addEventListener("click", () => onTileClick(ti.id));

    const w = document.createElement("div");
    w.className = "word";
    w.textContent = ti.text;

    const pos = document.createElement("div");
    pos.className = "pos";
    pos.textContent = prettyPOS(ti.pos);

    btn.appendChild(w);
    btn.appendChild(pos);
    els.tileGrid.appendChild(btn);
  }
}

function prettyPOS(pos) {
  switch (pos) {
    case "pronoun": return "Pronoun";
    case "verb": return "Verb";
    case "det": return "Det";
    case "noun": return "Noun";
    case "prep": return "Prep";
    default: return "Other";
  }
}

function setFeedback(text, kind) {
  els.feedback.textContent = text;
  els.feedback.classList.remove("ok", "bad");
  if (kind === "ok") els.feedback.classList.add("ok");
  if (kind === "bad") els.feedback.classList.add("bad");
}

// ---------- UTIL ----------
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function joinSentence(words) {
  // words can be array of strings or already joined
  const arr = Array.isArray(words) ? words : String(words).split(" ");
  return arr.join(" ");
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cloneTiles(list) {
  // Recreate tiles with fresh IDs so duplicates behave properly
  return list.map(ti => {
    if (ti.pos === "pronoun") return tPron(ti.text, ti.meta.person, ti.meta.number);
    if (ti.pos === "verb") return tVerb(ti.text, ti.meta.person, ti.meta.number);
    return t(ti.text, ti.pos);
  });
}

function firstPronounTile(sentenceTiles) {
  // Take the first pronoun tile in the built sentence
  return sentenceTiles.find(ti => ti.pos === "pronoun") || null;
}

function countWords(words, lang) {
  const norm = (s) => LANG[lang].normalize(s);
  const out = {};
  for (const w of words) {
    const k = norm(w);
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

// Auto start with Spanish loaded (but not running prompt until Start)
resetGame(true);
