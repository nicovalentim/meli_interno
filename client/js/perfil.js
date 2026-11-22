import { banco } from "./banco.js";
import { cursos, formatar } from "./global.js";
import { rota } from "./rotas.js";

const avatar = "../rsc/icones/avatar.png";

let dadosEmMemoria = null;

function dadosDoUsuario() {
    dadosEmMemoria ??= banco.buscar(rota.perfil).catch(erro => {
        console.info("Dados do perfil indisponíveis (rota ainda não conectada):", erro.message);
        return null;
    });
    return dadosEmMemoria;
}

const usuario = {
    nome: async () => (await dadosDoUsuario())?.nome ?? null,
    emprego: async () => (await dadosDoUsuario())?.emprego ?? null,
    imagem: async () => (await dadosDoUsuario())?.imagem ?? null,
    eventosAtendidos: async () => (await dadosDoUsuario())?.eventosAtendidos ?? null,
    vagasCandidatadas: async () => (await dadosDoUsuario())?.vagasCandidatadas ?? null,

    async cursos() {
        try {
            return await cursos.comProgresso();
        } catch {
            return null;
        }
    }
};

export const perfil = {
    escapar(texto) {
        return String(texto ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    },

    async texto(hook, id) {
        const valor = await hook();
        const elemento = document.getElementById(id);
        if (valor !== null && valor !== undefined && valor !== "" && elemento) elemento.textContent = valor;
    },

    async numero(hook, id) {
        const valor = await hook();
        const elemento = document.getElementById(id);
        if (elemento && Number.isFinite(Number(valor)) && valor !== null) {
            elemento.textContent = Number(valor).toLocaleString("pt-BR");
        }
    },

    async imagem() {
        const avatar = document.getElementById("avatarPerfil");
        if (!avatar) return;

        avatar.src = avatar;
        const url = await usuario.imagem();
        if (url) avatar.src = url;
    },

    cardEmProgresso(curso) {
        return `
            <article>
                <h3>${this.escapar(curso.titulo)}</h3>
                <progress max="${curso.modulos}" value="${curso.modulosConcluidos}"></progress>
                <p>${curso.modulosConcluidos} de ${curso.modulos} módulos · ${curso.percentual}%</p>
            </article>`;
    },

    cardConcluido(curso) {
        const tempo = formatar.duracao(curso.tempoConclusao);
        const detalhe = `${curso.modulos} ${curso.modulos === 1 ? "módulo" : "módulos"}${tempo ? ` - ${tempo}` : ""}`;
        return `
            <article>
                <h3>${this.escapar(curso.titulo)}</h3>
                <p>${this.escapar(detalhe)}</p>
                <p class="selo">Concluído</p>
            </article>`;
    },

    grupo(titulo, lista, card, vazio) {
        return `<h2>${titulo} (${lista.length})</h2>` +
            (lista.length ? lista.map(card).join("") : `<p class="aviso">${vazio}</p>`);
    },

    async cursos() {
        const main = document.getElementById("perfilCursos");
        if (!main) return;

        const lista = await usuario.cursos();
        if (lista === null) return;

        const emProgresso = lista.filter(curso => curso.modulosConcluidos > 0 && !curso.concluido);
        const concluidos = lista.filter(curso => curso.concluido);

        main.querySelectorAll("h2, article, .aviso").forEach(el => el.remove());
        main.insertAdjacentHTML("beforeend",
            this.grupo("Em progresso", emProgresso, c => this.cardEmProgresso(c), "Nenhum curso em andamento.") +
            this.grupo("Concluídos", concluidos, c => this.cardConcluido(c), "Nenhum curso concluído ainda."));
    },

    async render() {
        await Promise.all([
            this.texto(usuario.nome, "perfilNome"),
            this.texto(usuario.emprego, "perfilEmprego"),
            this.imagem(),
            this.numero(usuario.eventosAtendidos, "indEventosAtendidos"),
            this.numero(usuario.vagasCandidatadas, "indVagasCandidatadas"),
            this.cursos()
        ]);
    }
};

perfil.render();