// Estado persistido do jogador e status atuais do rolê.
let tamagotchi = {
    nome: "",
    personagem: null,
    vibe: 100,
    energia: 100,
    crew: 100,
    vivo: true,
    ultimoAcesso: null
};

// Seleção temporária até o formulário iniciar um novo jogo.
let personagemSelecionado = "";

// Sprites usados nos cartões do menu e na pista.
const spritesPersonagens = {
    "Ratinha":
        "./img/craftpix-net-563568-free-wraith-tiny-style-2d-sprites/PNG/Wraith_03/PNG%20Sequences/Idle/Wraith_03_Idle_000.png",
    "Gregor":
        "./img/craftpix-net-563568-free-wraith-tiny-style-2d-sprites/PNG/Wraith_01/PNG%20Sequences/Idle/Wraith_01_Idle_000.png",
    "Pomba Rola":
        "./img/craftpix-net-563568-free-wraith-tiny-style-2d-sprites/PNG/Wraith_02/PNG%20Sequences/Idle/Wraith_02_Idle_000.png"
};

// Balanceamento: prazos de desgaste e efeitos de cada ação.
const regrasDoJogo = {
    segundosParaZerarVibe: 3 * 24 * 60 * 60,
    segundosParaZerarCrew: 7 * 24 * 60 * 60,
    manobra: { vibe: 20, energia: 10 },
    descanso: { energia: 30 },
    ensino: { crew: 20, energia: 15 },
    statusMaximo: 100
};

const telas = {
    splash: document.getElementById('splashscreen'),
    menu: document.getElementById('menu'),
    carregando: document.getElementById('carregando'),
    jogo: document.getElementById('jogo')
};

// Inicialização da interface e associação dos controles às ações.
window.addEventListener('DOMContentLoaded', () => {

    // Restaura um save válido; sem save, abre o menu para começar.
    function verificarSave() {
        const save = carregarJogoSalvo();

        if (!save) {
            irParaTela('menu');
            return;
        }

        tamagotchi = save;
        if (!tamagotchi.vivo) {
            localStorage.removeItem('skatogoshi_save');
            irParaTela('menu');
            return;
        }

        if (!calcularTempoOffline()) return;

        irParaTela('jogo');
        iniciarLoopTempo();
    }

    function avancarSplash() {
        if (telas.splash.classList.contains('escondido')) return;
        telas.splash.classList.add('escondido');
        verificarSave();
    }

    telas.splash.addEventListener('click', avancarSplash);
    telas.splash.addEventListener('keydown', evento => {
        if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault();
            avancarSplash();
        }
    });

    const radiosPersonagem = document.querySelectorAll('.btn-personagem');
    const inputNome = document.getElementById('nome-skatista');
    const botaoIniciar = document.getElementById('btn-iniciar');
    const formularioMenu = document.getElementById('formulario-menu');

    // Só permite iniciar quando nickname e personagem estiverem definidos.
    function atualizarEstadoBotao() {
        const nomeFoiPreenchido = inputNome.value.trim() !== '';
        const personagemFoiSelecionado = document.querySelector('input[name="personagem"]:checked') !== null;

        botaoIniciar.disabled = !(nomeFoiPreenchido && personagemFoiSelecionado);
    }

    inputNome.addEventListener('input', atualizarEstadoBotao);

    // Guarda a opção escolhida e atualiza a disponibilidade do botão de início.
    function aoMudarPersonagem(evento) {
        const radioSelecionado = evento.currentTarget;
        personagemSelecionado = radioSelecionado.getAttribute('data-persona');
        atualizarEstadoBotao();
    }

    radiosPersonagem.forEach(radio => radio.addEventListener('change', aoMudarPersonagem));
    atualizarEstadoBotao();

    formularioMenu.addEventListener('submit', iniciarNovoJogo);
    document.getElementById('btn-manobra').addEventListener('click', mandarManobra);
    document.getElementById('btn-descansar').addEventListener('click', descansar);
    document.getElementById('btn-ensinar').addEventListener('click', ensinarManobra);
    document.getElementById('btn-reset').addEventListener('click', resetarSave);
});


// NAVEGAÇÃO ENTRE TELAS
function irParaTela(telaAlvo) {
    Object.keys(telas).forEach(key => telas[key].classList.add('escondido'));
    telas[telaAlvo].classList.remove('escondido');
    if (telaAlvo === 'jogo') atualizarInterface();
}

// SAVE: leitura, compatibilidade e validação
function carregarJogoSalvo() {
    const textoSave = localStorage.getItem('skatogoshi_save');
    if (!textoSave) return null;

    let save;
    try {
        save = JSON.parse(textoSave);
    } catch (erro) {
        if (!(erro instanceof SyntaxError)) throw erro;
        removerSaveInvalido('O save está corrompido e foi removido.');
        return null;
    }

    const estado = normalizarSave(save);
    if (!estado) {
        removerSaveInvalido('O save é inválido e foi removido.');
        return null;
    }

    return estado;
}

function normalizarSave(save) {
    if (!save || typeof save !== 'object' || Array.isArray(save)) return null;

    // Mantém a compatibilidade com os nomes antigos dos status salvos.
    const estado = {
        nome: save.nome,
        personagem: save.personagem,
        vibe: save.vibe ?? save.felicidade,
        energia: save.energia,
        crew: save.crew ?? save.pov,
        vivo: save.vivo,
        ultimoAcesso: save.ultimoAcesso
    };

    const statusValidos = ['vibe', 'energia', 'crew'].every(status =>
        Number.isFinite(estado[status])
        && estado[status] >= 0
        && estado[status] <= regrasDoJogo.statusMaximo
    );
    const acessoValido = estado.ultimoAcesso === null
        || (Number.isFinite(estado.ultimoAcesso) && estado.ultimoAcesso > 0);

    if (
        typeof estado.nome !== 'string'
        || estado.nome.trim() === ''
        || !Object.prototype.hasOwnProperty.call(spritesPersonagens, estado.personagem)
        || !statusValidos
        || typeof estado.vivo !== 'boolean'
        || !acessoValido
    ) {
        return null;
    }

    if (estado.ultimoAcesso === null) estado.ultimoAcesso = Date.now();
    return estado;
}

function removerSaveInvalido(mensagem) {
    localStorage.removeItem('skatogoshi_save');
    alert(`${mensagem} Você pode começar um novo rolê.`);
}

// CRIAÇÃO DE JOGO
function iniciarNovoJogo(evento) {
    evento.preventDefault();

    tamagotchi = {
        nome: document.getElementById('nome-skatista').value.trim(),
        personagem: personagemSelecionado,
        vibe: regrasDoJogo.statusMaximo,
        energia: regrasDoJogo.statusMaximo,
        crew: regrasDoJogo.statusMaximo,
        vivo: true,
        ultimoAcesso: Date.now()
    };

    irParaTela('carregando');

    setTimeout(() => {
        salvarJogo();
        irParaTela('jogo');
        iniciarLoopTempo();
    }, 1500);
}

// TEMPO, DECAIMENTO DOS STATUS E FIM DE JOGO
let gameLoop;

function iniciarLoopTempo() {
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(simularTempo, 1000);
}

function simularTempo() {
    if (!tamagotchi.vivo) return;

    if (!atualizarStatusPeloTempo()) return;
    salvarJogo();
    atualizarInterface();
}

function calcularTempoOffline() {
    const segundosFora = aplicarDesgastePorTempo();
    if (!verificarSaude()) return;

    salvarJogo();
    if (segundosFora >= 60 * 60) {
        alert(`Você ficou longe da pista por ${Math.floor(segundosFora / 60)} minutos. A Vibe e a Crew sentiram sua falta!`);
    }
    return true;
}

// Aplica a perda proporcional ao tempo decorrido desde o último save.
function aplicarDesgastePorTempo(agora = Date.now()) {
    const ultimoAcesso = Number(tamagotchi.ultimoAcesso);
    if (!Number.isFinite(ultimoAcesso) || ultimoAcesso <= 0) {
        tamagotchi.ultimoAcesso = agora;
        return 0;
    }

    const segundosPassados = Math.max(0, agora - ultimoAcesso) / 1000;
    tamagotchi.vibe -= segundosPassados * (regrasDoJogo.statusMaximo / regrasDoJogo.segundosParaZerarVibe);
    tamagotchi.crew -= segundosPassados * (regrasDoJogo.statusMaximo / regrasDoJogo.segundosParaZerarCrew);
    tamagotchi.ultimoAcesso = agora;

    return segundosPassados;
}

function atualizarStatusPeloTempo(agora = Date.now()) {
    aplicarDesgastePorTempo(agora);
    return verificarSaude();
}

function verificarSaude() {
    tamagotchi.vibe = Math.max(0, Math.min(regrasDoJogo.statusMaximo, tamagotchi.vibe));
    tamagotchi.energia = Math.max(0, Math.min(regrasDoJogo.statusMaximo, tamagotchi.energia));
    tamagotchi.crew = Math.max(0, Math.min(regrasDoJogo.statusMaximo, tamagotchi.crew));

    if (tamagotchi.vibe <= 0 || tamagotchi.crew <= 0) {
        tamagotchi.vivo = false;
        clearInterval(gameLoop);
        const motivoGameOver = tamagotchi.vibe <= 0
            ? 'A Vibe acabou'
            : 'A Crew se desfez';
        alert(`${motivoGameOver}! ${tamagotchi.personagem} largou o skate. Game over!`);
        resetarSave();
        return false;
    }

    return true;
}

// Persiste o estado atual para continuar o rolê na próxima visita.
function salvarJogo() {
    localStorage.setItem('skatogoshi_save', JSON.stringify(tamagotchi));
}

// INTERFACE: sincroniza nomes, sprite, barras e disponibilidade das ações.
function atualizarInterface() {
    const spritePersonagem = spritesPersonagens[tamagotchi.personagem];
    const imagemPersonagem = document.getElementById('personagem-no-cenario');

    document.getElementById('exibir-nome').innerText = tamagotchi.nome;
    document.getElementById('exibir-personagem').innerText = tamagotchi.personagem;
    imagemPersonagem.src = spritePersonagem;
    imagemPersonagem.alt = `${tamagotchi.personagem} na pista`;
    document.getElementById('cenario-jogo').setAttribute(
        'aria-label',
        `Cenário: pista de skate no esgoto. ${tamagotchi.nome} e ${tamagotchi.personagem} estão curtindo um rolê de skate e patins.`
    );

    document.getElementById('barra-vibe').value = tamagotchi.vibe;
    document.getElementById('barra-energia').value = tamagotchi.energia;
    document.getElementById('barra-crew').value = tamagotchi.crew;

    document.getElementById('texto-vibe').innerText = `${Math.round(tamagotchi.vibe)}%`;
    document.getElementById('texto-energia').innerText = `${Math.round(tamagotchi.energia)}%`;
    document.getElementById('texto-crew').innerText = `${Math.round(tamagotchi.crew)}%`;

    document.getElementById('btn-manobra').disabled = tamagotchi.energia < regrasDoJogo.manobra.energia;
    document.getElementById('btn-ensinar').disabled = tamagotchi.energia < regrasDoJogo.ensino.energia;
}

// AÇÕES DO JOGADOR: cada ação altera os status e persiste o resultado.
function mandarManobra() {
    if (!tamagotchi.vivo || tamagotchi.energia < regrasDoJogo.manobra.energia
        || !atualizarStatusPeloTempo()) return;
    tamagotchi.vibe = Math.min(regrasDoJogo.statusMaximo, tamagotchi.vibe + regrasDoJogo.manobra.vibe);
    tamagotchi.energia -= regrasDoJogo.manobra.energia;

    console.log(`${tamagotchi.nome} mandou uma manobra! A Vibe subiu.`);
    salvarJogo();
    atualizarInterface();
}

function descansar() {
    if (!tamagotchi.vivo || !atualizarStatusPeloTempo()) return;
    tamagotchi.energia = Math.min(regrasDoJogo.statusMaximo, tamagotchi.energia + regrasDoJogo.descanso.energia);

    console.log(`${tamagotchi.nome} descansou e recuperou Energia.`);
    salvarJogo();
    atualizarInterface();
}

function ensinarManobra() {
    if (!tamagotchi.vivo || tamagotchi.energia < regrasDoJogo.ensino.energia
        || !atualizarStatusPeloTempo()) return;
    tamagotchi.crew = Math.min(regrasDoJogo.statusMaximo, tamagotchi.crew + regrasDoJogo.ensino.crew);
    tamagotchi.energia -= regrasDoJogo.ensino.energia;

    console.log(`${tamagotchi.nome} ensinou uma manobra e fortaleceu a Crew.`);
    salvarJogo();
    atualizarInterface();
}

// Apaga o estado salvo e retorna à seleção de personagem.
function resetarSave() {
    localStorage.removeItem('skatogoshi_save');
    clearInterval(gameLoop);
    irParaTela('menu');
}