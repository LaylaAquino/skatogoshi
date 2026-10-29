// Jogador
let tamagotchi = {
    nome: "",
    personagem: null,
    felicidade: 100,
    energia: 100,
    pov: 100,
    vivo: true,
    ultimoAcesso: null
};

// Variável para armazenar a seleção temporária do menu
let personagemSelecionado = "";

// Mapa de telas
const telas = {
    splash: document.getElementById('splashscreen'),
    menu: document.getElementById('menu'),
    carregando: document.getElementById('carregando'),
    jogo: document.getElementById('jogo')
};

// Inicia apos ler todo docuemnto (importante pois tava quebrando a leitura por conta do momento que declarei algumas funcoes onde ainda nao existiam os elementos no DOM, provavelmente posso resolver isso com o defer no script, mas por hora deixei assim)
window.addEventListener('DOMContentLoaded', () => {

    // Verifica se já existe um jogo salvo no navegador
    function verificarSave() {
        const save = localStorage.getItem('skatogoshi_save');

        if (save) {
            tamagotchi = JSON.parse(save);

            if (tamagotchi.vivo) {
                calcularTempoOffline();
                irParaTela('jogo');
                iniciarLoopTempo();
            } else {
                irParaTela('menu');
            }
        } else {
            irParaTela('menu');
        }

    }

    // Mostra a Splash Screen por 3 segundos
    setTimeout(() => {
        telas.splash.classList.add('escondido');
        verificarSave();
    }, 3000);

    // MENU seleção dos personagens
    const radiosPersonagem = document.querySelectorAll('.btn-personagem');
    const inputNome = document.getElementById('nome-skatista');
    const botaoIniciar = document.getElementById('btn-iniciar');
    const formularioMenu = document.getElementById('formulario-menu');


    function atualizarEstadoBotao() {
        const nomeFoiPreenchido = inputNome.value.trim() !== '';
        const personagemFoiSelecionado = document.querySelector('input[name="personagem"]:checked') !== null;

        if (nomeFoiPreenchido && personagemFoiSelecionado) {
            botaoIniciar.disabled = false;
        } else {
            botaoIniciar.disabled = true;
        }
    }

    inputNome.addEventListener('input', atualizarEstadoBotao);

    // Aparencia visual de seleção do personagem (CLASSE SELECIONADO)
    function aoMudarPersonagem(evento) {
        const radioSelecionado = evento.target;

        // Esse laco remove a classe 'selecionado' de todos os radios, garantindo que apenas o selecionado tenha a classe
        for (let indice = 0; indice < radiosPersonagem.length; indice++) {
            const radioPersonagem = radiosPersonagem[indice];
            radioPersonagem.classList.remove('selecionado');
        }

        // Adiciona a classe 'selecionado' ao radio que foi clicado 
        //E PEGA O ATRIBUTO DATA-PERSONA PARA SALVAR O PERSONAGEM SELECIONADO
        radioSelecionado.classList.add('selecionado');
        personagemSelecionado = radioSelecionado.getAttribute('data-persona');
        atualizarEstadoBotao();
    }

    // esse laco adiciona o evento de mudança a cada radio, chamando a função 'aoMudarPersonagem quando um radio e selecionado
    //entao cada vez que um radio for selecionado, a função 'aoMudarPersonagem' será chamada, atualizando a interface e o estado do botão de iniciar
    for (let indice = 0; indice < radiosPersonagem.length; indice++) {
        const radioPersonagem = radiosPersonagem[indice];
        radioPersonagem.addEventListener('change', aoMudarPersonagem);
    }
    atualizarEstadoBotao();

    // GAMEPLAY botoes de ação
    formularioMenu.addEventListener('submit', iniciarNovoJogo);
    document.getElementById('btn-manobra').addEventListener('click', mandarManobra);
    document.getElementById('btn-redbull').addEventListener('click', tomarRedbull);
    document.getElementById('btn-arroto').addEventListener('click', arrotarAltao);
    document.getElementById('btn-reset').addEventListener('click', resetarSave);
});



// Navegação simples entre as telas
function irParaTela(telaAlvo) {
    Object.keys(telas).forEach(key => telas[key].classList.add('escondido'));
    telas[telaAlvo].classList.remove('escondido');
    if (telaAlvo === 'jogo') atualizarInterface();
}

// Inicia o jogo para um novo skatista
function iniciarNovoJogo(evento) {

    // !!IMPORTANTISSIMO!! IMPEDE QUE O FORMULARIO RECARREGUE A PAGINA
    evento.preventDefault();

    const inputNome = document.getElementById('nome-skatista').value;
    tamagotchi.nome = inputNome.trim() !== "" ? inputNome : "Gugu";
    tamagotchi.personagem = personagemSelecionado; // Atribui o skatista escolhido
    tamagotchi.felicidade = 100;
    tamagotchi.energia = 100;
    tamagotchi.pov = 100;
    tamagotchi.vivo = true;
    tamagotchi.ultimoAcesso = Date.now();

    irParaTela('carregando');

    setTimeout(() => {
        salvarJogo();
        irParaTela('jogo');
        iniciarLoopTempo();
    }, 1500);
}

// Configurações do relógio do jogo
let gameLoop;

function iniciarLoopTempo() {
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(simularTempo, 1000);
}

function simularTempo() {
    if (!tamagotchi.vivo) return;

    tamagotchi.felicidade -= (100 / 7200);   // Zera em 2 horas
    tamagotchi.energia -= (100 / 14400);    // Zera em 4 horas
    tamagotchi.pov -= (100 / 3600);         // Zera em 1 hora

    verificarSaude();
    salvarJogo();
    atualizarInterface();
}

function calcularTempoOffline() {
    if (!tamagotchi.ultimoAcesso) return;

    const agora = Date.now();
    const milissegundosFora = agora - tamagotchi.ultimoAcesso;
    const segundosFora = Math.floor(milissegundosFora / 1000);

    const taxaFelicidadeOffline = (100 / 7200) / 5;
    const taxaEnergiaOffline = (100 / 14400) / 5;
    const taxaPovOffline = (100 / 3600) / 5;

    tamagotchi.felicidade -= segundosFora * 0.2 * (100 / 7200);
    tamagotchi.energia -= segundosFora * taxaEnergiaOffline;
    tamagotchi.pov -= segundosFora * taxaPovOffline;

    verificarSaude();

    if (segundosFora > 60 && tamagotchi.vivo) {
        alert(`Você ficou longe da pista por ${Math.floor(segundosFora / 60)} minutos! Os status caíram bem mais devagar.`);
    }
}

function verificarSaude() {
    tamagotchi.felicidade = Math.max(0, tamagotchi.felicidade);
    tamagotchi.energia = Math.max(0, tamagotchi.energia);
    tamagotchi.pov = Math.max(0, tamagotchi.pov);

    if (tamagotchi.felicidade <= 0 || tamagotchi.energia <= 0 || tamagotchi.pov <= 0) {
        tamagotchi.vivo = false;
        clearInterval(gameLoop);
        alert(`${tamagotchi.nome} (${tamagotchi.personagem}) cansou do rolê e foi embora!`);
        resetarSave();
    }
}

function salvarJogo() {
    tamagotchi.ultimoAcesso = Date.now();
    localStorage.setItem('skatogoshi_save', JSON.stringify(tamagotchi));
}

function atualizarInterface() {
    let emoji = "🐭";
    if (tamagotchi.personagem === "Gregor") emoji = "🪳";
    if (tamagotchi.personagem === "Pomba Rola") emoji = "🐦";

    // Atualiza os cabeçalhos de texto
    document.getElementById('exibir-nome').innerText = `Skatista: ${tamagotchi.nome}`;
    document.getElementById('exibir-personagem').innerText = `Skatista Selecionado: ${emoji} ${tamagotchi.personagem}`;

    // Atualiza o valor visual das barras de progresso (aceita números quebrados)
    document.getElementById('barra-felicidade').value = tamagotchi.felicidade;
    document.getElementById('barra-energia').value = tamagotchi.energia;
    document.getElementById('barra-pov').value = tamagotchi.pov;

    // Formata o texto com 2 casas decimais e troca o ponto por vírgula (ex: 88.25 vira 88,25)
    document.getElementById('texto-felicidade').innerText = `${tamagotchi.felicidade.toFixed(2).replace('.', ',')}%`;
    document.getElementById('texto-energia').innerText = `${tamagotchi.energia.toFixed(2).replace('.', ',')}%`;
    document.getElementById('texto-pov').innerText = `${tamagotchi.pov.toFixed(2).replace('.', ',')}%`;
}

// Ações do Skatista
function mandarManobra() {
    if (!tamagotchi.vivo || tamagotchi.energia <= 0) return;
    tamagotchi.felicidade = Math.min(100, tamagotchi.felicidade + 5);
    tamagotchi.energia = Math.max(0, tamagotchi.energia - 1);

    console.log(`${tamagotchi.nome} mandou um 50-50!`);
    salvarJogo();
    atualizarInterface();
}

function tomarRedbull() {
    if (!tamagotchi.vivo) return;
    tamagotchi.energia = Math.min(100, tamagotchi.energia + 10);

    console.log(`${tamagotchi.nome} tomou um Redbull!`);
    salvarJogo();
    atualizarInterface();
}

function arrotarAltao() {
    if (!tamagotchi.vivo) return;
    tamagotchi.felicidade = Math.min(100, tamagotchi.felicidade + 1);
    tamagotchi.energia = Math.min(100, tamagotchi.energia + 1);

    console.log(`${tamagotchi.nome} BURRP!`);
    salvarJogo();
    atualizarInterface();
}

function resetarSave() {
    localStorage.removeItem('skatogoshi_save');
    clearInterval(gameLoop);
    irParaTela('menu');
}
