// Configurações do WebSocket e parâmetros iniciais
let params = new URLSearchParams(window.location.search);
let optionALabel = params.get('optionA') || 'Opção A';
let optionBLabel = params.get('optionB') || 'Opção B';
let domain = params.get('domain') || 'http://localhost:3900';

let root = am5.Root.new("chartdiv");

// Aplica o tema animado
root.setThemes([am5themes_Animated.new(root)]);

// Cria o gráfico de pizza
let pieChart = root.container.children.push(am5percent.PieChart.new(root, {
  innerRadius: am5.percent(50),
}));

// Cria a série de dados
let pieSeries = pieChart.series.push(am5percent.PieSeries.new(root, {
  valueField: "value",
  categoryField: "category",
  alignLabels: false,
}));

// Configurações de estilo para os rótulos e fatias
pieSeries.labels.template.setAll({
  textType: "circular",
  fontSize: 30,
  fill: am5.color("#fff"),
  fontWeight: "bold",
});

pieSeries.slices.template.setAll({
  strokeOpacity: 0,
});

let data = [
  { category: optionALabel, value: 1, settings: { fill: am5.color("#4caf50") } },
  { category: optionBLabel, value: 1, settings: { fill: am5.color("#f44336") } }
];

pieSeries.data.setAll(data);

// Função para atualizar os dados do gráfico
function updateData(optionACount, optionBCount) {
  pieSeries.data.setAll([
    { category: optionALabel, value: optionACount > 0 ? optionACount : 0.01 },
    { category: optionBLabel, value: optionBCount > 0 ? optionBCount : 0.01 }
  ]);
}

// Fetch inicial para limpar e carregar os dados
fetch(`${domain}/clear-chat?words=${optionALabel},${optionBLabel}`)
  .then(() => setTimeout(fetchData, 500));

// Função para buscar os dados do servidor
function fetchData() {
  fetch(`${domain}/wordcloud`)
    .then(response => response.json())
    .then(data => {
      let chatHistory = data.wordcloud.toLowerCase().split(',');
      let optionACount = chatHistory.filter(word => word.trim() === optionALabel.toLowerCase()).length;
      let optionBCount = chatHistory.filter(word => word.trim() === optionBLabel.toLowerCase()).length;

      updateData(optionACount, optionBCount);
    })
    .catch(error => console.error("Erro ao buscar dados:", error));
}

// Atualiza os dados a cada 1 segundo
setInterval(fetchData, 1000);
