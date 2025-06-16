const csvUrl = 'https://docs.google.com/spreadsheets/d/1Acs-YjvII2nGi-Hx15RQlaZ3ORfVfrv974Y6u3ASZLI/export?format=csv';

function horaStrParaMinutos(horaStr) {
  const [h, m] = horaStr.split(':').map(Number);
  return h * 60 + m;
}

// Gera intervalos de tempo em minutos
function gerarSlots(horaMin, horaMax, passo = 30) {
  const slots = [];
  for(let min = horaMin; min < horaMax; min += passo) {
    slots.push(min);
  }
  return slots;
}

function ativaEventoMobile() {
  // Só em telas pequenas
  if (window.innerWidth < 700) {
    document.querySelectorAll('.evento').forEach(ev => {
      ev.classList.remove('ativo');
      let evtClone = ev.cloneNode(true);
      ev.parentNode.replaceChild(evtClone, ev);
    });

    document.querySelectorAll('.evento').forEach(ev => {
      ev.addEventListener('click', function(e) {
        document.querySelectorAll('.evento.ativo').forEach(el => { if (el !== ev) el.classList.remove('ativo'); });
        ev.classList.toggle('ativo');
        e.stopPropagation();
      });
    });

    // Clicar fora de .evento fecha qualquer aberto
    document.addEventListener('click', fechaTodosEventosMobile);

  } else {
    document.querySelectorAll('.evento').forEach(ev => ev.classList.remove('ativo'));
    document.removeEventListener('click', fechaTodosEventosMobile);
  }
}

// Função para fechar todos 
function fechaTodosEventosMobile(e) {
  if (!e.target.closest('.evento')) {
    document.querySelectorAll('.evento.ativo').forEach(ev => ev.classList.remove('ativo'));
  }
}

Papa.parse(csvUrl, {
  download: true,
  header: true,
  complete: function(results) {
    const dados = results.data.filter(e => e.Programacao || e.Programação);

    const dias = [...new Set(dados.map(d => d.Dias))].filter(Boolean).sort((a, b) => Number(a) - Number(b));
    const horaMin = Math.min(...dados.map(d => horaStrParaMinutos(d["Horário de Inicio"])));
    const horaMax = Math.max(...dados.map(d => horaStrParaMinutos(d["Horário de Fim"]))) + 1;
    const slots = gerarSlots(horaMin, horaMax, 30); // Intervalo de 30min

    const grade = document.getElementById('grade');
    grade.innerHTML = '';

    // Cabeçalho
    const cabecalho = document.createElement('div');
    cabecalho.className = 'cabecalho';

    const horarioCol = document.createElement('div');
    horarioCol.className = 'col-horario-cabecalho';
    horarioCol.textContent = '';
    cabecalho.appendChild(horarioCol);

    dias.forEach(dia => {
      const coluna = document.createElement('div');
      coluna.className = 'coluna-dia';
      const info = dados.find(d => d.Dias === dia);
      coluna.innerHTML = `<strong>${dia}</strong><br>${info["Dia da Semana"]}`;
      cabecalho.appendChild(coluna);
    });
    grade.appendChild(cabecalho);

    // Corpo
    const corpo = document.createElement('div');
    corpo.className = 'corpo';
    corpo.style.gridTemplateColumns = `80px repeat(${dias.length}, 1fr)`;
    cabecalho.style.gridTemplateColumns = corpo.style.gridTemplateColumns;
    // corpo.style.gridTemplateRows = `repeat(${slots.length}, 1fr)`;

    // Coluna dos horários
    slots.forEach((min, i) => {
      const div = document.createElement('div');
      div.className = 'cell cell-horario';
      const h = Math.floor(min/60);
      const m = String(min%60).padStart(2,'0');
      div.textContent = `${h}:${m}`;
      div.style.gridRow = i+1;
      div.style.gridColumn = 1;
      corpo.appendChild(div);
    });

    // Criação das células de dias/horários
    dias.forEach((dia, diaIdx) => {
      slots.forEach((min, slotIdx) => {
        const cell = document.createElement('div');
        cell.className = 'cell cell-dia';
        cell.style.gridRow = slotIdx+1;
        cell.style.gridColumn = diaIdx+2;
        cell.dataset.dia = dia;
        cell.dataset.min = min;
        corpo.appendChild(cell);
      });
    });

    // Posicionamento dos eventos
    dados.forEach(e => {
      const ini = horaStrParaMinutos(e["Horário de Inicio"]);
      const fim = horaStrParaMinutos(e["Horário de Fim"]);

      const dia = e.Dias;
      const info = dados.find(d => d.Dias === dia);

      // Slot inicial
      let slotIni = null;
      for (let i=0; i < slots.length; ++i) {
        if (ini >= slots[i] && (i==slots.length-1 || ini < slots[i+1])) slotIni = i;
      }
      const cellSelector = `.cell-dia[data-dia="${dia}"][data-min="${slots[slotIni]}"]`;
      const cell = corpo.querySelector(cellSelector);

      const bloco = document.createElement('div');
      bloco.className = 'evento';
      bloco.innerHTML = `
        <div class="evento-title">${e.Programacao || e.Programação}</div>
        <div class="evento-detalhes">
          <div class="evento-det-title">${e.Programacao || e.Programação}</div>
          <div class="evento-data">${info["Dia da Semana"] ? info["Dia da Semana"] : ""} - ${dia}</div>
          ${e.Evento ? `<div><strong>Evento:</strong> <div class="evento-nome">${e.Evento}</div></div>` : ''}
          ${e.Categoria ? `<div><strong>Categoria:</strong> <div class="evento-categoria">${e.Categoria}</div></div>` : ''}
          <div>
            <strong>Horário:</strong> <div class="evento-hora">${e["Horário de Inicio"]} - ${e["Horário de Fim"]}</div>
          </div>
          ${e["Classificação indicativa"] ? `<div><strong>Classificação:</strong> <div class="evento-classificacao">${e["Classificação indicativa"]}</div></div>` : ''}
          ${e.Espaço ? `<div><strong>Espaço:</strong> <div class="evento-espaco">${e.Espaço}</div></div>` : ''}
        </div>
      `;

      if (cell) cell.appendChild(bloco);
    });

    grade.appendChild(corpo);

    ativaEventoMobile();
  }
});

window.addEventListener('resize', ativaEventoMobile);