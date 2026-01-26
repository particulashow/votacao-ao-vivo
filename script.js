const params = new URLSearchParams(window.location.search);

const domain = (params.get("domain") || "http://localhost:3900").replace(/\/$/, "");

// labels (mantém compatibilidade com os teus params yes/no)
const YES_LABEL = (params.get("yes") || "Sim").trim();
const NO_LABEL  = (params.get("no")  || "Não").trim();

// cores opcionais por query (se quiseres manter compatibilidade com a página de testes)
function safeHex(v){
  return /^#[0-9a-fA-F]{6}$/.test(v || "") ? v : "";
}
const accent = safeHex(params.get("accent")); // opcional
const text   = safeHex(params.get("text"));   // opcional

if (text) document.documentElement.style.setProperty("--text", text);
// Se quiseres, podes usar accent para o track ou outra coisa. Mantive discreto:
if (accent) document.documentElement.style.setProperty("--track", "rgba(255,255,255,.12)");

// Elementos
const elYes = document.getElementById("yesCount");
const elNo  = document.getElementById("noCount");
const svg = document.querySelector(".ring");
const arcYes = document.querySelector(".arc-yes");
const arcNo  = document.querySelector(".arc-no");
const ringBox = document.querySelector(".ringBox");

function normalize(txt){
  return String(txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Heurística robusta para “sim claro”, “Simmm”, “Não”, “Nao”, “No”
const YES_WORDS = ["sim", "s", "yes", "y", "claro", "bora"]; // podes ajustar
const NO_WORDS  = ["nao", "não", "no", "n", "nop", "nah"];   // podes ajustar

function isYes(v){
  if (!v) return false;
  // “simmm” vira “simmm” -> startsWith("sim") funciona
  return YES_WORDS.some(w => v.startsWith(normalize(w)));
}
function isNo(v){
  if (!v) return false;
  return NO_WORDS.some(w => v.startsWith(normalize(w)));
}

// Preparar o donut (dasharray/dashoffset)
function setupCircle(circle){
  const r = circle.r.baseVal.value;
  const c = 2 * Math.PI * r;
  circle.style.strokeDasharray = `${c} ${c}`;
  circle.style.strokeDashoffset = `${c}`;
  return c;
}

const CIRC = setupCircle(arcYes);
setupCircle(arcNo);

// Estado para pulse apenas quando muda
let lastYes = 0;
let lastNo = 0;

function setArc(circle, ratio){
  // ratio: 0..1 (quanto está “cheio”)
  const clamped = Math.max(0, Math.min(1, ratio));
  const offset = CIRC * (1 - clamped);
  circle.style.strokeDashoffset = `${offset}`;
}

function pulse(){
  ringBox.classList.remove("pulse");
  // force reflow
  void ringBox.offsetWidth;
  ringBox.classList.add("pulse");
}

function updateUI(yes, no){
  elYes.textContent = yes;
  elNo.textContent  = no;

  const total = yes + no;
  const denom = total || 1;

  // ratios
  const rYes = yes / denom;
  const rNo  = no  / denom;

  // Queremos 2 arcos no mesmo círculo.
  // Estratégia: desenhar o SIM “por cima”, e o NÃO ocupa o restante.
  // Para o NÃO, usamos dashoffset como se fosse o restante, mas com um truque:
  // definimos o arco do NÃO como total - yes, e depois “rodamos” através de dashoffset.
  // Solução simples: arco SIM representa yes, e arco NÃO representa no, mas deslocado pelo arco SIM.
  setArc(arcYes, rYes);

  // Para o NÃO: preenchimento rNo, mas começa após o segmento SIM.
  // Offset = CIRC * (1 - rNo) + CIRC * rYes
  const offsetNo = (CIRC * (1 - rNo)) + (CIRC * rYes);
  arcNo.style.strokeDashoffset = `${offsetNo}`;

  // pulse apenas se houve alteração real
  if (yes !== lastYes || no !== lastNo) pulse();
  lastYes = yes;
  lastNo = no;
}

async function fetchData(){
  const res = await fetch(`${domain}/wordcloud`, { cache: "no-store" });
  const data = await res.json();

  const words = String(data.wordcloud || "")
    .split(",")
    .map(w => normalize(w))
    .filter(Boolean);

  let yes = 0;
  let no = 0;

  for (const w of words){
    // Prioridade: detectar sim/não no início
    if (isYes(w)) { yes++; continue; }
    if (isNo(w))  { no++;  continue; }

    // fallback: se for exatamente “sim”/“nao” depois da normalização
    if (w === "sim") yes++;
    if (w === "nao") no++;
  }

  updateUI(yes, no);
}

// Reset inicial (mantém a lógica que tens usado)
fetch(`${domain}/clear-chat`, { mode: "no-cors" }).catch(()=>{});

// Loop
fetchData().catch(()=>{});
setInterval(() => fetchData().catch(()=>{}), 1000);
