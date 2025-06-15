const url = 'https://spreadsheets.google.com/feeds/list/1Acs-YjvII2nGi-Hx15RQlaZ3ORfVfrv974Y6u3ASZLI/od6/public/values?alt=json';

fetch(url)
  .then(response => response.json())
  .then(data => {
    const lista = document.getElementById('lista');
    const entries = data.feed.entry;

    entries.forEach(entry => {
      const item = document.createElement('li');
      // substitua os nomes das colunas abaixo conforme aparecem na planilha (em minúsculo e sem espaço)
      const horario = entry.gsx$horário.$t;
      const atividade = entry.gsx$atividade.$t;
      const local = entry.gsx$local.$t;

      item.textContent = `${horario} – ${atividade} (${local})`;
      lista.appendChild(item);
    });
  })
  .catch(error => {
    console.error('Erro ao carregar a planilha:', error);
  });