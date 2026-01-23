const params = new URLSearchParams(location.search);

const pick = (...keys) => {
  for (const k of keys){
    const v = params.get(k);
    if (v && String(v).trim() !== "") return String(v).trim();
  }
  return "";
};

const safeHex = (v) => /^#[0-9a-fA-F]{6}$/.test(v || "") ? v : "";

const normalize = (t) =>
  String(t || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();

// domain
const domain = pick("domain") || "http://localhost:3900";

// labels
const yesLabel = pick("yes") || "Sim";
const noLabel  = pick("no")  || "Não";

// title opcional
const title = pick("title","question");
const titleRow = document.getElementById("titleRow");
const titleEl = document.getElementById("title");
if (title) titleEl.textContent = title;
else titleRow.style.display = "none";

// cores via query
const accent = safeHex(pick("accent")) || "";
const noColor = safeHex(pick("noColor")) || "";
const track = safeHex(pick("track")) || "";
const text = safeHex(pick("text")) || "";

if (accent) document.documentElement.style.setProperty("--yes", accent);
if (noColor) document.documentElement.style.setProperty("--no", noColor);
if (track) document.documentElement.style.setProperty("--track", track);
if (text) document.documentElement.style.setProperty("--txt", text);

// UI
document.getElementById("yesLabel").textContent = yesLabel;
document.getElementById("noLabel").textContent  = noLabel;

const yesCountEl = document.getElementById("yesCount");
const noCountEl  = document.getElementById("noCount");
const totalEl    = document.getElementById("totalCount");
const leaderEl   = document.getElementById("leaderText");

const yesHint = document.getElementById("yesHint");
const noHint  = document.getElementById("noHint");

const leftBox  = document.getElementById("leftBox");
const rightBox = document.getElementById("rightBox");

const segYes = document.getElementById("segYes");

// donut geometry
const R = 46;
const C = 2 * Math.PI * R;

function parseCSV(s){
  return String(s || "")
    .split(",")
    .map(normalize)
    .filter(Boolean);
}

// sinónimos opcionais
const YES_WORDS = new Set([
  normalize(yesLabel),
  "sim","s","yes","y","yup","ok","claro",
  ...parseCSV(pick("yesWords"))
]);

const NO_WORDS = new Set([
  normalize(noLabel),
  "nao","não","n","no","nope","nah","nop",
  ...parseCSV(pick("noWords"))
]);

let current = { yes: 0, no: 0 };
const lerp = (a,b,t)=>a+(b-a)*t;

function setLeader(yes, no){
  leftBox.classList.remove("leader","yesGlow","noGlow");
  rightBox.classList.remove("leader","yesGlow","noGlow");

  yesHint.textContent = "";
  noHint.textContent = "";

  if (yes > no){
    leaderEl.textContent = `${yesLabel} a ganhar`;
    leftBox.classList.add("leader","yesGlow");
    yesHint.textContent = "A GANHAR";
  } else if (no > yes){
    leaderEl.textContent = `${noLabel} a ganhar`;
    rightBox.classList.add("leader","noGlow");
    noHint.textContent = "A GANHAR";
  } else {
    leaderEl.textContent = "Empate";
  }
}

function animateTo(target){
  const start = { ...current };
  const t0 = performance.now();
  const dur = 520;

  function step(now){
    const p = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);

    const yes = lerp(start.yes, target.yes, e);
    const no  = lerp(start.no,  target.no,  e);

    const total = Math.max(1, yes + no);

    yesCountEl.textContent = Math.round(yes);
    noCountEl.textContent  = Math.round(no);
    totalEl.textContent    = Math.round(yes + no);

    // donut: só 1 segmento (Sim), resto é track
    const yesLen = C * (yes / total);
    segYes.style.strokeDasharray = `${yesLen} ${C - yesLen}`;

    if (p < 1) requestAnimationFrame(step);
    else{
      current = { ...target };
      setLeader(target.yes, target.no);
    }
  }

  requestAnimationFrame(step);
}

async function fetchData(){
  try{
    const res = await fetch(`${domain}/wordcloud`, { cache:"no-store" });
    const data = await res.json();

    const words = String(data.wordcloud || "")
      .split(",")
      .map(normalize)
      .filter(Boolean);

    let yes = 0, no = 0;
    for (const w of words){
      if (YES_WORDS.has(w)) yes++;
      else if (NO_WORDS.has(w)) no++;
    }

    if (yes === current.yes && no === current.no) return;
    animateTo({ yes, no });
  }catch(e){}
}

fetchData();
setInterval(fetchData, 900);
