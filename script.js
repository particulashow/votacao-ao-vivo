// Inicializa os votos
const votes = { A: 0, B: 0, C: 0 };

// Conecta ao WebSocket do StreamNinja
const socket = new WebSocket('wss://socialstream.ninja/socket');

// Atualiza os votos e as barras de progresso
function updateUI() {
    const totalVotes = votes.A + votes.B + votes.C;

    // Atualiza os valores
    document.getElementById('voteA').textContent = votes.A;
    document.getElementById('voteB').textContent = votes.B;
    document.getElementById('voteC').textContent = votes.C;

    // Atualiza as barras de progresso
    document.getElementById('progressA').style.width = totalVotes > 0 ? `${(votes.A / totalVotes) * 100}%` : '0%';
    document.getElementById('progressB').style.width = totalVotes > 0 ? `${(votes.B / totalVotes) * 100}%` : '0%';
    document.getElementById('progressC').style.width = totalVotes > 0 ? `${(votes.C / totalVotes) * 100}%` : '0%';
}

// Processa mensagens recebidas do WebSocket
socket.onmessage = (event) => {
    try {
        const message = JSON.parse(event.data);

        // Captura o texto do comentário
        const text = message.text?.trim().toUpperCase();

        // Incrementa os votos com base no texto
        if (text === 'A') votes.A++;
        if (text === 'B') votes.B++;
        if (text === 'C') votes.C++;

        updateUI();
    } catch (error) {
        console.error('Erro ao processar mensagem:', error);
    }
};

// Log de conexão
socket.onopen = () => console.log('Ligação ao WebSocket estabelecida!');
socket.onerror = (error) => console.error('Erro no WebSocket:', error);
