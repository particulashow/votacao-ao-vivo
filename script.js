const params = new URLSearchParams(location.search);

const pick = (...keys) => {
  for (const k of keys){
    const v = params.get(k);
    if (v && v.trim() !== "") return v.trim();
  }
  return "";
};

const normalize = (t) =>
  String(t||"")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();

const safeHex = v => /^#[0-9a-fA-F]{6}$/.test(v||"") ? v : "";

// params
const domain = pick("domain") || "http://localhost:3900";

const yesLabel = pick("yes") || "Sim";
const noLabel  = pick("no")  || "Não";

// cores opcionais
const yesColor = safeHex(pick("accent"));
const noColor  = safeHex(pick("noColor"));
const track    = safeHex(pick("track"));
const text     = safeHex(pick("text"));

if (yesColor) document.documentElement.style.setProperty("--yes", yesColor);
if (noColor)  document.documentElement.style.setProperty("--no", noColor);
if (track)    document.documentElement.style.setProperty("--track", track);
if (text)     document.documentElement.style.setProperty("--text", text);

// dom
const yesCountEl = document.getElementById("yesCount");
const noCountEl  = document.getElementById("noCount");
const leaderEl   = document.getElementById("leaderText");
const ringYes    = document.getElementById("ringYes");

// donut geometry
const R = 46;
const C = 2 * Math.PI * R;

// vote words
const YES_WORDS = new Set([
  normalize(yesLabel),"sim","s","yes","y","ok"
]);
const NO_WORDS = new Set([
  normalize(noLabel),"nao","não","n","no","nop"
]);

let current = { yes:0, no:0 };
const lerp = (a,b,t)=>a+(b-a)*t;

function setLeader(yes,no){
  leaderEl.classList.remove("yes","no");
  ringYes.classList.remove("leader");

  if (yes > no){
    leaderEl.textContent = `${yesLabel} a ganhar`;
    leaderEl.classList.add("yes");
    ringYes.classList.add("leader");
  } else if (no > yes){
    leaderEl.textContent = `${noLabel} a ganhar`;
    leaderEl.classList.add("no");
  } else {
    leaderEl.textContent = "Empate";
  }
}

function animateTo(target){
  const start = {...current};
  const t0 = performance.now();
  const dur = 520;

  function step(now){
    const p = Math.min(1,(now-t0)/dur);
    const e = 1 - Math.pow(1-p,3);

    const yes = lerp(start.yes,target.yes,e);
    const no  = lerp(start.no ,target.no ,e);
    const total = Math.max(1, yes+no);

    yesCountEl.textContent = Math.round(yes);
    noCountEl.textContent  = Math.round(no);

    const yesLen = C * (yes/total);
    ringYes.style.strokeDasharray = `${yesLen} ${C-yesLen}`;

    if (p < 1) requestAnimationFrame(step);
    else{
      current = {...target};
      setLeader(target.yes,target.no);
    }
  }
  requestAnimationFrame(step);
}

async function fetchData(){
  try{
    const res = await fetch(`${domain}/wordcloud`,{cache:"no-store"});
    const data = await res.json();
    const words = (data.wordcloud||"")
      .split(",")
      .map(normalize)
      .filter(Boolean);

    let yes=0,no=0;
    for(const w of words){
      if(YES_WORDS.has(w)) yes++;
      else if(NO_WORDS.has(w)) no++;
    }

    if(yes===current.yes && no===current.no) return;
    animateTo({yes,no});
  }catch(e){}
}

fetchData();
setInterval(fetchData, 900);
