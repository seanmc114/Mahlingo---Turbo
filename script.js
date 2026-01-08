/* Synge Street Sentence Mahjong
  - EN / ES / DE / FR
  - Levels: easy/medium/hard now mean lexical level + board size
  - Bigger vocab pools + adjectives (det + adj* + noun)
  - Free sentence clearing (no prompts)
  - Mahjong playability + traditional-ish layouts + deadlock detection
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
  deadlockBadge: $("deadlockBadge"),
};

const state = {
  lang: "es",
  diff: "medium",
  score: 0,
  tileId: 1,
  sentence: [],
  boardTiles: [],
  slots: [],
  layoutName: "turtle",
};

const ak = (p, n) => `${p}${n}`; // 1sg, 3pl etc

const LANG = {
  en: { name: "English", pronounRequired: true,  normalize: s => s.trim().toLowerCase() },
  es: { name: "Spanish", pronounRequired: false, normalize: s => s.trim().toLowerCase().replaceAll("ñ","n") },
  de: { name: "German",  pronounRequired: true,  normalize: s => s.trim().toLowerCase() },
  fr: { name: "French",  pronounRequired: true,  normalize: s => s.trim().toLowerCase().replaceAll("’","'") },
};
const norm = (s) => LANG[state.lang].normalize(s);

function t(text, pos, meta=null){ return { id:`t${state.tileId++}`, text, pos, meta, x:0, y:0, z:0 }; }
function tPron(text, agrees){ return t(text, "pronoun", { agrees }); }
function tVerb(text, agrees){ return t(text, "verb", { agrees }); }
function tWord(text, pos){ return t(text, pos, null); }

function cloneFresh(base){ return { ...base, id:`t${state.tileId++}` }; }
function shuffleInPlace(arr){
  for (let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
}
function px(cssVar){
  const v = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  return parseFloat(v) || 70;
}
function setFeedback(text, kind){
  els.feedback.textContent = text;
  els.feedback.classList.remove("ok","bad");
  if (kind==="ok") els.feedback.classList.add("ok");
  if (kind==="bad") els.feedback.classList.add("bad");
}
function setDeadlockUI(isDeadlock){
  els.deadlockBadge.textContent = isDeadlock ? "Deadlock: no moves" : "Moves available";
  els.deadlockBadge.classList.toggle("bad", isDeadlock);
  els.deadlockBadge.classList.toggle("ok", !isDeadlock);
  els.shuffleBtn.classList.toggle("pulse", isDeadlock);
}
function intersects(a, b){
  const setB = new Set(b);
  return a.some(x => setB.has(x));
}
function pickMany(arr, n){
  const copy = [...arr];
  shuffleInPlace(copy);
  return copy.slice(0, Math.min(n, copy.length));
}

// -------------------- PRONOUNS (fixed set) --------------------
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
  ],
  fr: [
    tPron("je",[ak(1,"sg")]),
    tPron("tu",[ak(2,"sg")]),
    tPron("il",[ak(3,"sg")]),
    tPron("elle",[ak(3,"sg")]),
    tPron("nous",[ak(1,"pl")]),
    tPron("vous",[ak(2,"pl")]),
    tPron("ils",[ak(3,"pl")]),
    tPron("elles",[ak(3,"pl")]),
  ]
};

// -------------------- VERB PARADIGMS (level-based) --------------------
// Each entry is a lemma-group with forms by agreement tag.
// We will sample a subset of verb-forms per board so it stays playable but varied.

const VERB_PARADIGMS = {
  en: {
    easy: [
      { forms: { "1sg":"go","2sg":"go","3sg":"goes","1pl":"go","2pl":"go","3pl":"go" } },
      { forms: { "1sg":"have","2sg":"have","3sg":"has","1pl":"have","2pl":"have","3pl":"have" } },
      { forms: { "1sg":"like","2sg":"like","3sg":"likes","1pl":"like","2pl":"like","3pl":"like" } },
      { forms: { "1sg":"play","2sg":"play","3sg":"plays","1pl":"play","2pl":"play","3pl":"play" } },
      { forms: { "1sg":"study","2sg":"study","3sg":"studies","1pl":"study","2pl":"study","3pl":"study" } },
      { forms: { "1sg":"read","2sg":"read","3sg":"reads","1pl":"read","2pl":"read","3pl":"read" } },
    ],
    medium: [
      { forms: { "1sg":"watch","2sg":"watch","3sg":"watches","1pl":"watch","2pl":"watch","3pl":"watch" } },
      { forms: { "1sg":"listen","2sg":"listen","3sg":"listens","1pl":"listen","2pl":"listen","3pl":"listen" } },
      { forms: { "1sg":"write","2sg":"write","3sg":"writes","1pl":"write","2pl":"write","3pl":"write" } },
      { forms: { "1sg":"work","2sg":"work","3sg":"works","1pl":"work","2pl":"work","3pl":"work" } },
      { forms: { "1sg":"help","2sg":"help","3sg":"helps","1pl":"help","2pl":"help","3pl":"help" } },
      { forms: { "1sg":"need","2sg":"need","3sg":"needs","1pl":"need","2pl":"need","3pl":"need" } },
      { forms: { "1sg":"want","2sg":"want","3sg":"wants","1pl":"want","2pl":"want","3pl":"want" } },
    ],
    hard: [
      { forms: { "1sg":"choose","2sg":"choose","3sg":"chooses","1pl":"choose","2pl":"choose","3pl":"choose" } },
      { forms: { "1sg":"prefer","2sg":"prefer","3sg":"prefers","1pl":"prefer","2pl":"prefer","3pl":"prefer" } },
      { forms: { "1sg":"use","2sg":"use","3sg":"uses","1pl":"use","2pl":"use","3pl":"use" } },
      { forms: { "1sg":"make","2sg":"make","3sg":"makes","1pl":"make","2pl":"make","3pl":"make" } },
      { forms: { "1sg":"do","2sg":"do","3sg":"does","1pl":"do","2pl":"do","3pl":"do" } },
      { forms: { "1sg":"take","2sg":"take","3sg":"takes","1pl":"take","2pl":"take","3pl":"take" } },
      { forms: { "1sg":"give","2sg":"give","3sg":"gives","1pl":"give","2pl":"give","3pl":"give" } },
    ],
  },

  es: {
    easy: [
      { forms: { "1sg":"voy","2sg":"vas","3sg":"va","1pl":"vamos","2pl":"vais","3pl":"van" } },               // ir
      { forms: { "1sg":"tengo","2sg":"tienes","3sg":"tiene","1pl":"tenemos","2pl":"tenéis","3pl":"tienen" } }, // tener
      { forms: { "1sg":"estudio","2sg":"estudias","3sg":"estudia","1pl":"estudiamos","2pl":"estudiáis","3pl":"estudian" } },
      { forms: { "1sg":"leo","2sg":"lees","3sg":"lee","1pl":"leemos","2pl":"leéis","3pl":"leen" } },
      { forms: { "1sg":"hablo","2sg":"hablas","3sg":"habla","1pl":"hablamos","2pl":"habláis","3pl":"hablan" } },
    ],
    medium: [
      { forms: { "1sg":"juego","2sg":"juegas","3sg":"juega","1pl":"jugamos","2pl":"jugáis","3pl":"juegan" } },
      { forms: { "1sg":"como","2sg":"comes","3sg":"come","1pl":"comemos","2pl":"coméis","3pl":"comen" } },
      { forms: { "1sg":"escribo","2sg":"escribes","3sg":"escribe","1pl":"escribimos","2pl":"escribís","3pl":"escriben" } },
      { forms: { "1sg":"escucho","2sg":"escuchas","3sg":"escucha","1pl":"escuchamos","2pl":"escucháis","3pl":"escuchan" } },
      { forms: { "1sg":"trabajo","2sg":"trabajas","3sg":"trabaja","1pl":"trabajamos","2pl":"trabajáis","3pl":"trabajan" } },
    ],
    hard: [
      { forms: { "1sg":"necesito","2sg":"necesitas","3sg":"necesita","1pl":"necesitamos","2pl":"necesitáis","3pl":"necesitan" } },
      { forms: { "1sg":"quiero","2sg":"quieres","3sg":"quiere","1pl":"queremos","2pl":"queréis","3pl":"quieren" } },
      { forms: { "1sg":"ayudo","2sg":"ayudas","3sg":"ayuda","1pl":"ayudamos","2pl":"ayudáis","3pl":"ayudan" } },
      { forms: { "1sg":"uso","2sg":"usas","3sg":"usa","1pl":"usamos","2pl":"usáis","3pl":"usan" } },
      { forms: { "1sg":"hago","2sg":"haces","3sg":"hace","1pl":"hacemos","2pl":"hacéis","3pl":"hacen" } },
    ],
  },

  de: {
    easy: [
      { forms: { "1sg":"gehe","2sg":"gehst","3sg":"geht","1pl":"gehen","2pl":"geht","3pl":"gehen" } },
      { forms: { "1sg":"habe","2sg":"hast","3sg":"hat","1pl":"haben","2pl":"habt","3pl":"haben" } },
      { forms: { "1sg":"lerne","2sg":"lernst","3sg":"lernt","1pl":"lernen","2pl":"lernt","3pl":"lernen" } },
      { forms: { "1sg":"spiele","2sg":"spielst","3sg":"spielt","1pl":"spielen","2pl":"spielt","3pl":"spielen" } },
    ],
    medium: [
      { forms: { "1sg":"lese","2sg":"liest","3sg":"liest","1pl":"lesen","2pl":"lest","3pl":"lesen" } }, // lesen (simplified du/er both "liest")
      { forms: { "1sg":"schreibe","2sg":"schreibst","3sg":"schreibt","1pl":"schreiben","2pl":"schreibt","3pl":"schreiben" } },
      { forms: { "1sg":"höre","2sg":"hörst","3sg":"hört","1pl":"hören","2pl":"hört","3pl":"hören" } },
      { forms: { "1sg":"arbeite","2sg":"arbeitest","3sg":"arbeitet","1pl":"arbeiten","2pl":"arbeitet","3pl":"arbeiten" } },
    ],
    hard: [
      { forms: { "1sg":"brauche","2sg":"brauchst","3sg":"braucht","1pl":"brauchen","2pl":"braucht","3pl":"brauchen" } },
      { forms: { "1sg":"möchte","2sg":"möchtest","3sg":"möchte","1pl":"möchten","2pl":"möchtet","3pl":"möchten" } }, // modal-ish, good for learners
      { forms: { "1sg":"helfe","2sg":"hilfst","3sg":"hilft","1pl":"helfen","2pl":"helft","3pl":"helfen" } },
      { forms: { "1sg":"mache","2sg":"machst","3sg":"macht","1pl":"machen","2pl":"macht","3pl":"machen" } },
    ],
  },

  fr: {
    easy: [
      { forms: { "1sg":"vais","2sg":"vas","3sg":"va","1pl":"allons","2pl":"allez","3pl":"vont" } },   // aller
      { forms: { "1sg":"ai","2sg":"as","3sg":"a","1pl":"avons","2pl":"avez","3pl":"ont" } },          // avoir
      { forms: { "1sg":"étudie","2sg":"étudies","3sg":"étudie","1pl":"étudions","2pl":"étudiez","3pl":"étudient" } },
      { forms: { "1sg":"parle","2sg":"parles","3sg":"parle","1pl":"parlons","2pl":"parlez","3pl":"parlent" } },
    ],
    medium: [
      { forms: { "1sg":"joue","2sg":"joues","3sg":"joue","1pl":"jouons","2pl":"jouez","3pl":"jouent" } },
      { forms: { "1sg":"mange","2sg":"manges","3sg":"mange","1pl":"mangeons","2pl":"mangez","3pl":"mangent" } },
      { forms: { "1sg":"lis","2sg":"lis","3sg":"lit","1pl":"lisons","2pl":"lisez","3pl":"lisent" } },
      { forms: { "1sg":"écris","2sg":"écris","3sg":"écrit","1pl":"écrivons","2pl":"écrivez","3pl":"écrivent" } },
    ],
    hard: [
      { forms: { "1sg":"aide","2sg":"aides","3sg":"aide","1pl":"aidons","2pl":"aidez","3pl":"aident" } },
      { forms: { "1sg":"travaille","2sg":"travailles","3sg":"travaille","1pl":"travaillons","2pl":"travaillez","3pl":"travaillent" } },
      { forms: { "1sg":"utilise","2sg":"utilises","3sg":"utilise","1pl":"utilisons","2pl":"utilisez","3pl":"utilisent" } },
      { forms: { "1sg":"choisis","2sg":"choisis","3sg":"choisit","1pl":"choisissons","2pl":"choisissez","3pl":"choisissent" } },
    ],
  },
};

// -------------------- OTHER WORDS BY LEVEL --------------------
const WORDS = {
  en: {
    easy: {
      det: ["the","a","an","my","your"],
      prep:["to","in","at","with","for"],
      noun:["school","home","class","book","music","football","lunch","homework","bus","train","teacher","student"],
      adj: ["good","new","big","small","happy","tired"],
    },
    medium: {
      det: ["the","a","an","my","your","our","this","that","some"],
      prep:["to","in","at","with","for","from","after","before","without"],
      noun:["project","exam","lesson","library","phone","computer","team","game","practice","dinner","weekend","problem","answer","language","French","German","Spanish"],
      adj:["interesting","difficult","easy","important","funny","serious","quick","slow"],
    },
    hard: {
      det: ["the","a","an","my","your","our","this","that","some","every"],
      prep:["to","in","at","with","for","from","after","before","without","about","during"],
      noun:["future","plan","choice","opinion","result","challenge","strategy","mistake","improvement","goal","confidence","success","effort"],
      adj:["excellent","terrible","creative","responsible","ambitious","complex","confusing","brilliant"],
    },
  },

  es: {
    easy: {
      det:["el","la","un","una","mi","tu"],
      prep:["a","en","con","para","de"],
      noun:["escuela","casa","clase","libro","música","fútbol","tarea","autobús","tren","profe","alumno"],
      adj:["bueno","nuevo","grande","pequeño","feliz","cansado"],
    },
    medium: {
      det:["el","la","los","las","un","una","mi","tu","nuestro","este","esa"],
      prep:["a","en","con","para","de","desde","antes","después","sin","sobre"],
      noun:["examen","lección","biblioteca","móvil","ordenador","equipo","partido","práctica","cena","fin de semana","problema","respuesta","idioma","francés","alemán","español"],
      adj:["interesante","difícil","fácil","importante","rápido","lento","divertido","serio"],
    },
    hard: {
      det:["el","la","los","las","un","una","mi","tu","nuestro","este","esa","cada"],
      prep:["a","en","con","para","de","desde","antes","después","sin","sobre","durante"],
      noun:["futuro","plan","elección","opinión","resultado","reto","estrategia","error","mejora","meta","confianza","éxito","esfuerzo"],
      adj:["excelente","horrible","creativo","responsable","ambicioso","complejo","confuso","brillante"],
    },
  },

  de: {
    easy: {
      det:["der","die","das","ein","eine","mein","dein"],
      prep:["zu","in","mit","für","von"],
      noun:["schule","haus","klasse","buch","musik","fußball","hausaufgaben","bus","zug","lehrer","schüler"],
      adj:["gut","neu","groß","klein","froh","müde"],
    },
    medium: {
      det:["der","die","das","ein","eine","mein","dein","unser","dieser","diese"],
      prep:["zu","in","mit","für","von","aus","nach","vor","ohne","über"],
      noun:["prüfung","stunde","bibliothek","handy","computer","team","spiel","übung","abendessen","wochenende","problem","antwort","sprache","französisch","deutsch","spanisch"],
      adj:["interessant","schwierig","einfach","wichtig","schnell","langsam","lustig","ernst"],
    },
    hard: {
      det:["der","die","das","ein","eine","mein","dein","unser","dieser","diese","jeder"],
      prep:["zu","in","mit","für","von","aus","nach","vor","ohne","über","während"],
      noun:["zukunft","plan","wahl","meinung","ergebnis","herausforderung","strategie","fehler","verbesserung","ziel","vertrauen","erfolg","aufwand"],
      adj:["ausgezeichnet","schrecklich","kreativ","verantwortlich","ehrgeizig","komplex","verwirrend","brillant"],
    },
  },

  fr: {
    easy: {
      det:["le","la","un","une","mon","ton"],
      prep:["à","dans","avec","pour","de"],
      noun:["l'école","maison","classe","livre","musique","football","devoirs","bus","train","prof","élève"],
      adj:["bon","nouveau","grand","petit","content","fatigué"],
    },
    medium: {
      det:["le","la","les","un","une","mon","ton","notre","ce","cette","des"],
      prep:["à","dans","avec","pour","de","depuis","avant","après","sans","sur"],
      noun:["examen","leçon","bibliothèque","téléphone","ordinateur","équipe","match","pratique","dîner","week-end","problème","réponse","langue","français","allemand","espagnol"],
      adj:["intéressant","difficile","facile","important","rapide","lent","drôle","sérieux"],
    },
    hard: {
      det:["le","la","les","un","une","mon","ton","notre","ce","cette","des","chaque"],
      prep:["à","dans","avec","pour","de","depuis","avant","après","sans","sur","pendant"],
      noun:["avenir","plan","choix","opinion","résultat","défi","stratégie","erreur","progrès","objectif","confiance","succès","effort"],
      adj:["excellent","horrible","créatif","responsable","ambitieux","complexe","confus","brillant"],
    },
  },
};

// -------------------- BUILD POOLS FOR A BOARD --------------------
function buildVerbTiles(lang, level, targetCount){
  // sample paradigms across: always include "easy" set, plus level set if higher
  const base = VERB_PARADIGMS[lang].easy;
  const mid  = VERB_PARADIGMS[lang].medium;
  const hard = VERB_PARADIGMS[lang].hard;

  let paradigms = [];
  if (level === "easy") paradigms = [...base];
  if (level === "medium") paradigms = [...base, ...mid];
  if (level === "hard") paradigms = [...base, ...mid, ...hard];

  // choose a subset of paradigms so boards stay varied but not flooded
  const pickParadigms = pickMany(paradigms, level === "easy" ? 6 : level === "medium" ? 9 : 12);

  // pick random person forms from those paradigms
  const agreements = ["1sg","2sg","3sg","1pl","2pl","3pl"];
  const out = [];

  while (out.length < targetCount){
    const par = pickParadigms[Math.floor(Math.random()*pickParadigms.length)];
    const a = agreements[Math.floor(Math.random()*agreements.length)];
    const form = par.forms[a];
    if (!form) continue;
    out.push(tVerb(form, [a]));
  }
  return out;
}

function buildWordTiles(lang, level, targets){
  const pack = WORDS[lang][level];
  const out = [];
  for (let i=0;i<targets.det;i++) out.push(tWord(pack.det[Math.floor(Math.random()*pack.det.length)], "det"));
  for (let i=0;i<targets.prep;i++) out.push(tWord(pack.prep[Math.floor(Math.random()*pack.prep.length)], "prep"));
  for (let i=0;i<targets.noun;i++) out.push(tWord(pack.noun[Math.floor(Math.random()*pack.noun.length)], "noun"));
  for (let i=0;i<targets.adj;i++) out.push(tWord(pack.adj[Math.floor(Math.random()*pack.adj.length)], "adj"));
  return out;
}

// -------------------- LAYOUTS --------------------
const LAYOUTS = ["turtle","pyramid","bridge"];

function chooseLayoutName(){
  const r = Math.random();
  if (r < 0.55) return "turtle";
  if (r < 0.80) return "bridge";
  return "pyramid";
}

function rectSlots(x0,y0,w,h,z, holesFn=null){
  const out=[];
  for (let y=0;y<h;y++){
    for (let x=0;x<w;x++){
      const gx=x0+x, gy=y0+y;
      if (holesFn && holesFn(gx,gy,z)) continue;
      out.push({x:gx,y:gy,z});
    }
  }
  return out;
}

function layoutTurtle(level){
  const cfg = level==="easy" ? {w:10,h:6,layers:2}
            : level==="hard" ? {w:12,h:7,layers:4}
            : {w:11,h:7,layers:3};

  const slots=[];
  slots.push(...rectSlots(0,1,cfg.w,cfg.h,0,(x,y)=>(
    (y===3 && (x===Math.floor(cfg.w/2) || x===Math.floor(cfg.w/2)-1))
  )));
  slots.push(...rectSlots(-1,2,1,3,0));
  slots.push(...rectSlots(cfg.w,2,1,3,0));

  if (cfg.layers>=2) slots.push(...rectSlots(2,2,cfg.w-4,cfg.h-2,1,(x,y)=>((x+y)%3===0)));
  if (cfg.layers>=3) slots.push(...rectSlots(3,3,cfg.w-6,cfg.h-4,2,(x,y)=>((x+y)%2===1)));
  if (cfg.layers>=4) slots.push(...rectSlots(Math.floor(cfg.w/2)-1,3,2,2,3));
  return slots;
}

function layoutPyramid(level){
  const cfg = level==="easy" ? {w:9,h:5,layers:3}
            : level==="hard" ? {w:11,h:6,layers:4}
            : {w:10,h:6,layers:4};

  const slots=[];
  for (let z=0; z<cfg.layers; z++){
    const w = cfg.w - z*2;
    const h = cfg.h - z*2;
    const x0 = z;
    const y0 = z;
    if (w<=2 || h<=2) break;
    slots.push(...rectSlots(x0,y0,w,h,z,(x,y)=>(
      z>0 && (x+y+z)%4===0
    )));
  }
  return slots;
}

function layoutBridge(level){
  const cfg = level==="easy" ? {w:10,h:6,layers:2}
            : level==="hard" ? {w:12,h:7,layers:3}
            : {w:11,h:7,layers:3};

  const slots=[];
  slots.push(...rectSlots(0,2,Math.floor(cfg.w/2)-1,3,0));
  slots.push(...rectSlots(Math.floor(cfg.w/2)+1,2,Math.floor(cfg.w/2)-1,3,0));
  slots.push(...rectSlots(1,1,2,1,0));
  slots.push(...rectSlots(cfg.w-3,1,2,1,0));
  slots.push(...rectSlots(1,5,2,1,0));
  slots.push(...rectSlots(cfg.w-3,5,2,1,0));

  if (cfg.layers>=2){
    slots.push(...rectSlots(2,3,cfg.w-4,1,1));
    slots.push(...rectSlots(3,2,cfg.w-6,1,1));
    slots.push(...rectSlots(3,4,cfg.w-6,1,1));
  }
  if (cfg.layers>=3){
    slots.push(...rectSlots(Math.floor(cfg.w/2)-1,3,2,1,2));
  }
  return slots;
}

function makeSlotsFor(level, name){
  if (name === "pyramid") return layoutPyramid(level);
  if (name === "bridge")  return layoutBridge(level);
  return layoutTurtle(level);
}

// -------------------- MAHJONG PLAYABILITY --------------------
function isPlayableIn(tiles, tile){
  const hasAbove = tiles.some(t => t.x===tile.x && t.y===tile.y && t.z>tile.z);
  if (hasAbove) return false;
  const leftBlocked  = tiles.some(t => t.z===tile.z && t.y===tile.y && t.x===tile.x-1);
  const rightBlocked = tiles.some(t => t.z===tile.z && t.y===tile.y && t.x===tile.x+1);
  return !(leftBlocked && rightBlocked);
}
function playableTiles(tiles){
  return tiles.filter(t => isPlayableIn(tiles,t));
}

// -------------------- UI HINTS --------------------
function updateHints(){
  if (state.lang === "es"){
    els.ruleHint.textContent = "Spanish: pronoun optional (voy = I go). If you use a pronoun, it MUST match the verb.";
  } else if (state.lang === "en"){
    els.ruleHint.textContent = "English: pronoun required. (I go / he goes). Build NP/PP after the verb.";
  } else if (state.lang === "de"){
    els.ruleHint.textContent = "German: pronoun required. Build det+adj+noun or prep+det+adj+noun after the verb.";
  } else {
    els.ruleHint.textContent = "French: pronoun required. Build det+adj+noun or prep+det+adj+noun after the verb.";
  }
}

// -------------------- BOARD --------------------
function freshBoard(){
  state.score = 0;
  state.tileId = 1;
  state.sentence = [];

  state.layoutName = chooseLayoutName();
  let slots = makeSlotsFor(state.diff, state.layoutName);

  // board size per level
  const maxTiles = state.diff==="easy" ? 48 : state.diff==="hard" ? 78 : 62;
  shuffleInPlace(slots);
  state.slots = slots.slice(0, Math.min(maxTiles, slots.length));

  const N = state.slots.length;

  // counts tuned for playability:
  // - enough verbs to keep going
  // - enough nouns to avoid “no objects”
  // - adjectives give variety without breaking grammar
  const pronTarget = Math.max(7, Math.floor(N * 0.18));
  const verbTarget = Math.max(14, Math.floor(N * 0.30));

  const nounTarget = Math.max(14, Math.floor(N * 0.26));
  const detTarget  = Math.max(10, Math.floor(N * 0.18));
  const prepTarget = Math.max(8,  Math.floor(N * 0.14));
  const adjTarget  = Math.max(8,  Math.floor(N * 0.14));

  const tiles = [];

  // pronouns (fixed set, duplicates added)
  const pron = PRONOUNS[state.lang].map(cloneFresh);
  for (let i=0;i<pronTarget;i++){
    tiles.push(cloneFresh(pron[Math.floor(Math.random()*pron.length)]));
  }

  // verbs (generated from paradigms)
  tiles.push(...buildVerbTiles(state.lang, state.diff, verbTarget));

  // other words
  tiles.push(...buildWordTiles(state.lang, state.diff, {
    noun: nounTarget, det: detTarget, prep: prepTarget, adj: adjTarget
  }));

  // fill to N (bias nouns/verbs so you can always build something)
  while (tiles.length < N){
    const r = Math.random();
    if (r < 0.45) tiles.push(tWord(WORDS[state.lang][state.diff].noun[Math.floor(Math.random()*WORDS[state.lang][state.diff].noun.length)], "noun"));
    else if (r < 0.72) tiles.push(...buildVerbTiles(state.lang, state.diff, 1));
    else if (r < 0.86) tiles.push(tWord(WORDS[state.lang][state.diff].det[Math.floor(Math.random()*WORDS[state.lang][state.diff].det.length)], "det"));
    else tiles.push(tWord(WORDS[state.lang][state.diff].prep[Math.floor(Math.random()*WORDS[state.lang][state.diff].prep.length)], "prep"));
  }

  shuffleInPlace(tiles);
  state.boardTiles = tiles.slice(0,N).map((ti, i) => {
    const s = state.slots[i];
    return { ...ti, x:s.x, y:s.y, z:s.z };
  });

  renderAll();
  setFeedback(`Board created (${state.layoutName}). Level: ${state.diff}. Make any correct sentence to remove tiles.`, "neutral");
  updateDeadlock();
}

function shuffleLayout(){
  if (state.boardTiles.length === 0) return;

  const remaining = [...state.boardTiles];
  const options = LAYOUTS.filter(n => n !== state.layoutName);
  state.layoutName = options[Math.floor(Math.random()*options.length)];

  let slots = makeSlotsFor(state.diff, state.layoutName);
  if (slots.length < remaining.length){
    state.layoutName = "turtle";
    slots = makeSlotsFor(state.diff, state.layoutName);
  }

  shuffleInPlace(slots);
  const useSlots = slots.slice(0, remaining.length);

  shuffleInPlace(remaining);
  state.boardTiles = remaining.map((ti, i) => ({ ...ti, x: useSlots[i].x, y: useSlots[i].y, z: useSlots[i].z }));
  state.slots = useSlots;

  renderAll();
  setFeedback(`Layout shuffled (${state.layoutName}). Same tiles, new shape.`, "neutral");
  updateDeadlock();
}

// -------------------- INTERACTIONS --------------------
function clickTile(tileId){
  const tile = state.boardTiles.find(t => t.id===tileId);
  if (!tile) return;
  if (!isPlayableIn(state.boardTiles, tile)) return;

  state.boardTiles = state.boardTiles.filter(t => t.id!==tileId);
  state.sentence.push(tile);

  renderAll();
  updateDeadlock();
}
function undo(){
  const last = state.sentence.pop();
  if (!last) return;
  state.boardTiles.push(last);
  renderAll();
  updateDeadlock();
}
function clearSentence(){
  if (!state.sentence.length) return;
  state.boardTiles.push(...state.sentence);
  state.sentence = [];
  renderAll();
  updateDeadlock();
}

// -------------------- GRAMMAR --------------------
/*
  Allowed:
   - Spanish: (pronoun)? verb (NP|PP)*
   - EN/DE/FR: pronoun verb (NP|PP)*
  NP = (det)? (adj)* noun
  PP = prep (det)? (adj)* noun
*/
function canBeValidPrefix(tokens){
  const pos = tokens.map(t=>t.pos);
  const vIdx = pos.indexOf("verb");

  // no verb yet: allow empty or a single pronoun (prune)
  if (vIdx === -1){
    if (pos.length === 0) return true;
    if (pos.some(p=>p!=="pronoun")) return false;
    return pos.length <= 1;
  }

  // before verb: pronouns only
  for (let i=0;i<vIdx;i++){
    if (pos[i] !== "pronoun") return false;
  }

  // EN/DE/FR need pronoun before verb
  if (LANG[state.lang].pronounRequired && vIdx === 0) return false;

  // agreement if pronoun present
  const pron = tokens.find(t=>t.pos==="pronoun") || null;
  const verb = tokens.find(t=>t.pos==="verb") || null;
  if (pron && verb && pron.meta?.agrees && verb.meta?.agrees){
    if (!intersects(pron.meta.agrees, verb.meta.agrees)) return false;
  }

  // after verb: prefix must be chunk-ish (allow incomplete det/adj/prep at very end)
  const after = pos.slice(vIdx+1);
  let i = 0;

  function consumeAdjStar(){
    while (after[i] === "adj") i++;
  }
  function consumeNP(){
    let j=i;
    if (after[j]==="det") j++;
    while (after[j]==="adj") j++;
    if (after[j]==="noun"){ i=j+1; return true; }
    return false;
  }
  function consumePP(){
    let j=i;
    if (after[j] !== "prep") return false;
    j++;
    if (after[j]==="det") j++;
    while (after[j]==="adj") j++;
    if (after[j]==="noun"){ i=j+1; return true; }
    return false;
  }

  function isLoosePrefixAtEnd(){
    // allow ending on: det, adj, prep, prep+det, prep+det+adj...
    if (i >= after.length) return false;
    if (after[i]==="det" || after[i]==="adj" || after[i]==="prep") return true;
    return false;
  }

  while (i < after.length){
    const start=i;
    if (consumePP()) continue;
    i=start;
    if (consumeNP()) continue;

    // maybe incomplete prefix (only allowed if we're at the end region)
    if (i >= after.length-1) return isLoosePrefixAtEnd();
    return false;
  }

  return true;
}

function isValidCompleteSentence(tokens){
  if (!canBeValidPrefix(tokens)) return false;

  const pos = tokens.map(t=>t.pos);
  const vIdx = pos.indexOf("verb");
  if (vIdx === -1) return false;
  if (LANG[state.lang].pronounRequired && vIdx === 0) return false;

  // must not end with dangling det/adj/prep
  const after = pos.slice(vIdx+1);
  if (after.length>0){
    const last = after[after.length-1];
    if (last === "det" || last === "adj" || last === "prep") return false;
    // also block "prep det" ending
    if (after.length>=2 && after[after.length-2]==="prep" && after[after.length-1]==="det") return false;
  }
  return true;
}

function checkSentence(){
  if (state.sentence.length === 0){
    setFeedback("Build a sentence first (tap playable tiles).", "bad");
    return;
  }

  if (!isValidCompleteSentence(state.sentence)){
    setFeedback("Not quite — try (pronoun) + verb, then (det) + (adj) + noun OR prep + (det) + (adj) + noun.", "bad");
    return;
  }

  state.score++;
  state.sentence = [];
  renderAll();

  if (state.boardTiles.length === 0){
    setFeedback("🎉 Correct — and the board is cleared!", "ok");
  } else {
    setFeedback("✅ Correct sentence! Keep going to clear the board.", "ok");
  }
  updateDeadlock();
}

// -------------------- DEADLOCK --------------------
function nextWantedTypes(picked){
  const pos = picked.map(t=>t.pos);
  const hasVerb = pos.includes("verb");
  const set = new Set();

  if (!hasVerb){
    if (state.lang === "es"){
      set.add("verb"); set.add("pronoun");
    } else {
      if (pos.length === 0) set.add("pronoun");
      else set.add("verb");
    }
    return set;
  }

  // after verb, encourage chunk-building
  set.add("det"); set.add("adj"); set.add("noun"); set.add("prep");
  set.add("verb");
  return set;
}

function existsSentenceMove(tiles, picked, depthLeft){
  if (picked.length > 0 && isValidCompleteSentence(picked)) return true;
  if (depthLeft === 0) return false;

  const playable = playableTiles(tiles);

  const hasVerbPicked = picked.some(t=>t.pos==="verb");
  if (!hasVerbPicked){
    if (LANG[state.lang].pronounRequired){
      if (!playable.some(t=>t.pos==="pronoun")) return false;
    }
    if (!playable.some(t=>t.pos==="verb")) return false;
  }

  const wanted = nextWantedTypes(picked);
  const candidates = playable.filter(t => wanted.has(t.pos));
  const toTry = candidates.length ? candidates : playable;

  for (const t0 of toTry){
    const nextPicked = [...picked, t0];
    if (!canBeValidPrefix(nextPicked)) continue;

    const nextTiles = tiles.filter(t => t.id !== t0.id);
    if (existsSentenceMove(nextTiles, nextPicked, depthLeft - 1)) return true;
  }
  return false;
}

function isDeadlock(){
  if (state.boardTiles.length === 0) return false;
  // allow slightly deeper search now that adjectives exist
  const maxDepth = (state.lang === "es") ? 4 : 5;
  return !existsSentenceMove(state.boardTiles, [], maxDepth);
}

function updateDeadlock(){
  const dead = isDeadlock();
  setDeadlockUI(dead);
  if (dead && state.boardTiles.length > 0){
    setFeedback("⚠️ Deadlock: no valid sentence can be made. Hit “Shuffle layout”.", "bad");
  }
}

// -------------------- RENDER --------------------
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
  const approxW = (maxX+2) * (px("--tw") + px("--gap")) + 140;
  const approxH = (maxY+2) * (px("--th") + px("--gap")) + 140;
  els.board.style.width = `${approxW}px`;
  els.board.style.height = `${approxH}px`;

  const tiles = [...state.boardTiles].sort((a,b)=>a.z-b.z);

  for (const ti of tiles){
    const div = document.createElement("div");
    div.className = "tile";
    div.dataset.pos = ti.pos || "other";

    const playable = isPlayableIn(state.boardTiles, ti);
    div.classList.add(playable ? "playable" : "blocked");
    if (playable) div.addEventListener("click", ()=>clickTile(ti.id));

    const left = (ti.x+2) * (px("--tw")+px("--gap")) + ti.z * px("--zdx");
    const top  = (ti.y+1) * (px("--th")+px("--gap")) - ti.z * px("--zdy");

    div.style.left = `${left}px`;
    div.style.top = `${top}px`;
    div.style.zIndex = String(10 + ti.z);

    const w = document.createElement("div");
    w.className = "word";
    w.textContent = ti.text;

    const p = document.createElement("div");
    p.className = "pos";
    // keep the legend clean: adj counts as "Other" visually, but still works
    p.textContent = (ti.pos === "adj") ? "Adj" : (ti.pos === "prep" ? "Prep" :
                    ti.pos === "det" ? "Det" :
                    ti.pos === "noun" ? "Noun" :
                    ti.pos === "verb" ? "Verb" :
                    ti.pos === "pronoun" ? "Pronoun" : "Other");

    div.appendChild(w);
    div.appendChild(p);
    els.board.appendChild(div);
  }
}

function renderAll(){
  els.score.textContent = String(state.score);
  els.tilesLeft.textContent = String(state.boardTiles.length);
  renderSentence();
  renderBoard();
  updateHints();
  if (state.boardTiles.length === 0) setDeadlockUI(false);
}

// -------------------- WIRING --------------------
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
