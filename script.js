const params = new URLSearchParams(location.search);

const pick = (...keys) => {
  for (const k of keys){
    const v = params.get(k);
    if (v && String(v).trim() !== "") return String(v).trim();
  }
  return "";
};

const normalize = (t) =>
  String(t || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const safeHex = (v) => /^#[0-9a-fA-F]{6}$/.test(v || "") ? v : "";

// domain (sem hardcode)
const domain =
  pick("domain") ||
  location.origin.replace(/\/$/,"") ||
  "http://localhost:3900";

// labels
const YES_LABEL = pick("yes") || "Sim";
const NO_LABEL  = pick("no")  || "Não";

// sinónimos (por default: usa o label e variações óbvias)
function parseWords(str){
  return String(str || "")
    .split(",")
    .map(s => normalize(s))
    .filter(Boolean);
}

const yesWords = new Set([
  ...parseWords(pick("yesWords")),
  normalize(YES_LABEL),
  "sim","s","yes","yup","y","ok","claro"
]);

const noWords = new Set([
  ...parseWords(pick("noWords")),
  normalize(NO_LABEL),
  "nao","não","n","no","nope","nah","nop"
]);

// cores
const accent = safeHex(pick("accent"));
const text   = safeHex(pick("text"));
const noColor = safeHex(pick("noColor"));     // opcional
const track  = safeHex(pick("track"));        // opcional

if (accent) document.documentElement.style.setProperty("--accent", accent);
if (text)   document.documentElement.style.setProperty("--text", text);
if (noColor) document.documentElement.style.setProperty("--noColor", noColor);
if (track)  document.documentElement.style.setProperty("--track", track);

// dom refs
const $title = document.getElementById("title");
const $subtitle = document.getElementById("subtitle");
const $yesLabel = document.getElementById("yesLabel");
const $noLabel  = document.getElementById("noLabel");
const $yesKbd = document.getElementById("yesKbd");
const $noKbd  = document.getElementById("noKbd");

const $yesCount = document.getElementById("yesCount");
const $noCount  = document.getElementById("noCount");
const $yesPct   = document.getElementById("yesPct");
const $noPct    = document.getElementById("noPct");
const $total    = document.getElementById("totalCount");
const $leaderText = document.getElementById("leaderText");

const $yesFill = document.getElementById("yesFill");
const $noFill  = document.getElementById("noFill");
const $ringYes = document.getElementById("ringYes");

const $sideYes = document.getElementById("sideYes");
const $sideNo  = document.getElementById("sideNo");

// set labels
$title.textContent = pick("title") || "Votação ao vivo";
$yesLabel.textContent = YES_LABEL;
$noLabel.textContent  = NO_LABEL;
$yesKbd.textContent = YES_LABEL;
$noKbd.textContent  = NO_LABEL;

$subtitle.innerHTML = `Escreve no chat: <span class="kbd">${YES_LABEL}</span> ou <span class="kbd">${NO_LABEL}</span>`;

// donut math
const R = 46;
const C = 2 * Math.PI * R;

// state
let current = { yes:0, no:0 };

const lerp = (a,b,t)=>a+(b-a)*t;

function setLeader(yes,no){
  $sideYes.classList.remove("leader","yes");
  $sideNo.classList.remove("leader","no");
  $yesFill.classList.remove("leader");
  $noFill.classList.remove("leader");
  $ringYes.classList.remove("leader");

  if (yes === 0 && no === 0){
    $leaderText.textContent = "Empate";
    return;
  }

  if (yes > no){
    $sideYes.classList.add("leader","yes");
    $yesFill.classList.add("leader");
    $ringYes.classList.add("leader");
    $leaderText.textContent = `${YES_LABEL} a ganhar`;
  } else if (no > yes){
    $sideNo.classList.add("leader","no");
    $noFill.classList.add("leader");
    $leaderText.textContent = `${NO_LABEL} a ganhar`;
  } else {
    $leaderText.textContent = "Empate";
  }
}

function animateTo(target){
  const start = {...current};
  const t0 = performance.now();
  const dur = 520;

  function step(now){
    const p = Math.min(1,(now-t0)/dur);
    const e = 1 - Math.pow(1-p,3);

    const yes = lerp(start.yes, target.yes, e);
    const no  = lerp(start.no,  target.no,  e);

    const total = Math.max(1, yes + no);
    const yesPct = (yes/total)*100;
    const noPct  = (no/total)*100;

    // números
    $yesCount.textContent = Math.round(yes);
    $noCount.textContent  = Math.round(no);
    $total.textContent    = Math.round(yes + no);

    $yesPct.textContent = `${Math.round(yesPct)}%`;
    $noPct.textContent  = `${Math.round(noPct)}%`;

    // meters
    $yesFill.style.width = `${yesPct}%`;
    $noFill.style.width  = `${noPct}%`;

    // donut (yes)
    const dash = (C * (yes/total));
    $ringYes.style.strokeDasharray = `${dash} ${C - dash}`;

    if (p < 1) requestAnimationFrame(step);
    else{
      current = {...target};
      setLeader(target.yes, target.no);
    }
  }

  requestAnimationFrame(step);
}

async function fetchData(){
  try{
    const res = await fetch(`${domain}/wordcloud`, { cache:"no-store" });
    const data = await res.json();

    const words = (data.wordcloud || "")
      .split(",")
      .map(normalize)
      .filter(Boolean);

    let yes = 0, no = 0;

    for (const w of words){
      if (yesWords.has(w)) yes++;
      else if (noWords.has(w)) no++;
    }

    if (yes === current.yes && no === current.no) return;
    animateTo({ yes, no });
  }catch(e){}
}

// arranque
fetchData();
setInterval(fetchData, 800);
