const csvUrl = 'https://docs.google.com/spreadsheets/d/1Acs-YjvII2nGi-Hx15RQlaZ3ORfVfrv974Y6u3ASZLI/export?format=csv';

function horaStrParaMinutos(horaStr) {
  const [h, m] = horaStr.split(':').map(Number);
  return h * 60 + m;
}

Papa.parse(csvUrl, {
  download: true,
  header: true,
  complete: function(results) {
    const dados = results.data.filter(e => e.Programacao || e.Programação);

    const dias = [...new Set(dados.map(d => d.Dias))].filter(Boolean).sort((a, b) => Number(a) - Number(b));
    const horaMin = Math.min(...dados.map(d => horaStrParaMinutos(d["Horário de Inicio"])));
    const horaMax = Math.max(...dados.map(d => horaStrParaMinutos(d["Horário de Fim"])));

    const grade = document.getElementById('grade');
    grade.style.setProperty('--total-minutos', horaMax - horaMin);
    grade.innerHTML = '';

    const cabecalho = document.createElement('div');
    cabecalho.className = 'cabecalho';
    dias.forEach(dia => {
      const coluna = document.createElement('div');
      coluna.className = 'coluna-dia';
      const info = dados.find(d => d.Dias === dia);
      coluna.innerHTML = `<strong>${dia}</strong><br>${info["Dia da Semana"]}`;
      cabecalho.appendChild(coluna);
    });
    grade.appendChild(cabecalho);

    const corpo = document.createElement('div');
    corpo.className = 'corpo';
    dias.forEach(dia => {
      const coluna = document.createElement('div');
      coluna.className = 'coluna';
      const eventos = dados.filter(d => d.Dias === dia);
      eventos.forEach(e => {
        const bloco = document.createElement('div');
        bloco.className = 'evento';

        const ini = horaStrParaMinutos(e["Horário de Inicio"]);
        const fim = horaStrParaMinutos(e["Horário de Fim"]);
        const duracao = fim - ini;

        bloco.style.setProperty('--inicio', ini - horaMin);
        bloco.style.setProperty('--duracao', duracao);

        bloco.innerHTML = `
          <strong>${e.Programacao || e.Programação}</strong><br>
          ${e.Evento} – ${e.Categoria}<br>
          ${e["Classificação indicativa"] ? `Classificação: ${e["Classificação indicativa"]}<br>` : ''}
          ${e.Espaço || ''}
        `;

        coluna.appendChild(bloco);
      });
      corpo.appendChild(coluna);
    });
    grade.appendChild(corpo);
  }
});
