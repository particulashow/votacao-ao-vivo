// Inicializa os votos
const votes = { A: 0, B: 0, C: 0 };

// Conecta ao WebSocket do StreamNinja
const socket = new WebSocket('wss://socialstream.ninja/socket');

// Atualiza os votos no ecrã
function updateUI() {
    document.getElementById('voteA').textContent = votes.A;
    document.getElementById('voteB').textContent = votes.B;
    document.getElementById('voteC').textContent = votes.C;
}

// Processa mensagens recebidas do chat
socket.onmessage = (event) => {
    const message = JSON.parse(event.data);

    // Deteta votos com base no texto da mensagem
    const text = message.text.toUpperCase().trim();
    if (text === 'A') votes.A += 1;
    if (text === 'B') votes.B += 1;
    if (text === 'C') votes.C += 1;

    // Atualiza o ecrã
    updateUI();
};

// Log de conexão
socket.onopen = () => console.log('Conectado ao StreamNinja!');
socket.onerror = (error) => console.error('Erro no WebSocket:', error);
