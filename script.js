/* Mahlingo Sentence Mahjong
   - Tap tiles to build a sentence in the tray
   - Check sentence to clear those tiles (score)
   - Modes: EN (ESL) / ES (Spanish)
   - Levels: EASY/MED/HARD tweak template + hint behaviour
*/

const POS = {
  SUBJ: "SUBJ",
  VERB: "VERB",
  OBJ: "OBJ",
  NEG: "NEG",
  TIME: "TIME",
  PLACE: "PLACE",
  DET: "DET",
};

const POS_COLORS = {
  SUBJ: "var(--c-subj)",
  VERB: "var(--c-verb)",
  OBJ: "var(--c-obj)",
  NEG: "var(--c-neg)",
  TIME: "var(--c-time)",
  PLACE: "var(--c-place)",
  DET: "var(--c-det)",
};

const el = (id) => document.getElementById(id);

const state = {
  mode: "EN",
  level: "EASY",
  boardTiles: [],
  trayTiles: [],
  sentencesCleared: 0,
  goal: 8,
  startTs: null,
  timer: null,
  lastHintPos: null,
};

function mmss(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function startTimer() {
  stopTimer();
  state.startTs = Date.now();
  state.timer = setInterval(() => {
    const sec = Math.floor((Date.now() - state.startTs) / 1000);
    el("time").textContent = mmss(sec);
  }, 250);
}

function stopTimer() {
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
}

function setMessage(msg, kind = "info") {
  const box = el("message");
  box.textContent = msg;
  box.dataset.kind = kind;
}

function renderLegend() {
  const items = [
    [POS.SUBJ, "Subject"],
    [POS.VERB, "Verb"],
    [POS.OBJ, "Object"],
    [POS.NEG, "Negative"],
    [POS.TIME, "Time"],
    [POS.PLACE, "Place"],
    [POS.DET, "a / the"],
  ];

  const wrap = el("legend");
  wrap.innerHTML = "";
  for (const [pos, label] of items) {
    const div = document.createElement("div");
    div.className = "legend-item";
    const dot = document.createElement("div");
    dot.className = "dot";
    dot.style.background = POS_COLORS[pos] || "#ddd";
    div.appendChild(dot);
    const txt = document.createElement("div");
    txt.textContent = label;
    div.appendChild(txt);
    wrap.appendChild(div);
  }
}

/* ---------- DATASETS ---------- */

function datasetEN() {
  // personGroup: "3S" means he/she/it. "NON3S" means I/you/we/they.
  const subjects = [
    { pos: POS.SUBJ, text: "I", person: "NON3S" },
    { pos: POS.SUBJ, text: "You", person: "NON3S" },
    { pos: POS.SUBJ, text: "We", person: "NON3S" },
    { pos: POS.SUBJ, text: "They", person: "NON3S" },
    { pos: POS.SUBJ, text: "He", person: "3S" },
    { pos: POS.SUBJ, text: "She", person: "3S" },
    { pos: POS.SUBJ, text: "It", person: "3S" },
  ];

  const verbs = [
    { pos: POS.VERB, text: "go", person: "NON3S", lemma: "go" },
    { pos: POS.VERB, text: "goes", person: "3S", lemma: "go" },
    { pos: POS.VERB, text: "play", person: "NON3S", lemma: "play" },
    { pos: POS.VERB, text: "plays", person: "3S", lemma: "play" },
    { pos: POS.VERB, text: "want", person: "NON3S", lemma: "want" },
    { pos: POS.VERB, text: "wants", person: "3S", lemma: "want" },
    { pos: POS.VERB, text: "like", person: "NON3S", lemma: "like" },
    { pos: POS.VERB, text: "likes", person: "3S", lemma: "like" },
    { pos: POS.VERB, text: "have", person: "NON3S", lemma: "have" },
    { pos: POS.VERB, text: "has", person: "3S", lemma: "have" },
  ];

  const det = [
    { pos: POS.DET, text: "a" },
    { pos: POS.DET, text: "the" },
  ];

  const neg = [
    // For negatives we enforce:
    // - "don't" requires NON3S subject; verb must be base (NON3S form)
    // - "doesn't" requires 3S subject; verb must be base (NON3S form)
    { pos: POS.NEG, text: "don't", requiresSubject: "NON3S", requiresVerbBase: true },
    { pos: POS.NEG, text: "doesn't", requiresSubject: "3S", requiresVerbBase: true },
  ];

  const objects = [
    { pos: POS.OBJ, text: "football" },
    { pos: POS.OBJ, text: "pizza" },
    { pos: POS.OBJ, text: "music" },
    { pos: POS.OBJ, text: "the game" },
    { pos: POS.OBJ, text: "homework" },
    { pos: POS.OBJ, text: "a sandwich" },
    { pos: POS.OBJ, text: "my phone" },
  ];

  const time = [
    { pos: POS.TIME, text: "today" },
    { pos: POS.TIME, text: "tomorrow" },
    { pos: POS.TIME, text: "on Friday" },
    { pos: POS.TIME, text: "after school" },
    { pos: POS.TIME, text: "at the weekend" },
  ];

  const place = [
    { pos: POS.PLACE, text: "to school" },
    { pos: POS.PLACE, text: "to town" },
    { pos: POS.PLACE, text: "at home" },
    { pos: POS.PLACE, text: "in the park" },
  ];

  return { subjects, verbs, det, neg, objects, time, place };
}

function datasetES() {
  // Keep it simple + punchy: Spanish word order practice with clear, safe forms
  const subjects = [
    { pos: POS.SUBJ, text: "Yo", person: "NON3S" },
    { pos: POS.SUBJ, text: "Tú", person: "NON3S" },
    { pos: POS.SUBJ, text: "Nosotros", person: "NON3S" },
    { pos: POS.SUBJ, text: "Ellos", person: "NON3S" },
    { pos: POS.SUBJ, text: "Él", person: "3S" },
    { pos: POS.SUBJ, text: "Ella", person: "3S" },
  ];

  // We label verbs as 3S vs NON3S just for basic agreement vibes.
  // (This is not a full conjugation engine; it’s a sentence-builder.)
  const verbs = [
    { pos: POS.VERB, text: "voy", person: "NON3S", lemma: "ir" },
    { pos: POS.VERB, text: "va", person: "3S", lemma: "ir" },
    { pos: POS.VERB, text: "juego", person: "NON3S", lemma: "jugar" },
    { pos: POS.VERB, text: "juega", person: "3S", lemma: "jugar" },
    { pos: POS.VERB, text: "quiero", person: "NON3S", lemma: "querer" },
    { pos: POS.VERB, text: "quiere", person: "3S", lemma: "querer" },
    { pos: POS.VERB, text: "tengo", person: "NON3S", lemma: "tener" },
    { pos: POS.VERB, text: "tiene", person: "3S", lemma: "tener" },
    { pos: POS.VERB, text: "me gusta", person: "NON3S", lemma: "gustar" },
    { pos: POS.VERB, text: "le gusta", person: "3S", lemma: "gustar" },
  ];

  const neg = [
    { pos: POS.NEG, text: "no" },
    { pos: POS.NEG, text: "nunca" },
  ];

  const objects = [
    { pos: POS.OBJ, text: "fútbol" },
    { pos: POS.OBJ, text: "pizza" },
    { pos: POS.OBJ, text: "música" },
    { pos: POS.OBJ, text: "al cole" },
    { pos: POS.OBJ, text: "a casa" },
    { pos: POS.OBJ, text: "un bocadillo" },
    { pos: POS.OBJ, text: "mi móvil" },
  ];

  const time = [
    { pos: POS.TIME, text: "hoy" },
    { pos: POS.TIME, text: "mañana" },
    { pos: POS.TIME, text: "los viernes" },
    { pos: POS.TIME, text: "después de clase" },
    { pos: POS.TIME, text: "el fin de semana" },
  ];

  const place = [
    { pos: POS.PLACE, text: "en casa" },
    { pos: POS.PLACE, text: "al parque" },
    { pos: POS.PLACE, text: "al centro" },
  ];

  return { subjects, verbs, neg, objects, time, place, det: [] };
}

/* ---------- LEVELS & TEMPLATES ---------- */

function getGoalFor(level) {
  if (level === "EASY") return 6;
  if (level === "MED") return 8;
  return 10;
}

function templatesFor(mode, level) {
  // Each template is an ordered list of required slots (POS), with some optional.
  // Easy: shows template + highlights next needed slot
  // Medium: shows template, less help
  // Hard: minimal template shown (still validated)
  if (mode === "EN") {
    // Allow optional [DET] before OBJ, optional TIME/PLACE after
    // Allow optional NEG after subject (enforces base verb)
    const base = [POS.SUBJ, POS.VERB, POS.OBJ];
    const negBase = [POS.SUBJ, POS.NEG, POS.VERB, POS.OBJ];

    if (level === "EASY") {
      return [
        { slots: [POS.SUBJ, POS.VERB, POS.OBJ], optional: [POS.TIME, POS.PLACE] , allowDet: true },
        { slots: [POS.SUBJ, POS.NEG, POS.VERB, POS.OBJ], optional: [POS.TIME, POS.PLACE], allowDet: true },
      ];
    }
    if (level === "MED") {
      return [
        { slots: base, optional: [POS.TIME, POS.PLACE], allowDet: true },
        { slots: negBase, optional: [POS.TIME, POS.PLACE], allowDet: true },
      ];
    }
    return [
      { slots: base, optional: [POS.TIME, POS.PLACE], allowDet: true },
      { slots: negBase, optional: [POS.TIME, POS.PLACE], allowDet: true },
    ];
  }

  // Spanish
  const base = [POS.SUBJ, POS.VERB, POS.OBJ];
  const negBase = [POS.SUBJ, POS.NEG, POS.VERB, POS.OBJ];

  if (level === "EASY") {
    return [
      { slots: base, optional: [POS.TIME, POS.PLACE], allowDet: false },
      { slots: negBase, optional: [POS.TIME, POS.PLACE], allowDet: false },
    ];
  }
  if (level === "MED") {
    return [
      { slots: base, optional: [POS.TIME, POS.PLACE], allowDet: false },
      { slots: negBase, optional: [POS.TIME, POS.PLACE], allowDet: false },
    ];
  }
  return [
    { slots: base, optional: [POS.TIME, POS.PLACE], allowDet: false },
    { slots: negBase, optional: [POS.TIME, POS.PLACE], allowDet: false },
  ];
}

function describeTemplate(mode, level) {
  const showFull = level !== "HARD";
  if (mode === "EN") {
    if (!showFull) return "Build a correct sentence. (Order matters.)";
    return "SUBJECT + (NEG) + VERB + (a/the) + OBJECT + (TIME) + (PLACE)";
  }
  if (!showFull) return "Construye una frase correcta. (El orden importa.)";
  return "SUJETO + (NEG) + VERBO + OBJETO + (TIEMPO) + (LUGAR)";
}

/* ---------- GAME SETUP ---------- */

function makeTile(tile, idx) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}-${idx}`,
    ...tile,
  };
}

function buildTilePool(mode) {
  const ds = mode === "EN" ? datasetEN() : datasetES();

  // Duplicate to fill a nice board size.
  // We want enough variety but also repeats so the board feels “mahjong-y”.
  const pool = [];

  const addMany = (arr, times) => {
    for (let t = 0; t < times; t++) {
      for (const item of arr) pool.push(item);
    }
  };

  // Tuning for board size
  addMany(ds.subjects, 2);
  addMany(ds.verbs, 3);
  addMany(ds.objects, 3);
  addMany(ds.time, 2);
  addMany(ds.place, 2);
  addMany(ds.neg, 2);
  if (ds.det && ds.det.length) addMany(ds.det, 2);

  // Slice/Pad to a stable count for layout
  // 6 cols responsive => aim 54 tiles (9 rows) feels good on phone.
  const target = 54;
  while (pool.length < target) {
    pool.push(ds.objects[Math.floor(Math.random() * ds.objects.length)]);
  }
  const shuffled = shuffle([...pool]).slice(0, target);

  return shuffled.map((t, i) => makeTile(t, i));
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function resetGame() {
  state.mode = el("mode").value;
  state.level = el("level").value;
  state.goal = getGoalFor(state.level);
  state.boardTiles = buildTilePool(state.mode);
  state.trayTiles = [];
  state.sentencesCleared = 0;
  state.lastHintPos = null;

  el("goal").textContent = String(state.goal);
  el("sentences").textContent = "0";
  el("template").textContent = describeTemplate(state.mode, state.level);

  el("boardHelp").textContent =
    state.level === "EASY"
      ? "Tip: use Hint if stuck."
      : state.level === "MED"
      ? "Order matters. Try a NEG sentence too."
      : "Hard mode: fewer hints.";

  setMessage(state.mode === "EN"
    ? "Tap tiles to build a sentence, then press Check Sentence."
    : "Toca fichas para construir una frase y luego pulsa Check Sentence.");

  renderBoard();
  renderTray();
  clearHints();
  startTimer();
}

/* ---------- RENDERING ---------- */

function tileLabel(tile) {
  // Tiny sublabel only when useful (agreement / neg rule)
  if (tile.pos === POS.VERB && tile.person) {
    return tile.person === "3S" ? "he/she/it" : "I/you/we/they";
  }
  if (tile.pos === POS.SUBJ && tile.person) {
    return tile.person === "3S" ? "3rd singular" : "";
  }
  if (tile.pos === POS.NEG && tile.requiresSubject) {
    return tile.text === "doesn't" ? "he/she/it" : "I/you/we/they";
  }
  return "";
}

function renderBoard() {
  const board = el("board");
  board.innerHTML = "";

  for (const tile of state.boardTiles) {
    const btn = document.createElement("button");
    btn.className = `tile pos-${tile.pos}`;
    btn.type = "button";
    btn.dataset.id = tile.id;

    const main = document.createElement("div");
    main.textContent = tile.text;

    const sub = tileLabel(tile);
    if (sub) {
      const sm = document.createElement("small");
      sm.textContent = sub;
      btn.appendChild(main);
      btn.appendChild(sm);
    } else {
      btn.appendChild(main);
    }

    btn.addEventListener("click", () => pickTile(tile.id));
    board.appendChild(btn);
  }
}

function renderTray() {
  const tray = el("tray");
  tray.innerHTML = "";

  for (const tile of state.trayTiles) {
    const btn = document.createElement("button");
    btn.className = `tile pos-${tile.pos}`;
    btn.type = "button";
    btn.dataset.id = tile.id;

    const main = document.createElement("div");
    main.textContent = tile.text;
    btn.appendChild(main);

    btn.title = "Tap to remove from tray";
    btn.addEventListener("click", () => removeFromTray(tile.id));

    tray.appendChild(btn);
  }
}

/* ---------- INTERACTION ---------- */

function pickTile(id) {
  clearHints();

  const idx = state.boardTiles.findIndex(t => t.id === id);
  if (idx === -1) return;

  // Optional: Hard mode tray limit
  const trayLimit = state.level === "HARD" ? 7 : 10;
  if (state.trayTiles.length >= trayLimit) {
    setMessage(state.mode === "EN"
      ? `Tray full (max ${trayLimit}). Check or undo.`
      : `Bandeja llena (máx ${trayLimit}). Comprueba o deshaz.`);
    return;
  }

  const [tile] = state.boardTiles.splice(idx, 1);
  state.trayTiles.push(tile);

  renderBoard();
  renderTray();

  if (state.level === "EASY") {
    // gentle nudge: show next expected POS
    const next = nextNeededPos();
    if (next) {
      state.lastHintPos = next;
      highlightPos(next);
    }
  }
}

function removeFromTray(id) {
  clearHints();
  const idx = state.trayTiles.findIndex(t => t.id === id);
  if (idx === -1) return;
  const [tile] = state.trayTiles.splice(idx, 1);
  state.boardTiles.unshift(tile); // put back near top
  renderBoard();
  renderTray();
}

function undo() {
  clearHints();
  const tile = state.trayTiles.pop();
  if (!tile) return;
  state.boardTiles.unshift(tile);
  renderBoard();
  renderTray();
}

function clearTray() {
  clearHints();
  while (state.trayTiles.length) {
    state.boardTiles.unshift(state.trayTiles.pop());
  }
  renderBoard();
  renderTray();
}

function clearHints() {
  const nodes = document.querySelectorAll(".tile.hint");
  nodes.forEach(n => n.classList.remove("hint"));
}

function highlightPos(pos) {
  const nodes = document.querySelectorAll(`#board .tile`);
  nodes.forEach(n => {
    const id = n.dataset.id;
    const tile = state.boardTiles.find(t => t.id === id);
    if (tile && tile.pos === pos) n.classList.add("hint");
  });
}

function hint() {
  clearHints();
  const next = nextNeededPos();
  if (!next) {
    setMessage(state.mode === "EN"
      ? "No hint needed — try checking the sentence."
      : "No hace falta pista — prueba a comprobar la frase.");
    return;
  }
  state.lastHintPos = next;
  highlightPos(next);
  setMessage(state.mode === "EN"
    ? `Hint: look for a ${next} tile.`
    : `Pista: busca una ficha ${next}.`);
}

/* ---------- VALIDATION ---------- */

function nextNeededPos() {
  // Determine what POS is most likely next based on templates and tray
  const trayPos = state.trayTiles.map(t => t.pos);
  const tpls = templatesFor(state.mode, state.level);

  // Find a template that still can match, and return its next required POS
  for (const tpl of tpls) {
    const next = nextSlotForTemplate(trayPos, tpl);
    if (next) return next;
    if (next === null) continue; // mismatch, try next template
    // next === undefined means it's complete or no required left
  }

  // fallback: if empty tray, suggest SUBJ
  if (trayPos.length === 0) return POS.SUBJ;
  return null;
}

function nextSlotForTemplate(trayPos, tpl) {
  // Template matching with optional DET and optional [TIME/PLACE] at end.
  // Returns:
  // - POS string = next required
  // - null = cannot match this template
  // - undefined = template could be complete already
  const required = [...tpl.slots];
  const optional = new Set(tpl.optional || []);
  const allowDet = !!tpl.allowDet;

  // We accept optional DET only if it appears directly before OBJ
  // We'll validate this properly in full check; for "next slot" it's a soft guide.
  let rIndex = 0;

  for (let i = 0; i < trayPos.length; i++) {
    const p = trayPos[i];

    // allow optional trailing TIME/PLACE anytime after required is complete
    if (rIndex >= required.length && optional.has(p)) continue;

    // allow DET as a special case in EN
    if (allowDet && p === POS.DET) {
      // DET must come before an OBJ later; we allow it if next required is OBJ
      if (required[rIndex] === POS.OBJ) {
        // Keep rIndex same (DET doesn't consume required slot)
        continue;
      }
      return null;
    }

    if (p === required[rIndex]) {
      rIndex++;
      continue;
    }

    // optional NEG must match required NEG if present
    return null;
  }

  if (rIndex < required.length) return required[rIndex];
  return undefined;
}

function checkSentence() {
  clearHints();

  if (state.trayTiles.length < 3) {
    setMessage(state.mode === "EN" ? "Too short. Add more tiles." : "Demasiado corta. Añade más fichas.");
    return;
  }

  const result = validateTray(state.trayTiles, state.mode, state.level);
  if (!result.ok) {
    setMessage(result.msg);
    if (state.level === "EASY") {
      const next = nextNeededPos();
      if (next) highlightPos(next);
    }
    return;
  }

  // Sentence accepted -> clear tray (tiles already removed from board)
  const sentence = state.trayTiles.map(t => t.text).join(" ");
  state.trayTiles = [];
  state.sentencesCleared += 1;

  el("sentences").textContent = String(state.sentencesCleared);
  renderTray();

  setMessage((state.mode === "EN" ? "✅ Cleared: " : "✅ Borrada: ") + sentence);

  if (state.sentencesCleared >= state.goal) {
    stopTimer();
    const sec = Math.floor((Date.now() - state.startTs) / 1000);
    setMessage(
      state.mode === "EN"
        ? `🏆 Level complete! Time: ${mmss(sec)} — New Game for another run.`
        : `🏆 ¡Nivel completado! Tiempo: ${mmss(sec)} — New Game para repetir.`
    );
  }
}

function validateTray(trayTiles, mode, level) {
  const trayPos = trayTiles.map(t => t.pos);

  const tpls = templatesFor(mode, level);
  for (const tpl of tpls) {
    const v = validateAgainstTemplate(trayTiles, tpl, mode);
    if (v.ok) return v;
  }

  // if none matched
  return {
    ok: false,
    msg: mode === "EN"
      ? "❌ Not a valid sentence for the template. Try: SUBJECT + (NEG) + VERB + (a/the) + OBJECT (+ TIME/PLACE)."
      : "❌ No encaja con la plantilla. Prueba: SUJETO + (NEG) + VERBO + OBJETO (+ TIEMPO/LUGAR).",
  };
}

function validateAgainstTemplate(trayTiles, tpl, mode) {
  const required = [...tpl.slots];
  const optional = new Set(tpl.optional || []);
  const allowDet = !!tpl.allowDet;

  // 1) Basic order checking (with optional DET and optional end pieces)
  let rIndex = 0;
  let sawObj = false;

  for (let i = 0; i < trayTiles.length; i++) {
    const tile = trayTiles[i];
    const p = tile.pos;

    if (rIndex >= required.length) {
      if (!optional.has(p)) return { ok: false };
      continue;
    }

    if (allowDet && p === POS.DET) {
      // DET only allowed directly before OBJ slot is being satisfied
      if (required[rIndex] !== POS.OBJ) return { ok: false };
      // DET doesn't consume required slot; we'll require an OBJ later
      continue;
    }

    if (p !== required[rIndex]) return { ok: false };

    if (p === POS.OBJ) sawObj = true;
    rIndex++;
  }

  if (rIndex < required.length) return { ok: false };

  // If DET was used, ensure we actually saw OBJ somewhere (it should be required anyway)
  if (allowDet && trayTiles.some(t => t.pos === POS.DET) && !sawObj) return { ok: false };

  // 2) Agreement rules
  const subj = trayTiles.find(t => t.pos === POS.SUBJ);
  const verb = trayTiles.find(t => t.pos === POS.VERB);
  const neg = trayTiles.find(t => t.pos === POS.NEG);

  if (subj && verb && subj.person && verb.person) {
    // If a NEG in EN requires base verb, enforce that too
    if (mode === "EN" && neg && neg.requiresVerbBase) {
      // base verb = NON3S verb form
      if (verb.person !== "NON3S") {
        return { ok: false, msg: "❌ With don't/doesn't, use the base verb (go, play, like), not goes/plays/likes." };
      }
      if (neg.requiresSubject && subj.person !== neg.requiresSubject) {
        return { ok: false, msg: "❌ Match the negative: 'doesn't' for he/she/it; 'don't' for I/you/we/they." };
      }
    } else {
      // No negative: subject and verb should match person group
      if (subj.person !== verb.person) {
        return { ok: false, msg: mode === "EN"
          ? "❌ Subject–verb mismatch (he/she/it needs goes/plays/likes/has)."
          : "❌ No coincide sujeto y verbo (prueba otra forma: va/juega/quiere/tiene/le gusta)." };
      }
    }
  }

  // Spanish NEG words: just ensure NEG sits in correct slot (already checked)
  // 3) Keep tray reasonable in hard mode (optional)
  if (mode === "EN" && allowDet === false && trayTiles.some(t => t.pos === POS.DET)) return { ok: false };

  return { ok: true };
}

/* ---------- INIT ---------- */

function wireUI() {
  el("newGameBtn").addEventListener("click", resetGame);
  el("hintBtn").addEventListener("click", hint);
  el("undoBtn").addEventListener("click", undo);
  el("clearTrayBtn").addEventListener("click", clearTray);
  el("checkBtn").addEventListener("click", checkSentence);

  el("mode").addEventListener("change", resetGame);
  el("level").addEventListener("change", resetGame);
}

(function init() {
  renderLegend();
  wireUI();
  resetGame();
})();
