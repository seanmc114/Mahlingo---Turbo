/* Mahlingo Tiles
  - Languages: EN / ES / DE
  - Difficulty: Easy / Medium / Hard
  - Agreement: if pronoun present, it MUST match the verb.
  - Subject requirement:
      ES: pronoun optional (verb can carry subject: "voy" = 1sg)
      EN/DE: pronoun required for these prompts
  - Feedback explains WHY incorrect
  - Shuffle button
*/

const $ = (id) => document.getElementById(id);

const state = {
  lang: "es",
  diff: "medium",         // easy | medium | hard
  score: 0,
  currentPrompt: null,
  sentence: [],
  tiles: [],
  tileIdCounter: 1
};

// ---------- Core helpers ----------
function agreeKey(person, number){ return `${person}${number}`; } // e.g., 1sg, 3pl

function t(text, pos) {
  return { id: `t${state.tileIdCounter++}`, text, pos };
}
function tPron(text, agrees) {
  return { id: `t${state.tileIdCounter++}`, text, pos: "pronoun", meta: { agrees } };
}
function tVerb(text, agrees) {
  return { id: `t${state.tileIdCounter++}`, text, pos: "verb", meta: { agrees } };
}
function prompt(goal, acceptArrays, diff) {
  return { goal, accept: acceptArrays, diff }; // diff: easy|medium|hard
}

const LANG = {
  en: {
    name: "English",
    pronounRequired: true,
    normalize(s){ return s.trim().toLowerCase(); }
  },
  es: {
    name: "Spanish",
    pronounRequired: false,
    normalize(s){
      // capitals ignored; ñ≡n allowed; accents are NOT removed (so accents are required)
      return s.trim().toLowerCase().replaceAll("ñ", "n");
    }
  },
  de: {
    name: "German",
    pronounRequired: true,
    normalize(s){ return s.trim().toLowerCase(); }
  }
};

// ---------- Dictionaries ----------
const PRONOUNS = {
  en: [
    tPron("I",   [agreeKey(1,"sg")]),
    tPron("you", [agreeKey(2,"sg"), agreeKey(2,"pl")]),
    tPron("he",  [agreeKey(3,"sg")]),
    tPron("she", [agreeKey(3,"sg")]),
    tPron("we",  [agreeKey(1,"pl")]),
    tPron("they",[agreeKey(3,"pl")])
  ],
  es: [
    tPron("yo", [agreeKey(1,"sg")]),
    tPron("tú", [agreeKey(2,"sg")]),
    tPron("él", [agreeKey(3,"sg")]),
    tPron("ella",[agreeKey(3,"sg")]),
    tPron("nosotros",[agreeKey(1,"pl")]),
    tPron("vosotros",[agreeKey(2,"pl")]),
    tPron("ellos",[agreeKey(3,"pl")]),
    tPron("ellas",[agreeKey(3,"pl")])
  ],
  de: [
    tPron("ich",[agreeKey(1,"sg")]),
    tPron("du",[agreeKey(2,"sg")]),
    tPron("er",[agreeKey(3,"sg")]),
    tPron("sie",[agreeKey(3,"sg")]),     // she
    tPron("wir",[agreeKey(1,"pl")]),
    tPron("ihr",[agreeKey(2,"pl")]),
    tPron("sie",[agreeKey(3,"pl")])      // they
  ]
};

const VERBS = {
  en: [
    // go / goes
    tVerb("go",   [agreeKey(1,"sg"), agreeKey(2,"sg"), agreeKey(2,"pl"), agreeKey(1,"pl"), agreeKey(3,"pl")]),
    tVerb("goes", [agreeKey(3,"sg")]),
    // play / plays
    tVerb("play",   [agreeKey(1,"sg"), agreeKey(2,"sg"), agreeKey(2,"pl"), agreeKey(1,"pl"), agreeKey(3,"pl")]),
    tVerb("plays",  [agreeKey(3,"sg")]),
    // eat / eats
    tVerb("eat",   [agreeKey(1,"sg"), agreeKey(2,"sg"), agreeKey(2,"pl"), agreeKey(1,"pl"), agreeKey(3,"pl")]),
    tVerb("eats",  [agreeKey(3,"sg")]),
    // study / studies
    tVerb("study",   [agreeKey(1,"sg"), agreeKey(2,"sg"), agreeKey(2,"pl"), agreeKey(1,"pl"), agreeKey(3,"pl")]),
    tVerb("studies", [agreeKey(3,"sg")]),
    // have / has
    tVerb("have", [agreeKey(1,"sg"), agreeKey(2,"sg"), agreeKey(2,"pl"), agreeKey(1,"pl"), agreeKey(3,"pl")]),
    tVerb("has",  [agreeKey(3,"sg")])
  ],
  es: [
    // ir
    tVerb("voy",   [agreeKey(1,"sg")]),
    tVerb("vas",   [agreeKey(2,"sg")]),
    tVerb("va",    [agreeKey(3,"sg")]),
    tVerb("vamos", [agreeKey(1,"pl")]),
    tVerb("vais",  [agreeKey(2,"pl")]),
    tVerb("van",   [agreeKey(3,"pl")]),
    // jugar
    tVerb("juego",   [agreeKey(1,"sg")]),
    tVerb("juegas",  [agreeKey(2,"sg")]),
    tVerb("juega",   [agreeKey(3,"sg")]),
    tVerb("jugamos", [agreeKey(1,"pl")]),
    tVerb("jugáis",  [agreeKey(2,"pl")]),
    tVerb("juegan",  [agreeKey(3,"pl")]),
    // comer
    tVerb("como",   [agreeKey(1,"sg")]),
    tVerb("comes",  [agreeKey(2,"sg")]),
    tVerb("come",   [agreeKey(3,"sg")]),
    tVerb("comemos",[agreeKey(1,"pl")]),
    tVerb("coméis", [agreeKey(2,"pl")]),
    tVerb("comen",  [agreeKey(3,"pl")]),
    // estudiar
    tVerb("estudio",    [agreeKey(1,"sg")]),
    tVerb("estudias",   [agreeKey(2,"sg")]),
    tVerb("estudia",    [agreeKey(3,"sg")]),
    tVerb("estudiamos", [agreeKey(1,"pl")]),
    tVerb("estudiáis",  [agreeKey(2,"pl")]),
    tVerb("estudian",   [agreeKey(3,"pl")]),
    // tener
    tVerb("tengo",   [agreeKey(1,"sg")]),
    tVerb("tienes",  [agreeKey(2,"sg")]),
    tVerb("tiene",   [agreeKey(3,"sg")]),
    tVerb("tenemos", [agreeKey(1,"pl")]),
    tVerb("tenéis",  [agreeKey(2,"pl")]),
    tVerb("tienen",  [agreeKey(3,"pl")])
  ],
  de: [
    // gehen
    tVerb("gehe",  [agreeKey(1,"sg")]),
    tVerb("gehst", [agreeKey(2,"sg")]),
    tVerb("geht",  [agreeKey(3,"sg"), agreeKey(2,"pl")]),
    tVerb("gehen", [agreeKey(1,"pl"), agreeKey(3,"pl")]),
    // spielen
    tVerb("spiele",  [agreeKey(1,"sg")]),
    tVerb("spielst", [agreeKey(2,"sg")]),
    tVerb("spielt",  [agreeKey(3,"sg"), agreeKey(2,"pl")]),
    tVerb("spielen", [agreeKey(1,"pl"), agreeKey(3,"pl")]),
    // essen
    tVerb("esse",  [agreeKey(1,"sg")]),
    tVerb("isst",  [agreeKey(2,"sg"), agreeKey(3,"sg")]),
    tVerb("esst",  [agreeKey(2,"pl")]),
    tVerb("essen", [agreeKey(1,"pl"), agreeKey(3,"pl")]),
    // lernen
    tVerb("lerne",  [agreeKey(1,"sg")]),
    tVerb("lernst", [agreeKey(2,"sg")]),
    tVerb("lernt",  [agreeKey(3,"sg"), agreeKey(2,"pl")]),
    tVerb("lernen", [agreeKey(1,"pl"), agreeKey(3,"pl")]),
    // haben
    tVerb("habe",  [agreeKey(1,"sg")]),
    tVerb("hast",  [agreeKey(2,"sg")]),
    tVerb("hat",   [agreeKey(3,"sg")]),
    tVerb("habt",  [agreeKey(2,"pl")]),
    tVerb("haben", [agreeKey(1,"pl"), agreeKey(3,"pl")])
  ]
};

const OTHER_TILES = {
  en: [
    t("to","prep"), t("school","noun"),
    t("football","noun"),
    t("an","det"), t("apple","noun"),
    t("Spanish","noun"),
    t("homework","noun")
  ],
  es: [
    t("a","prep"), t("la","det"), t("escuela","noun"),
    t("al","prep"), t("fútbol","noun"),
    t("una","det"), t("manzana","noun"),
    t("español","noun"),
    t("tarea","noun")
  ],
  de: [
    t("zur","prep"), t("schule","noun"),
    t("fußball","noun"),
    t("einen","det"), t("apfel","noun"),
    t("deutsch","noun"),
    t("hausaufgaben","noun")
  ]
};

// ---------- Prompts by language & difficulty ----------
const PROMPTS = {
  en: [
    prompt("I go to school", [["I","go","to","school"]], "easy"),
    prompt("He plays football", [["he","plays","football"]], "easy"),
    prompt("She eats an apple", [["she","eats","an","apple"]], "medium"),
    prompt("We study Spanish", [["we","study","Spanish"]], "easy"),
    prompt("They have homework", [["they","have","homework"]], "medium"),
    // Hard: extra phrase
    prompt("He goes to school", [["he","goes","to","school"]], "hard")
  ],
  es: [
    // Spanish allows with/without pronoun
    prompt("I go to school", [["voy","a","la","escuela"], ["yo","voy","a","la","escuela"]], "easy"),
    prompt("He plays football", [["juega","al","fútbol"], ["él","juega","al","fútbol"]], "easy"),
    prompt("She eats an apple", [["come","una","manzana"], ["ella","come","una","manzana"]], "medium"),
    prompt("We study Spanish", [["estudiamos","español"], ["nosotros","estudiamos","español"]], "easy"),
    prompt("They have homework", [["tienen","tarea"], ["ellos","tienen","tarea"], ["ellas","tienen","tarea"]], "medium"),
    // Hard: longer
    prompt("They go to school", [["van","a","la","escuela"], ["ellos","van","a","la","escuela"], ["ellas","van","a","la","escuela"]], "hard")
  ],
  de: [
    prompt("I go to school", [["ich","gehe","zur","schule"]], "easy"),
    prompt("He plays football", [["er","spielt","fußball"]], "easy"),
    prompt("She eats an apple", [["sie","isst","einen","apfel"]], "medium"),
    prompt("We study German", [["wir","lernen","deutsch"]], "easy"),
    prompt("They have homework", [["sie","haben","hausaufgaben"]], "medium"),
    // Hard: longer
    prompt("We go to school", [["wir","gehen","zur","schule"]], "hard")
  ]
};

// Difficulty mapping: which prompts are allowed
const DIFF_ORDER = { easy: 1, medium: 2, hard: 3 };

// How many distractor tiles to add on top of needed tiles
const DISTRACTORS = {
  easy: 4,
  medium: 8,
  hard: 14
};

// ---------- UI ----------
const els = {
  langSelect: $("langSelect"),
  diffSelect: $("diffSelect"),
  startBtn: $("startBtn"),
  promptText: $("promptText"),
  promptLabel: $("promptLabel"),
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
els.diffSelect.addEventListener("change", () => {
  state.diff = els.diffSelect.value;
  resetGame(true);
});

els.startBtn.addEventListener("click", () => resetGame(true));
els.undoBtn.addEventListener("click", undo);
els.clearBtn.addEventListener("click", clearSentence);
els.shuffleBtn.addEventListener("click", shuffleTiles);
els.checkBtn.addEventListener("click", checkSentence);

// ---------- Game ----------
function resetGame(resetScore) {
  state.sentence = [];
  state.tiles = [];
  state.currentPrompt = null;
  state.tileIdCounter = 1;
  if (resetScore) state.score = 0;

  nextPrompt();
  renderAll();
  setFeedback("Ready. Tap tiles to build the sentence.", "neutral");
}

function eligiblePrompts() {
  const list = PROMPTS[state.lang] || [];
  const max = DIFF_ORDER[state.diff] || 2;
  return list.filter(p => (DIFF_ORDER[p.diff] || 3) <= max);
}

function nextPrompt() {
  const list = eligiblePrompts();
  if (!list.length) return;

  // random prompt each time
  state.currentPrompt = list[Math.floor(Math.random() * list.length)];

  // new round: clear sentence + generate tile pool tuned to difficulty
  state.sentence = [];
  state.tiles = buildTilePoolForPrompt(state.currentPrompt);
  updateRuleHint();
}

function updateRuleHint() {
  const L = LANG[state.lang];
  els.promptLabel.textContent = `${L.name} (${state.diff})`;
  if (state.lang === "es") {
    els.ruleHint.textContent = "Spanish: pronoun optional (e.g., “voy…”). If you use a pronoun, it MUST match the verb.";
  } else if (state.lang === "en") {
    els.ruleHint.textContent = "English: subject is required here. Pronoun must match the verb (he plays / I play).";
  } else {
    els.ruleHint.textContent = "German: subject is required here. Pronoun must match the verb (ich gehe / er geht).";
  }
}

function buildTilePoolForPrompt(p) {
  // 1) collect needed words for at least one acceptable answer
  const needWords = wordsNeededForAnyAccept(p.accept);

  // 2) create tiles for needed words (with correct POS/meta if known)
  const baseTiles = [];
  const needCounts = countWords(needWords);

  for (const [normWord, count] of Object.entries(needCounts)) {
    for (let i = 0; i < count; i++) baseTiles.push(makeTileForNormWord(normWord));
  }

  // 3) add distractors from the global pool for that language
  const distractorCount = DISTRACTORS[state.diff] ?? 8;
  const pool = globalPoolForLang(state.lang);

  // avoid duplicating EXACT same tile text too many times
  const baseNorms = baseTiles.map(ti => norm(ti.text));
  const candidates = pool.filter(ti => !baseNorms.includes(norm(ti.text)));

  const shuffled = shuffle([...candidates]);
  const extras = shuffled.slice(0, Math.min(distractorCount, shuffled.length)).map(cloneTileFreshId);

  // 4) return shuffled combined tiles
  return shuffle([...baseTiles, ...extras]);
}

function wordsNeededForAnyAccept(acceptArrays) {
  // choose shortest accepted sentence so Easy feels easier
  let best = acceptArrays[0] || [];
  for (const arr of acceptArrays) if (arr.length < best.length) best = arr;
  return best;
}

function globalPoolForLang(lang) {
  return [
    ...PRONOUNS[lang],
    ...VERBS[lang],
    ...OTHER_TILES[lang]
  ];
}

function cloneTileFreshId(ti) {
  if (ti.pos === "pronoun") return tPron(ti.text, [...ti.meta.agrees]);
  if (ti.pos === "verb") return tVerb(ti.text, [...ti.meta.agrees]);
  return t(ti.text, ti.pos);
}

function makeTileForNormWord(normWord) {
  const
