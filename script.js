const csvUrl = 'https://docs.google.com/spreadsheets/d/1Acs-YjvII2nGi-Hx15RQlaZ3ORfVfrv974Y6u3ASZLI/export?format=csv';

function horaStrParaMinutos(horaStr) {
  const [h, m] = horaStr.split(':').map(Number);
  return h * 60 + m;
}

Papa.parse(csvUrl, {
  download: true,
  header: true,
  complete: function(results) {
    const dados = results.data;

    const diasUnicos = [...new Set(dados.map(d => d.Dias))].filter(d => d).sort((a, b) => Number(a) - Number(b));
    const horarios = [...new Set(dados.flatMap(d => [d["Horário de Inicio"], d["Horário de Fim"]]))]
      .filter(h => h)
      .sort((a, b) => horaStrParaMinutos(a) - horaStrParaMinutos(b));

    let tabela = '<table border="1" cellspacing="0" cellpadding="0"><thead><tr><th>Horário</th>';
    diasUnicos.forEach(dia => {
      const linha = dados.find(d => d.Dias === dia);
      tabela += `<th>${dia}<br>${linha["Dia da Semana"]}</th>`;
    });
    tabela += '</tr></thead><tbody>';

    horarios.forEach(horario => {
      tabela += `<tr><td style="padding: 4px; text-align: center;">${horario}</td>`;
      diasUnicos.forEach(dia => {
        const evento = dados.find(d => d["Horário de Inicio"] === horario && d.Dias === dia);
        if (evento) {
          const linhas = [
            `<strong>${evento.Programação}</strong>`,
            `${evento.Evento} – ${evento.Categoria}`,
            evento["Classificação indicativa"] ? `Classificação: ${evento["Classificação indicativa"]}` : null,
            evento.Espaço || null,
          ].filter(Boolean);
          tabela += `<td style="padding: 4px; text-align: left;">${linhas.join('<br>')}</td>`;
        } else {
          tabela += '<td></td>';
        }
      });
      tabela += '</tr>';
    });

    tabela += '</tbody></table>';
    document.getElementById('saida').innerHTML = tabela;
  }
});