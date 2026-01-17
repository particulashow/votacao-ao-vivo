// Votação Sim/Não (contagem) via wordcloud
// URL params:
// ?yes=Sim&no=Não&domain=http://localhost:3900&accent=#60a5fa&text=#ffffff&title=...
//
// Nota: mantém o padrão que já funciona contigo: fetch /clear-chat e /wordcloud

const params = new URLSearchParams(window.location.search);

const yesLabel = params.get('yes') || 'Sim';
const noLabel  = params.get('no')  || 'Não';
const domain   = params.get('domain') || 'http://localhost:3900';

const accent = decodeURIComponent(params.get('accent') || '#60a5fa');
const text   = decodeURIComponent(params.get('text')   || '#ffffff');

const titleParam = params.get('title') || 'Votação ao Vivo';
const subtitleParam = params.get('subtitle') || 'Comentários contabilizados em tempo real';

document.documentElement.style.setProperty('--accent', accent);
document.documentElement.style.setProperty('--text', text);

document.getElementById('title').textContent = titleParam;
document.getElementById('subtitle').textContent = subtitleParam;

document.getElementById('yesLabelTxt').textContent = yesLabel;
document.getElementById('noLabelTxt').textContent = noLabel;

// ---------- helpers ----------
function removeAccents(str) {
  return str?.normalize("NFD")?.replace(/[\u0300-\u036f]/g, "") || "";
}
function safeLower(s){ return removeAccents(String(s || '')).toLowerCase(); }
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function isValidNumber(value) {
  return typeof value === 'number' && !isNaN(value) && value >= 0 && value <= 10000000;
}

function safeAnimate(dataItem, key, value) {
  if (!dataItem) return;
  if (isValidNumber(value)) {
    // amCharts não gosta de zero absoluto em certas configs
    const v = value === 0 ? 0.00001 : value;
    dataItem.animate({ key, to: v, duration: 650, easing: am5.ease.out(am5.ease.cubic) });
  }
}

// ---------- chart ----------
const root = am5.Root.new("chartdiv");
root.setThemes([am5themes_Animated.new(root)]);

// container
const container = root.container.children.push(
  am5.Container.new(root, { width: am5.p100, height: am5.p100 })
);

// donut chart
const chart = container.children.push(
  am5percent.PieChart.new(root, {
    innerRadius: am5.percent(62),
    radius: am5.percent(94),
    x: am5.percent(50),
    y: am5.percent(50),
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

series.labels.template.setAll({
  text: "{category}: {value}",
  fill: am5.color(text),
  fontSize: 16,
  fontWeight: "700",
  opacity: 0.9
});

series.ticks.template.setAll({
  strokeOpacity: 0.35
});

series.slices.template.setAll({
  strokeOpacity: 0,
  cornerRadius: 10
});

// estilo “Não” outline (mais neutro)
const yesFill = am5.color(accent);
const noStroke = am5.color(text);

// data inicial
series.data.setAll([
  {
    category: yesLabel,
    value: 1,
    settings: { fill: yesFill, fillOpacity: 0.85 }
  },
  {
    category: noLabel,
    value: 1,
    settings: {
      fillOpacity: 0.06,
      fill: am5.color(0xffffff),
      strokeOpacity: 0.7,
      stroke: noStroke,
      strokeDasharray: [10, 6],
      strokeWidth: 3
    }
  }
]);

series.slices.template.adapters.add("fill", (fill, target) => {
  const dataItem = target.dataItem;
  const settings = dataItem?.dataContext?.settings;
  return settings?.fill ? settings.fill : fill;
});
series.slices.template.adapters.add("fillOpacity", (op, target) => {
  const settings = target.dataItem?.dataContext?.settings;
  return typeof settings?.fillOpacity === 'number' ? settings.fillOpacity : op;
});
series.slices.template.adapters.add("stroke", (stroke, target) => {
  const settings = target.dataItem?.dataContext?.settings;
  return settings?.stroke ? settings.stroke : stroke;
});
series.slices.template.adapters.add("strokeOpacity", (op, target) => {
  const settings = target.dataItem?.dataContext?.settings;
  return typeof settings?.strokeOpacity === 'number' ? settings.strokeOpacity : op;
});
series.slices.template.adapters.add("strokeDasharray", (dash, target) => {
  const settings = target.dataItem?.dataContext?.settings;
  return settings?.strokeDasharray || dash;
});
series.slices.template.adapters.add("strokeWidth", (w, target) => {
  const settings = target.dataItem?.dataContext?.settings;
  return typeof settings?.strokeWidth === 'number' ? settings.strokeWidth : w;
});

// texto central: total + split
const centerLabel = chart.seriesContainer.children.push(
  am5.Label.new(root, {
    text: "0",
    centerX: am5.percent(50),
    centerY: am5.percent(50),
    x: am5.percent(50),
    y: am5.percent(50),
    fontSize: 44,
    fontWeight: "900",
    fill: am5.color(text),
    textAlign: "center",
    populateText: true
  })
);

const centerSub = chart.seriesContainer.children.push(
  am5.Label.new(root, {
    text: `${yesLabel} 0  •  ${noLabel} 0`,
    centerX: am5.percent(50),
    centerY: am5.percent(50),
    x: am5.percent(50),
    y: am5.percent(50),
    dy: 38,
    fontSize: 14,
    fontWeight: "700",
    fill: am5.color(text),
    opacity: 0.75,
    textAlign: "center"
  })
);

// ---------- data fetching ----------
const YES_TOKEN = safeLower(yesLabel);
const NO_TOKEN  = safeLower(noLabel);

// limpa wordcloud para estas palavras
fetch(`${domain}/clear-chat?words=${encodeURIComponent(yesLabel)},${encodeURIComponent(noLabel)}`)
  .then(() => setTimeout(fetchData, 450))
  .catch(() => setTimeout(fetchData, 450));

function updateUI(yesCount, noCount){
  document.getElementById('yesCountTxt').textContent = String(yesCount);
  document.getElementById('noCountTxt').textContent  = String(noCount);

  const total = yesCount + noCount;
  centerLabel.set("text", String(total));
  centerSub.set("text", `${yesLabel} ${yesCount}  •  ${noLabel} ${noCount}`);

  // animação suave dos valores na série (sem resetar slices)
  const yesItem = series.dataItems[0];
  const noItem  = series.dataItems[1];

  safeAnimate(yesItem, "valueWorking", yesCount);
  safeAnimate(noItem, "valueWorking", noCount);
}

function fetchData(){
  fetch(`${domain}/wordcloud`)
    .then(r => r.json())
    .then(data => {
      const raw = safeLower(data.wordcloud || "");
      const arr = raw.split(",").map(s => s.trim()).filter(Boolean);

      const yesCount = arr.filter(w => w === YES_TOKEN).length;
      const noCount  = arr.filter(w => w === NO_TOKEN).length;

      updateUI(yesCount, noCount);
    })
    .catch(err => console.error("Erro ao buscar dados:", err));
}

setInterval(fetchData, 1000);
