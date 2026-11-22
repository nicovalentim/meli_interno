import { formatar, buscarTodos } from "./global.js";
import { rota } from "./rotas.js";

export const carreiras = {
    limite: null,

    filtroAtual: { regiao: "", parceiro: "", mes: "" },

    normalizar(texto) {
        return String(texto ?? "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    },

    escapar(texto) {
        return String(texto ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    },

    campos(evento) {
        const mes = formatar.chaveMes(evento.data);
        return {
            regiao: { valor: this.normalizar(evento.regiao), texto: evento.regiao || "" },
            parceiro: { valor: this.normalizar(evento.parceiro), texto: evento.parceiro || "" },
            mes: { valor: mes, texto: formatar.mes(mes) }
        };
    },

    async banco() {
        try {
            const [lista, parceiros] = await Promise.all([
                buscarTodos(rota.eventos, { status: "planejado" }),
                buscarTodos(rota.parceiros).catch(() => [])
            ]);
            const porId = Object.fromEntries(parceiros.map(p => [p.id, p]));

            return lista.map(evento => ({
                ...evento,
                parceiro: porId[evento.parceiroId]?.nome || ""
            }));
        } catch (erro) {
            console.error("Erro ao buscar eventos: ", erro);
            return null;
        }
    },

    gerarCard(evento) {
        const campos = this.campos(evento);
        const local = evento.local || evento.regiao || "";
        const vagas = Number(evento.vagas) || 0;
        const detalhe = [
            formatar.data(evento.data),
            vagas > 0 ? `${vagas} ${vagas === 1 ? "vaga" : "vagas"}` : ""
        ].filter(Boolean).join(" · ");

        return `
            <article class="vaga"
                id="evento_${this.escapar(evento.id)}"
                data-regiao="${this.escapar(campos.regiao.valor)}"
                data-parceiro="${this.escapar(campos.parceiro.valor)}"
                data-mes="${this.escapar(campos.mes.valor)}">
                <aside>
                    <h3>${this.escapar(evento.nome)}</h3>
                    <p>${this.escapar(local)}</p>
                    <p>${this.escapar(detalhe)}</p>
                    ${evento.parceiro ? `<a>${this.escapar(evento.parceiro)}</a>` : ""}
                </aside>
            </article>`;
    },

    aviso(texto) {
        const main = document.querySelector("main");
        if (!main) return;

        let elemento = document.getElementById("avisoVagas");
        if (!elemento) {
            elemento = document.createElement("p");
            elemento.id = "avisoVagas";
            main.append(elemento);
        }
        elemento.textContent = texto;
        elemento.hidden = !texto;
    },

    renderizarVagas(lista) {
        const main = document.querySelector("main");
        if (!main) return;

        main.querySelectorAll("article").forEach(card => card.remove());

        const exibidas = this.limite ? lista.slice(0, this.limite) : lista;
        main.insertAdjacentHTML("beforeend", exibidas.map(evento => this.gerarCard(evento)).join(""));
    },

    obterSelects() {
        return [...document.querySelectorAll("search select[data-campo]")];
    },

    preencherSelects(lista) {
        this.obterSelects().forEach(select => {
            const campo = select.dataset.campo;
            const existentes = new Set([...select.options].map(op => op.value));

            const novos = new Map();
            lista.forEach(evento => {
                const { valor, texto } = this.campos(evento)[campo] || {};
                if (valor && !existentes.has(valor) && !novos.has(valor)) novos.set(valor, texto);
            });

            const ordenar = campo === "mes"
                ? ([a], [b]) => a.localeCompare(b)
                : ([, a], [, b]) => a.localeCompare(b, "pt-BR");

            [...novos.entries()]
                .sort(ordenar)
                .forEach(([valor, texto]) => select.add(new Option(texto, valor)));
        });
    },

    filtrar() {
        const busca = document.getElementById("pesquisaVaga");
        const pesquisa = this.normalizar(busca ? busca.value : "");

        const cards = [...document.querySelectorAll("main article.vaga")];
        let visiveis = 0;

        cards.forEach(card => {
            let visivel = true;

            if (pesquisa !== "" && !this.normalizar(card.textContent).includes(pesquisa))
                visivel = false;

            for (const campo in this.filtroAtual) {
                const escolhido = this.filtroAtual[campo];
                if (escolhido && card.dataset[campo] !== escolhido) visivel = false;
            }

            card.style.display = visivel ? "" : "none";
            if (visivel) visiveis++;
        });

        if (cards.length > 0 && visiveis === 0) this.aviso("Nenhuma oportunidade encontrada para esses filtros.");
        else if (cards.length > 0) this.aviso("");
    },

    eventos() {
        const busca = document.getElementById("pesquisaVaga");
        if (busca) busca.addEventListener("input", () => this.filtrar());

        this.obterSelects().forEach(select => {
            select.addEventListener("change", () => {
                this.filtroAtual[select.dataset.campo] = select.value;
                this.filtrar();
            });
        });
    },

    async render() {
        this.eventos();
        this.aviso("Carregando oportunidades...");

        const lista = await this.banco();
        if (lista === null) {
            this.aviso("Não foi possível carregar as oportunidades agora. Tente novamente em instantes.");
            return;
        }

        this.renderizarVagas(lista);
        this.preencherSelects(lista);

        if (lista.length === 0) this.aviso("Nenhuma oportunidade aberta no momento.");
        else this.filtrar();
    }
};

carreiras.render();