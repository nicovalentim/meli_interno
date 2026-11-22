import { cursos, formatar } from "./global.js";
import { grafico } from "./grafico.js";

export const desenvolvimento = {
    escapar(texto) {
        return String(texto ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    },

    escrever(id, texto) {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = texto;
    },

    resumo(curso) {
        const modulos = `${curso.modulos} ${curso.modulos === 1 ? "módulo" : "módulos"}`;
        const tempo = formatar.duracao(curso.tempoConclusao);
        return tempo ? `${modulos} - ${tempo}` : modulos;
    },

    rotuloBotao(curso) {
        if (curso.concluido) return "Revisar";
        return curso.modulosConcluidos > 0 ? "Continuar" : "Começar";
    },

    gerarCard(curso) {
        const andamento = curso.modulosConcluidos > 0
            ? `<progress max="${curso.modulos}" value="${curso.modulosConcluidos}"></progress>
               <p>${curso.modulosConcluidos} de ${curso.modulos} concluídos</p>`
            : "";

        return `
            <section data-curso-card="${this.escapar(curso.id)}">
                <h2>${this.escapar(curso.titulo)}</h2>
                <p>${this.escapar(this.resumo(curso))}</p>
                ${andamento}
                <button type="button" data-curso="${this.escapar(curso.id)}">${this.rotuloBotao(curso)}</button>
            </section>`;
    },

    destaque(lista) {
        const botao = document.getElementById("destaqueBotao");
        const curso = cursos.emAndamento(lista);

        if (!curso) {
            this.escrever("destaqueTitulo", "Nenhum curso em andamento");
            this.escrever("destaqueProgresso", "Escolha uma trilha abaixo para começar.");
            if (botao) botao.hidden = true;
            return null;
        }

        this.escrever("destaqueTitulo", curso.titulo);
        this.escrever("destaqueProgresso", `Você já concluiu ${curso.modulosConcluidos} de ${curso.modulos} módulos.`);
        if (botao) {
            botao.hidden = false;
            botao.dataset.curso = curso.id;
        }
        return curso;
    },

    proximos(lista, emAndamento) {
        const ul = document.getElementById("proximosPassos");
        if (!ul) return;

        const proximos = lista
            .filter(curso => !curso.concluido && curso.id !== emAndamento?.id)
            .slice(0, 3);

        ul.innerHTML = proximos.length
            ? proximos.map(curso => `<li>${this.escapar(curso.titulo)}</li>`).join("")
            : "<li>Você está em dia com as trilhas.</li>";
    },

    cards(lista, main) {
        main.querySelectorAll("section[data-curso-card], #avisoCursos").forEach(el => el.remove());

        if (lista.length === 0) {
            main.insertAdjacentHTML("beforeend", `<p id="avisoCursos">Nenhum curso disponível no momento.</p>`);
            return;
        }
        main.insertAdjacentHTML("beforeend", lista.map(curso => this.gerarCard(curso)).join(""));
    },

    desenharProgresso(curso) {
        const canvas = document.getElementById("graficoProgresso");
        if (!canvas) return;

        if (!curso) {
            grafico.semDados(canvas);
            return;
        }

        const restantes = curso.modulos - curso.modulosConcluidos;
        grafico.desenhar(
            "rosca",
            [curso.modulosConcluidos, restantes],
            ["Concluídos", "Restantes"],
            canvas
        );
    },

    abrir(id) {
        window.location.href = cursos.url({ id });
    },

    async render() {
        const main = document.querySelector("main");
        if (!main || !document.getElementById("destaqueTitulo")) return;

        grafico.preparar();

        main.addEventListener("click", (e) => {
            const botao = e.target.closest("button[data-curso]");
            if (botao) this.abrir(botao.dataset.curso);
        });

        let lista;
        try {
            lista = await cursos.comProgresso();
        } catch (erro) {
            console.error("Erro ao buscar cursos: ", erro);
            this.escrever("destaqueTitulo", "Não foi possível carregar seus cursos");
            this.escrever("destaqueProgresso", "Tente novamente em instantes.");
            main.insertAdjacentHTML("beforeend", `<p id="avisoCursos">Não foi possível carregar os cursos agora.</p>`);
            this.desenharProgresso(null);
            return;
        }

        const emAndamento = this.destaque(lista);
        this.proximos(lista, emAndamento);
        this.cards(lista, main);
        this.desenharProgresso(emAndamento);

        let timer;
        window.addEventListener("resize", () => {
            clearTimeout(timer);
            timer = setTimeout(() => this.desenharProgresso(emAndamento), 100);
        });
    }
};

desenvolvimento.render();