socket.onmessage = (event) => {
    try {
        const message = JSON.parse(event.data);

        // Verifica se a mensagem contém texto
        const text = message.text?.trim().toUpperCase();

        if (text) {
            console.log('Texto recebido:', text);

            // Incrementa os votos com base no texto
            if (text === 'A') votes.A++;
            if (text === 'B') votes.B++;
            if (text === 'C') votes.C++;
            
            updateUI();
        } else {
            console.error('Texto inválido ou ausente na mensagem:', message);
        }
    } catch (error) {
        console.error('Erro ao processar mensagem:', error);
    }
};
