document.addEventListener("DOMContentLoaded", function () {
  const csvUrl = 'https://docs.google.com/spreadsheets/d/1Acs-YjvII2nGi-Hx15RQlaZ3ORfVfrv974Y6u3ASZLI/export?format=csv';

  // Filtros
  let FILTRO = {
    busca: "",
    tipo: "",
    categoria: "",
    dia: "",
    espaco: "",
    classificacao: "",
    horarioIni: 0,
    horarioFim: 1439
  };
  let ALL_EVENTOS_RAW = []; 

  function minutosToHora(min) {
    let h = Math.floor(min/60);
    let m = ""+min%60;
    return h+":"+("00"+m).slice(-2);
  }
  function normalize(str) {
    return (str||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }

  // Dias do calendário
  const dias = [
    { dia: '12', semana: 'Sábado' },
    { dia: '13', semana: 'Domingo' },
    { dia: '14', semana: 'Segunda' },
    { dia: '15', semana: 'Terça' },
    { dia: '16', semana: 'Quarta' },
    { dia: '17', semana: 'Quinta' },
    { dia: '18', semana: 'Sexta' },
    { dia: '19', semana: 'Sábado' },
    { dia: '20', semana: 'Domingo' }
  ];

  const categoriaCoresBase = {
    "Varietê":              "#f7a600", // amarelo-laranja vivo
    "Espetáculo":           "#eb6226", // laranja CBMC
    "Oficina Curta":        "#2bb9b3", // azul turquesa claro
    "Oficina Continuada":   "#22566a", // azul petróleo
    "Show":                 "#d04d43", // vermelho ferrugem
    "Atividades de Cuidado":"#fff2e6", // bege (pode usar variação clara/escura)
    "Atividades do Ninho":  "#a67f5e"  // marrom claro/bege (tons de pele)
  }

  // Funções para derivar tons claros/escuros para a mesma cor base
  function hexToHsl(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(x=>x+x).join('');
    let r=parseInt(hex.substr(0,2),16)/255, g=parseInt(hex.substr(2,2),16)/255, b=parseInt(hex.substr(4,2),16)/255;
    let max=Math.max(r,g,b), min=Math.min(r,g,b), h, s, l=(max+min)/2;
    if(max==min){h=s=0;}else{
        let d=max-min;
        s=l>0.5?d/(2-max-min):d/(max+min);
        switch(max){
            case r: h=(g-b)/d+(g<b?6:0);break;
            case g: h=(b-r)/d+2;break;
            case b: h=(r-g)/d+4;break;
        }
        h/=6;
    }
    return [h*360, s*100, l*100];
  }
  function shade(color, type){
    // type = light ou dark
    let [h,s,l]=hexToHsl(color);
    if(type==='light') l = Math.min(l+32, 95);
    else l = Math.max(l-29,18);
    return `hsl(${h},${Math.round(s)}%,${Math.round(l)}%)`;
  }

  function horaStrParaMinutos(horaStr) {
    if (!horaStr) return 0;
    let [h, m] = horaStr.split(':').map(Number);
    if (isNaN(h)) return 0;
    return h * 60 + (m || 0);
  }
  function pad2(x) { return String(x).padStart(2, "0"); }

  Papa.parse(csvUrl, {
    download: true,
    header: true,
    complete: function (results) {
      const dados = results.data.filter(e => (e.Programacao || e["Programação"]));

      // Agrupa eventos: dia → lista
      const eventosPorDia = {};
      dias.forEach((d,idx)=>eventosPorDia[d.dia]=[]);
      dados.forEach(e => {
        if (!e.Dias) return;
        const tipo = (e.Evento || e["Evento"] || "Convenção").trim();
        const categoria = (e.Categoria || e["Categoria"] || "").trim();
        const diasEvento = (e.Dias + "").split(',').map(dd => dd.trim()).filter(Boolean);
        const ini = horaStrParaMinutos(e["Horário de Inicio"]);
        const fim = horaStrParaMinutos(e["Horário de Fim"]);
        diasEvento.forEach(dia => {
          if (!eventosPorDia[dia]) return;
          eventosPorDia[dia].push({
            categoria, tipo, evento: e, ini, fim, dia
          });
        });
      });

      // Agrupa por faixa de período (mesmo ini/fim)
      function agruparPorPeriodo(lista) {
        lista.sort((a,b)=>a.ini-b.ini || a.fim-b.fim);
        const grupos = [];
        let atual = [];
        let curIni = null, curFim = null;
        for (const ev of lista) {
          if (curIni==null) {
            curIni = ev.ini; curFim = ev.fim; atual.push(ev);
          } else if (ev.ini===curIni && ev.fim===curFim) {
            atual.push(ev);
          } else {
            grupos.push({ini:curIni, fim:curFim, eventos: atual});
            atual = [ev]; curIni = ev.ini; curFim = ev.fim;
          }
        }
        if (atual.length) grupos.push({ini:curIni, fim:curFim, eventos:atual});
        return grupos;
      }

      ALL_EVENTOS_RAW = dados.map(e=>{
        return {
          ...e,
          tipo : (e.Evento || e["Evento"] || "").trim(),
          categoria : (e.Categoria || e["Categoria"] || "").trim(),
          dias : (e.Dias + ""),
          diaSemana: (e["Dia da Semana"]||""),
          espaco: (e.Espaço || e["Espaço"] || ""),
          classificacao: (e["Classificação indicativa"]||""),
          horarioIniMin: horaStrParaMinutos(e["Horário de Inicio"] || ""),
          horarioFimMin: horaStrParaMinutos(e["Horário de Fim"] || ""),
          titulo: (e.Programacao || e["Programação"] || "")
        }
      });

      // Render na pagina por dia
      const grade = document.getElementById('grade');
      grade.innerHTML = '';
      dias.forEach(({dia,semana})=>{
        const faixa = eventosPorDia[dia];
        // Wrapper de tudo do dia
        const wrapperDia = document.createElement('div');
        wrapperDia.className = 'dia-wrapper';

        // Header do dia + seta dropdown
        const h2 = document.createElement('div');
        h2.className = 'titulo-dia-colapsavel';
        h2.innerHTML = `
          <span>${dia}/07 - ${semana}</span>
          <span class="seta-dia">➲</span>
        `;
        wrapperDia.appendChild(h2);

        // Wrapper para grupos desse dia
        const grupoBox = document.createElement('div');
        grupoBox.className = 'grupo-eventos-dia-wrapper';
        wrapperDia.appendChild(grupoBox);

        // Adicione os grupos
        if (!faixa.length) {
          const vazio = document.createElement('div');
          vazio.className = 'sem-eventos';
          vazio.textContent = 'Nenhum evento';
          grupoBox.appendChild(vazio);
        } else {
          const grupos = agruparPorPeriodo(faixa);
          grupos.forEach(grp=>{
            const bloco = document.createElement('div');
            bloco.className = 'grupo-eventos-dia';

            // Horário
            const horaLabel = `${pad2(Math.floor(grp.ini/60))}:${pad2(grp.ini%60)} - ${pad2(Math.floor(grp.fim/60))}:${pad2(grp.fim%60)}`;
            bloco.innerHTML = `<div class="grupo-eventos-titulo"><div>${horaLabel}</div><span>${grp.eventos.length} evento${grp.eventos.length>1? "s": ""}</span></div>`;

            // Minis por evento
            const minigrid = document.createElement('div');
            minigrid.className = "grupo-eventos-minis";
            grp.eventos.forEach(({categoria, tipo, evento: e})=>{
              const corBase = categoriaCoresBase[categoria] || "#bbb";
              const isFestival = tipo.toLowerCase().includes('festival');
              const bg = isFestival ? shade(corBase,'dark') : shade(corBase,'light');
              const fg = isFestival ? "#fff" : "#111";
              // extras:
              const camposPrincipais = [
                "Programacao", "Programação", "Dias", "Horário de Inicio", "Horário de Fim", "Dia da Semana", "Evento", "Categoria", "Classificação indicativa", "Espaço", "Elenco", "Obs"
              ];
              const extras = Object.keys(e).filter(key => !camposPrincipais.includes(key) && e[key] && e[key].trim() !== '');
              const extrasHtml = extras.map(key =>
                `<div><strong>${key.replace(/_/g, ' ')}:</strong> <div>${e[key]}</div></div>`
              ).join('');
              // Mini bloco
              const mini = document.createElement('div');
              mini.className = "mini-evento";
              mini.style.background = bg;
              mini.style.color = fg;
              mini.innerHTML = `
                <div class="mini-evento-title">${e.Programacao || e.Programação}</div>
                <div class="mini-evento-categoria">${categoria}</div>
                <div class="mini-evento-detalhes">
                  <div><strong>Tipo:</strong> <div>${tipo}</div></div>
                  ${e.Espaço ? `<div><strong>Espaço:</strong> <div>${e.Espaço}</div></div>` : ''}
                  <div><strong>Horário:</strong> <div>${e["Horário de Inicio"]} - ${e["Horário de Fim"]}</div></div>
                  ${e["Classificação indicativa"] ? `<div><strong>Classificação:</strong> <div>${e["Classificação indicativa"]}</div></div>` : ''}
                  ${extrasHtml}
                  ${e.Obs ? `<div><strong>Obs:</strong> <div>${e.Obs}</div></div>` : ''}
                </div>
              `;

              mini.addEventListener('click', function(e){
                e.stopPropagation(); // não propaga para o grupo
                mini.classList.toggle('ativo');
              });
              
              minigrid.appendChild(mini);
            });
            bloco.appendChild(minigrid);

            grupoBox.appendChild(bloco);
          });
        }
        grade.appendChild(wrapperDia);

        // Dropdown toggle
        h2.addEventListener('click', function(){
          grupoBox.classList.toggle("fechado");
          h2.querySelector('.seta-dia').classList.toggle("fechado");
        });

      });

      
      
    }
  });
});