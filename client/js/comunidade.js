import { formatar, buscarTodos } from "./global.js";
import { rota } from "./rotas.js";

const imagemPadrao = "../rsc/template.webp";

export const comunidade = {
    abaAtual: "historias",
    cache: {},

    historias: [
        { titulo: "Minha jornada no MELI", autor: "Ana Souza", time: "Time de Operações" },
        { titulo: "Diversidade em ação", autor: "Cucab Ferreira", time: "Produto" },
        { titulo: "Do estágio à liderança", autor: "Camila Rodrigues", time: "Marketing" }
    ],

    escapar(texto) {
        return String(texto ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    },

    eventosBase() {
        this.cache.eventos ??= Promise.all([
            buscarTodos(rota.eventos),
            buscarTodos(rota.parceiros).catch(() => [])
        ]).then(([lista, parceiros]) => {
            const porId = Object.fromEntries(parceiros.map(p => [p.id, p]));
            return lista.map(evento => ({
                ...evento,
                parceiro: porId[evento.parceiroId]?.nome || ""
            }));
        });

        this.cache.eventos.catch(() => delete this.cache.eventos);
        return this.cache.eventos;
    },

    abas: {
        historias: {
            titulo: "Histórias que inspiram",
            vazio: "Nenhuma história por aqui ainda.",
            async carregar() { return comunidade.historias; },
            card: (h) => comunidade.gerarCard({
                titulo: h.titulo,
                imagem: h.imagem,
                linha1: `Por ${h.autor}`,
                linha2: h.time
            })
        },

        eventos: {
            titulo: "Próximos eventos",
            verTodas: "../html/carreiras.html",
            vazio: "Nenhum evento marcado por enquanto.",
            async carregar() {
                const hoje = formatar.hoje();
                const lista = await comunidade.eventosBase();
                return lista.filter(e => e.status === "planejado" && e.data >= hoje).slice(0, 9);
            },
            card: (e) => comunidade.gerarCard({
                titulo: e.nome,
                imagem: e.imagem,
                linha1: e.parceiro ? `Com ${e.parceiro}` : (e.regiao || ""),
                linha2: [formatar.data(e.data), e.local].filter(Boolean).join(" · ")
            })
        },

        parceiros: {
            titulo: "Nossos parceiros",
            vazio: "Nenhum parceiro cadastrado ainda.",
            async carregar() {
                const [lista, todosEventos] = await Promise.all([
                    buscarTodos(rota.parceiros),
                    comunidade.eventosBase().catch(() => [])
                ]);

                const contagem = new Map();
                todosEventos
                    .filter(e => e.status !== "cancelado")
                    .forEach(e => contagem.set(e.parceiroId, (contagem.get(e.parceiroId) || 0) + 1));

                return lista.map(p => ({ ...p, eventos: contagem.get(p.id) || 0 }));
            },
            card: (p) => comunidade.gerarCard({
                inicial: p.nome,
                imagem: p.imagem,
                titulo: p.nome,
                linha1: [p.tipo, p.regiao].filter(Boolean).join(" · "),
                linha2: `${p.eventos} ${p.eventos === 1 ? "evento" : "eventos"}`
            })
        },

        novidades: {
            titulo: "Novidades",
            vazio: "Ainda não há eventos realizados para contar.",
            async carregar() {
                const lista = await comunidade.eventosBase();
                return lista
                    .filter(e => e.status === "realizado")
                    .sort((a, b) => b.data.localeCompare(a.data))
                    .slice(0, 9);
            },
            card: (e) => comunidade.gerarCard({
                titulo: e.nome,
                imagem: e.imagem,
                linha1: e.parceiro ? `Com ${e.parceiro}` : (e.regiao || ""),
                linha2: [formatar.data(e.data), e.local].filter(Boolean).join(" · ")
            })
        }
    },

    gerarCard({ inicial, titulo, linha1, linha2, imagem }) {
        const capa = imagem
            ? `<img src="${this.escapar(imagem)}" alt="">`
            : inicial
                ? `<div class="capa">${this.escapar(String(inicial).trim().charAt(0).toUpperCase())}</div>`
                : `<img src="${imagemPadrao}" alt="">`;

        return `
            <article>
                ${capa}
                <div class="texto">
                    <h2>${this.escapar(titulo)}</h2>
                    ${linha1 ? `<p>${this.escapar(linha1)}</p>` : ""}
                    ${linha2 ? `<p>${this.escapar(linha2)}</p>` : ""}
                </div>
            </article>`;
    },

    cabecalho(aba) {
        return `<h1>${this.escapar(aba.titulo)}</h1>`;
    },

    aviso(aba, texto) {
        const main = document.querySelector("main");
        if (main) main.innerHTML = `${this.cabecalho(aba)}<p id="avisoComunidade">${this.escapar(texto)}</p>`;
    },

    async mostrar(nome) {
        const aba = this.abas[nome];
        const main = document.querySelector("main");
        if (!aba || !main) return;

        this.abaAtual = nome;
        document.querySelectorAll(".abas [data-aba]").forEach(botao => {
            const ativa = botao.dataset.aba === nome;
            botao.setAttribute("aria-selected", String(ativa));
            botao.tabIndex = ativa ? 0 : -1;
        });

        this.aviso(aba, "Carregando...");

        let lista;
        try {
            lista = await aba.carregar();
        } catch (erro) {
            console.error(`Erro ao carregar a aba "${nome}": `, erro);
            if (this.abaAtual === nome) this.aviso(aba, "Não foi possível carregar agora. Tente novamente em instantes.");
            return;
        }

        if (this.abaAtual !== nome) return;   // o usuário já trocou de aba

        if (lista.length === 0) {
            this.aviso(aba, aba.vazio);
            return;
        }
        main.innerHTML = this.cabecalho(aba) + lista.map(item => aba.card(item)).join("");
    },

    eventos() {
        document.querySelectorAll(".abas [data-aba]").forEach(botao => {
            botao.addEventListener("click", () => this.mostrar(botao.dataset.aba));
        });
    },

    async render() {
        this.eventos();
        await this.mostrar(this.abaAtual);
    }
};

comunidade.render();