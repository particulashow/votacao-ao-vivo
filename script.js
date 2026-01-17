// Votação Sim/Não (contagem) via wordcloud
// URL params:
// ?yes=Sim&no=Não
// &yesKeys=S,Sim,yup,claro
// &noKeys=N,Não,nope,nunca
// &domain=http://localhost:3900
// &accent=#60a5fa
// &text=#ffffff
// &title=...&subtitle=...

const params = new URLSearchParams(window.location.search);

const yesLabel = params.get('yes') || 'Sim';
const noLabel  = params.get('no')  || 'Não';
const domain   = params.get('domain') || 'http://localhost:3900';

const accent = decodeURIComponent(params.get('accent') || '#60a5fa');
const text   = decodeURIComponent(params.get('text')   || '#ffffff');

const titleParam = params.get('title') || 'Votação ao Vivo';
const subtitleParam = params.get('subtitle') || 'Conta comentários em tempo real';

// Aplica cores
document.documentElement.style.setProperty('--accent', accent);
document.documentElement.style.setProperty('--text', text);

document.getElementById('title').textContent = titleParam;
document.getElementById('subtitle').textContent = subtitleParam;

// ---------- helpers ----------
function removeAccents(str) {
  return (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function norm(str){
  return removeAccents(String(str || '')).trim().toLowerCase();
}
function parseKeys(raw, fallback){
  // aceita "S, Sim, yup" ou "S|Sim|yup"
  const s = String(raw || '').trim();
  if (!s) return fallback.map(norm);
  return s
    .split(/[,|]/g)
    .map(x => norm(x))
    .filter(Boolean);
}
function isValidNumber(v){
  return typeof v === 'number' && !isNaN(v) && v >= 0 && v <= 10000000;
}
function safeAnimate(dataItem, key, value){
  if (!dataItem) return;
  if (!isValidNumber(value)) return;
  const v = value === 0 ? 0.00001 : value;
  dataItem.animate({ key, to: v, duration: 650, easing: am5.ease.out(am5.ease.cubic) });
}

// ---------- chaves (sinónimos) ----------
const YES_KEYS = parseKeys(params.get('yesKeys'), [yesLabel, 's', 'sim', 'yup', 'yes']);
const NO_KEYS  = parseKeys(params.get('noKeys'),  [noLabel,  'n', 'nao', 'não', 'nope', 'no']);

// Para debug (podes comentar)
console.log('YES_KEYS:', YES_KEYS);
console.log('NO_KEYS:', NO_KEYS);

// ---------- chart ----------
const root = am5.Root.new("chartdiv");
root.setThemes([am5themes_Animated.new(root)]);

const container = root.container.children.push(
  am5.Container.new(root, { width: am5.p100, height: am5.p100 })
);

const chart = container.children.push(
  am5percent.PieChart.new(root, {
    innerRadius: am5.percent(62),
    radius: am5.percent(94),
    x: am5.percent(50),
    y: am5.percent(52),
    centerX: am5.percent(50),
    centerY: am5.percent(50)
  })
);

const series = chart.series.push(
  am5percent.PieSeries.new(root, {
    valueField: "value",
    categoryField: "category",
    alignLabels: false
  })
);

// Labels: mostram contagem (não percentagem)
series.labels.template.setAll({
  text: "{category}: {value}",
  fill: am5.color(text),
  fontSize: 16,
  fontWeight: "800",
  opacity: 0.92
});

series.ticks.template.setAll({ strokeOpacity: 0.35 });

series.slices.template.setAll({
  strokeOpacity: 0,
  cornerRadius: 10
});

// "Sim" sólido / "Não" outline neutro
const yesFill = am5.color(accent);
const noStroke = am5.color(text);

// data inicial
series.data.setAll([
  {
    category: yesLabel,
    value: 1,
    settings: { fill: yesFill, fillOpacity: 0.86 }
  },
  {
    category: noLabel,
    value: 1,
    settings: {
      fillOpacity: 0.06,
      fill: am5.color(0xffffff),
      strokeOpacity: 0.72,
      stroke: noStroke,
      strokeDasharray: [10, 6],
      strokeWidth: 3
    }
  }
]);

// adapters para respeitar settings
series.slices.template.adapters.add("fill", (fill, target) => {
  const s = target.dataItem?.dataContext?.settings;
  return s?.fill ? s.fill : fill;
});
series.slices.template.adapters.add("fillOpacity", (op, target) => {
  const s = target.dataItem?.dataContext?.settings;
  return typeof s?.fillOpacity === 'number' ? s.fillOpacity : op;
});
series.slices.template.adapters.add("stroke", (stroke, target) => {
  const s = target.dataItem?.dataContext?.settings;
  return s?.stroke ? s.stroke : stroke;
});
series.slices.template.adapters.add("strokeOpacity", (op, target) => {
  const s = target.dataItem?.dataContext?.settings;
  return typeof s?.strokeOpacity === 'number' ? s.strokeOpacity : op;
});
series.slices.template.adapters.add("strokeDasharray", (dash, target) => {
  const s = target.dataItem?.dataContext?.settings;
  return s?.strokeDasharray || dash;
});
series.slices.template.adapters.add("strokeWidth", (w, target) => {
  const s = target.dataItem?.dataContext?.settings;
  return typeof s?.strokeWidth === 'number' ? s.strokeWidth : w;
});

// Texto central (total)
const centerLabel = chart.seriesContainer.children.push(
  am5.Label.new(root, {
    text: "0",
    centerX: am5.percent(50),
    centerY: am5.percent(50),
    x: am5.percent(50),
    y: am5.percent(50),
    fontSize: 46,
    fontWeight: "900",
    fill: am5.color(text),
    textAlign: "center"
  })
);

const centerSub = chart.seriesContainer.children.push(
  am5.Label.new(root, {
    text: `${yesLabel} 0  •  ${noLabel} 0`,
    centerX: am5.percent(50),
    centerY: am5.percent(50),
    x: am5.percent(50),
    y: am5.percent(50),
    dy: 40,
    fontSize: 14,
    fontWeight: "800",
    fill: am5.color(text),
    opacity: 0.78,
    textAlign: "center"
  })
);

// ---------- wordcloud ----------
function updateUI(yesCount, noCount){
  const total = yesCount + noCount;
  centerLabel.set("text", String(total));
  centerSub.set("text", `${yesLabel} ${yesCount}  •  ${noLabel} ${noCount}`);

  const yesItem = series.dataItems[0];
  const noItem  = series.dataItems[1];

  safeAnimate(yesItem, "valueWorking", yesCount);
  safeAnimate(noItem, "valueWorking", noCount);
}

// limpa no arranque (inclui todos os sinónimos para evitar “fantasmas”)
const clearWords = [...new Set([
  ...YES_KEYS,
  ...NO_KEYS,
  norm(yesLabel),
  norm(noLabel)
])].filter(Boolean).join(',');

fetch(`${domain}/clear-chat?words=${encodeURIComponent(clearWords)}`)
  .then(() => setTimeout(fetchData, 450))
  .catch(() => setTimeout(fetchData, 450));

function fetchData(){
  fetch(`${domain}/wordcloud`)
    .then(r => r.json())
    .then(data => {
      const raw = norm(data.wordcloud || '');
      const arr = raw.split(',').map(s => norm(s)).filter(Boolean);

      let yesCount = 0;
      let noCount = 0;

      for (const token of arr){
        if (YES_KEYS.includes(token)) yesCount++;
        else if (NO_KEYS.includes(token)) noCount++;
      }

      updateUI(yesCount, noCount);
    })
    .catch(err => console.error("Erro ao buscar dados:", err));
}

setInterval(fetchData, 1000);
