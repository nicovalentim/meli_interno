import { banco } from "./banco.js";
import { formatar } from "./global.js";
import { rota } from "./rotas.js";

export const home = {
    limite: 6,

    escapar(texto) {
        return String(texto ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    },

    async banco() {
        try {
            const lista = await banco.buscar(rota.eventos, { params: { status: "planejado", limit: 100 } });
            const hoje = formatar.hoje();
            return lista.filter(evento => evento.data >= hoje).slice(0, this.limite);
        } catch (erro) {
            console.error("Erro ao buscar eventos: ", erro);
            return null;
        }
    },

    gerarCard(evento) {
        const local = evento.local || evento.regiao || "";
        const detalhe = [local, formatar.data(evento.data)].filter(Boolean).join(" · ");

        return `
            <article>
                <img src="../rsc/template.webp"/>
                <aside>
                    <h2>${this.escapar(evento.nome)}</h2>
                    <p>
                        ${this.escapar(detalhe)}

                        <a href="../html/carreiras.html#evento_${this.escapar(evento.id)}">Saiba mais →</a>
                    </p>
                </aside>
            </article>`;
    },

    async render() {
        const main = document.querySelector("main");
        if (!main) return;

        const lista = await this.banco();
        if (lista === null) return;

        main.querySelectorAll("article, #avisoDestaques").forEach(elemento => elemento.remove());

        if (lista.length === 0) {
            main.insertAdjacentHTML("beforeend", `<p id="avisoDestaques">Nenhum evento em destaque no momento.</p>`);
            return;
        }

        main.insertAdjacentHTML("beforeend", lista.map(evento => this.gerarCard(evento)).join(""));
    }
};

home.render();