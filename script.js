const params = new URLSearchParams(location.search);

const pick = (...keys) => {
  for (const k of keys){
    const v = params.get(k);
    if (v && v.trim() !== "") return v.trim();
  }
  return "";
};

const normalize = t =>
  String(t||"")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();

const domain =
  pick("domain") ||
  location.origin.replace(/\/$/,"") ||
  "http://localhost:3900";

// labels
const YES = pick("yes") || "Sim";
const NO  = pick("no")  || "Não";

// título (se não vier, escondemos)
const title = pick("title","question");
const $top = document.getElementById("top");
if (title){
  document.getElementById("title").textContent = title;
}else{
  $top.style.display = "none";
}

// sets de palavras
const yesWords = new Set([normalize(YES),"sim","s","yes","y","ok"]);
const noWords  = new Set([normalize(NO),"nao","não","n","no","nop"]);

// dom
const $yesCount = document.getElementById("yesCount");
const $noCount  = document.getElementById("noCount");
const $total    = document.getElementById("totalCount");
const $leader   = document.getElementById("leaderText");

const $yesFill = document.getElementById("yesFill");
const $noFill  = document.getElementById("noFill");
const $ringYes = document.getElementById("ringYes");

const $sideYes = document.getElementById("sideYes");
const $sideNo  = document.getElementById("sideNo");

// donut
const R = 46;
const C = 2 * Math.PI * R;

let current = { yes:0, no:0 };
const lerp = (a,b,t)=>a+(b-a)*t;

function setLeader(yes,no){
  $sideYes.classList.remove("leader");
  $sideNo.classList.remove("leader");
  $yesFill.classList.remove("leader");
  $noFill.classList.remove("leader");
  $ringYes.classList.remove("leader");

  if (yes > no){
    $sideYes.classList.add("leader");
    $yesFill.classList.add("leader");
    $ringYes.classList.add("leader");
    $leader.textContent = `${YES} a ganhar`;
  } else if (no > yes){
    $sideNo.classList.add("leader");
    $noFill.classList.add("leader");
    $leader.textContent = `${NO} a ganhar`;
  } else {
    $leader.textContent = "Empate";
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
    const no  = lerp(start.no,target.no,e);
    const total = Math.max(1, yes+no);

    $yesCount.textContent = Math.round(yes);
    $noCount.textContent  = Math.round(no);
    $total.textContent    = Math.round(yes+no);

    $yesFill.style.width = `${(yes/total)*100}%`;
    $noFill.style.width  = `${(no/total)*100}%`;

    const dash = C * (yes/total);
    $ringYes.style.strokeDasharray = `${dash} ${C-dash}`;

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
    const words = (data.wordcloud||"").split(",").map(normalize);

    let yes=0,no=0;
    for (const w of words){
      if (yesWords.has(w)) yes++;
      else if (noWords.has(w)) no++;
    }

    if (yes===current.yes && no===current.no) return;
    animateTo({yes,no});
  }catch(e){}
}

fetchData();
setInterval(fetchData,800);
