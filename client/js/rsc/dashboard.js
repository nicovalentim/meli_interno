import { graficosBarra, graficosLinha, graficosPizza, graficosRosca } from "./dashboardGraficos.js";
import { dashboardBanco, dashboardCandidaturasArea, dashboardDados, dashboardMediaArea } from "./dashboardBanco.js";

function extrairDataSegura(valorData) {
    if (!valorData) return new Date(NaN);
    if (typeof valorData === 'string') {
        return new Date(valorData.replace(" ", "T"));
    }
    return new Date(valorData);
}

export async function graficos() {
    const admin = localStorage.getItem("tipo") === "admin";
    if (!admin) {
        alert("Acesso negado. Esta página é restrita para administradores.");
        window.location.href = "login.html";
        return;
    }

    const email = localStorage.getItem('email'); 
    const dados = await dashboardBanco(email);
    if (!dados) return;

    const vagasTotal = document.getElementById("vagasTotal");
    vagasTotal.innerText = dados.vagas.length;

    const vagasAreaPop = document.getElementById("vagasAreaPop");
    const dadosArea = dashboardDados(dados.vagas, 'area');
    let indiceMaisPopular = 0;
    let maxVagas = 0;

    dadosArea.valores.forEach((quantidade, index) => {
        if (quantidade > maxVagas) {
            maxVagas = quantidade;
            indiceMaisPopular = index;
        }
    });

    const vagasPopSigla = dadosArea.rotulos[indiceMaisPopular];
    let vagasPop;
    switch (vagasPopSigla) {
        case "ADM": vagasPop = "Administração"; break;
        case "COM": vagasPop = "Comércio"; break;
        case "ENG": vagasPop = "Engenharia"; break;
        case "LOG": vagasPop = "Logística"; break;
        case "MKT": vagasPop = "Marketing"; break;
        case "TI": vagasPop = "Tecnologia da Informação"; break;
        default: vagasPop = "Não definido.";
    }
    vagasAreaPop.innerText = `${vagasPop} \n (${maxVagas} vagas)`;

    const usuariosTotal = document.getElementById("usuariosTotal");
    usuariosTotal.innerText = dados.usuarios.length + "²";

    const mediaSalarial = document.getElementById("mediaSalarial");
    const salarios = dados.vagas.map(vaga => vaga.salario).filter(salario => salario > 0);
    const media = salarios.reduce((acc, curr) => acc + curr, 0) / (salarios.length || 1);
    mediaSalarial.innerText = `R$ ${media.toFixed(2)}`;

    const folhaPagamento = document.getElementById("folhaPagamento");
    const folha = salarios.reduce((acc, curr) => acc + curr, 0);
    folhaPagamento.innerText = `R$ ${folha.toFixed(2)}`;

    const candidaturasRealizadas = document.getElementById("candidaturasRealizadas");
    candidaturasRealizadas.innerText = dados.candidaturas.length;

    const candidaturasMesPassado = document.getElementById("candidaturasMesPassado");
    const agora = new Date();
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(agora.getDate() - 30);

    const candidaturasUltimos30Dias = dados.candidaturas.filter(candidatura => {
        const campoData = candidatura.dataCandidatura || candidatura.data;
        const dataCandidatura = extrairDataSegura(campoData);
        return !isNaN(dataCandidatura) && dataCandidatura >= trintaDiasAtras;
    });

    if (candidaturasMesPassado) {
        candidaturasMesPassado.innerText = candidaturasUltimos30Dias.length;
    }

    const vagasMesPassado = document.getElementById("vagasMesPassado");
    const vagasUltimos30Dias = dados.vagas.filter(vaga => {
        const campoData = vaga.dataCriacao || vaga.data;
        const dataVaga = extrairDataSegura(campoData);
        return !isNaN(dataVaga) && dataVaga >= trintaDiasAtras;
    });
    
    if (vagasMesPassado) {
        vagasMesPassado.innerText = vagasUltimos30Dias.length;
    }

    function renderizarTodosGraficos() {
        const vagaAreasRosca = document.getElementById("graficoVagasAreas");
        if (vagaAreasRosca) {
            const dadosArea = dashboardDados(dados.vagas, 'area');
            graficosRosca(dadosArea.valores, vagaAreasRosca, dadosArea.rotulos);
        }

        const vagaRegimePizza = document.getElementById("graficoVagasRegime");
        if (vagaRegimePizza) {
            const dadosRegime = dashboardDados(dados.vagas, 'regime');
            graficosRosca(dadosRegime.valores, vagaRegimePizza, dadosRegime.rotulos);
        }

        const vagasLocalizacaoPizza = document.getElementById("graficoVagasLocalizacao");
        if (vagasLocalizacaoPizza) {
            const dadosPresenca = dashboardDados(dados.vagas, 'localizacao');
            graficosRosca(dadosPresenca.valores, vagasLocalizacaoPizza, dadosPresenca.rotulos);
        }

        const graficoSalario = document.getElementById("graficoSalario");
        if (graficoSalario) {
            const dadosSalarioArea = dashboardMediaArea(dados.vagas);
            graficosLinha(
                dadosSalarioArea.valores,
                dadosSalarioArea.rotulos,
                graficoSalario,
                {
                    padding: { top: 30, bottom: 65, left: 50, right: 20 },
                    rotacionarX: 45
                }
            );
        }

        const graficoCandidaturasArea = document.getElementById("graficoCandidaturasArea");
        if (graficoCandidaturasArea) {
            const dadosCandidaturasArea = dashboardCandidaturasArea(
                dados.candidaturas, 
                dados.vagas
            );
            graficosRosca(
                dadosCandidaturasArea.valores,
                graficoCandidaturasArea,
                dadosCandidaturasArea.rotulos
            );
        }
    }

    renderizarTodosGraficos();

    let timerResize;
    window.addEventListener("resize", () => {
        clearTimeout(timerResize);
        timerResize = setTimeout(renderizarTodosGraficos, 100);
    });
}