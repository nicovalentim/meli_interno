export const carreiras = {
    api: "/api/vagas",
    limite: null,

    filtroAtual: { localizacao: "", regime: "", area: "" },

    rotulosArea: {
        ti: "Tecnologia da Informação",
        adm: "Administração",
        mkt: "Marketing",
        com: "Comércio / Vendas",
        log: "Logística",
        eng: "Engenharia"
    },


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

    rotulo(campo, valor) {
        if (campo === "area") return this.rotulosArea[this.normalizar(valor)] || valor;
        return valor;
    },

    async banco() {
        try {
            const resposta = await fetch(this.api);
            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
            const dados = await resposta.json();
            return Array.isArray(dados.vagas) ? dados.vagas : [];
        } catch (erro) {
            console.error("Erro ao buscar vagas: ", erro);
            return null;
        }
    },

    gerarCard(vaga) {
        const localizacao = vaga.localizacao || "";
        const regime = vaga.regime || "";
        const area = vaga.area || "";

        return `
            <article class="vaga"
                id="vaga_${this.escapar(vaga.id)}"
                data-localizacao="${this.escapar(this.normalizar(localizacao))}"
                data-regime="${this.escapar(this.normalizar(regime))}"
                data-area="${this.escapar(this.normalizar(area))}">
                <aside>
                    <h1>${this.escapar(vaga.titulo || "")}</h1>
                    <p>${this.escapar(localizacao)}</p>
                    <p>${this.escapar(regime)}</p>
                    <a>${this.escapar(this.rotulo("area", area))}</a>
                </aside>
            </article>`;
    },

    renderizarVagas(vagas) {
        const main = document.querySelector("main");
        if (!main) return;

        main.querySelectorAll("article").forEach(card => card.remove());

        const lista = [...vagas].sort(
            (a, b) => new Date(b.data_de_criacao).getTime() - new Date(a.data_de_criacao).getTime()
        );
        const exibidas = this.limite ? lista.slice(0, this.limite) : lista;

        main.insertAdjacentHTML("beforeend", exibidas.map(vaga => this.gerarCard(vaga)).join(""));
    },


    obterSelects() {
        return [...document.querySelectorAll("search select[data-campo]")];
    },

    preencherSelects(vagas) {
        this.obterSelects().forEach(select => {
            const campo = select.dataset.campo;
            const existentes = new Set([...select.options].map(op => op.value));

            const novos = new Map();
            vagas.forEach(vaga => {
                const valor = vaga[campo];
                const norm = this.normalizar(valor);
                if (valor && !existentes.has(norm) && !novos.has(norm)) novos.set(norm, valor);
            });

            [...novos.entries()]
                .map(([valor, original]) => ({ valor, texto: this.rotulo(campo, original) }))
                .sort((a, b) => a.texto.localeCompare(b.texto, "pt-BR"))
                .forEach(({ valor, texto }) => {
                    select.add(new Option(texto, valor));
                });
        });
    },

    filtrar() {
        const busca = document.getElementById("pesquisaVaga");
        const pesquisa = this.normalizar(busca ? busca.value : "");

        document.querySelectorAll("main article.vaga").forEach(vaga => {
            let visivel = true;

            if (pesquisa !== "" && !this.normalizar(vaga.textContent).includes(pesquisa))
                visivel = false;

            for (const campo in this.filtroAtual) {
                const escolhido = this.filtroAtual[campo];
                if (escolhido && vaga.dataset[campo] !== escolhido) visivel = false;
            }

            vaga.style.display = visivel ? "" : "none";
        });
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

        const vagas = await this.banco();
        if (vagas === null) {
            this.filtrar();
            return;
        }

        this.renderizarVagas(vagas);
        this.preencherSelects(vagas);
        this.filtrar();
    }
};

carreiras.render();