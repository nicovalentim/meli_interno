import { banco } from "./banco.js";
import { formatar, buscarTodos } from "./global.js";
import { grafico } from "./grafico.js";
import { rota } from "./rotas.js";

export const administrativo = {
    fontes: {
        eventos: {
            async carregar() {
                const [lista, parceiros] = await Promise.all([
                    buscarTodos(rota.eventos),
                    buscarTodos(rota.parceiros).catch(() => [])
                ]);
                const porId = Object.fromEntries(parceiros.map(p => [p.id, p]));

                return lista.map(evento => ({
                    ...evento,
                    status: formatar.status(evento.status || "planejado"),
                    parceiro: porId[evento.parceiroId]?.nome || "Sem parceiro",
                    regiao: evento.regiao || "Sem região",
                    mes: formatar.chaveMes(evento.data)
                }));
            },
            agrupamentos: {
                status: (lista) => administrativo.agruparPor(lista, "status"),
                regiao: (lista) => administrativo.agruparPor(lista, "regiao"),
                parceiro: (lista) => administrativo.agruparPor(lista, "parceiro"),
                mes: (lista) => administrativo.agruparPorMes(lista),
                vagas: (lista) => administrativo.somarPor(lista, "regiao", "vagas")
            }
        },

        cobertura: {
            carregar: () => banco.buscar(rota.cobertura),
            agrupamentos: {
                regiao: (lista) => ({
                    rotulos: lista.map(l => l.regiao),
                    valores: lista.map(l => l.eventos)
                })
            }
        }
    },

    cache: {},

    normalizar(texto) {
        return String(texto ?? "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    },

    async carregarFonte(nome) {
        const fonte = this.fontes[nome];
        if (!fonte) return null;
        if (this.cache[nome]) return this.cache[nome];

        try {
            const lista = await fonte.carregar();
            this.cache[nome] = Array.isArray(lista) ? lista : [];
        } catch (erro) {
            console.error(`Erro ao buscar "${nome}": `, erro);
            this.cache[nome] = null;
        }
        return this.cache[nome];
    },

    agruparPor(lista, campo) {
        const grupos = new Map();

        lista.forEach(item => {
            const valor = String(item[campo] ?? "").trim();
            if (!valor) return;

            const chave = this.normalizar(valor);
            const grupo = grupos.get(chave) || { rotulo: valor, quantidade: 0 };
            grupo.quantidade++;
            grupos.set(chave, grupo);
        });

        const grupo = [...grupos.values()];
        return { rotulos: grupo.map(g => g.rotulo), valores: grupo.map(g => g.quantidade) };
    },

    somarPor(lista, campoGrupo, campoValor) {
        const grupos = new Map();

        lista.forEach(item => {
            const valor = Number(item[campoValor]);
            const rotulo = String(item[campoGrupo] ?? "").trim();
            if (!rotulo || !(valor > 0)) return;

            const chave = this.normalizar(rotulo);
            const grupo = grupos.get(chave) || { rotulo, soma: 0 };
            grupo.soma += valor;
            grupos.set(chave, grupo);
        });

        const grupo = [...grupos.values()];
        return { rotulos: grupo.map(g => g.rotulo), valores: grupo.map(g => g.soma) };
    },

    agruparPorMes(lista) {
        const contagem = new Map();

        lista.forEach(item => {
            if (!item.mes) return;
            contagem.set(item.mes, (contagem.get(item.mes) || 0) + 1);
        });

        const meses = [...contagem.keys()].sort();
        return {
            rotulos: meses.map(m => formatar.mesCurto(m)),
            valores: meses.map(m => contagem.get(m))
        };
    },

    renderizarGraficos() {
        document.querySelectorAll("canvas.grafico").forEach(canvas => {
            const nomeFonte = this.normalizar(canvas.dataset.grafico1);
            const nomeAgrupamento = this.normalizar(canvas.dataset.grafico2);
            const tipo = this.normalizar(canvas.dataset.tipo) || "rosca";

            const agrupar = this.fontes[nomeFonte]?.agrupamentos[nomeAgrupamento];
            if (!agrupar) {
                console.warn(`Canvas sem dados válidos: data-grafico1="${canvas.dataset.grafico1}" data-grafico2="${canvas.dataset.grafico2}"`, canvas);
                return;
            }

            const lista = this.cache[nomeFonte];
            const dados = lista ? agrupar(lista) : null;
            if (!dados || dados.valores.length === 0) {
                grafico.semDados(canvas);
                return;
            }

            const rotacao = Number(canvas.dataset.rotacao) || 0;

            grafico.desenhar(tipo, dados.valores, dados.rotulos, canvas, {
                rotacionarX: rotacao,
                padding: rotacao !== 0 ? { top: 30, bottom: 65 } : {}
            });
        });
    },

    async render() {
        grafico.preparar();

        const canvases = [...document.querySelectorAll("canvas.grafico")];
        const fontesUsadas = new Set(canvases.map(c => this.normalizar(c.dataset.grafico1)));
        await Promise.all([...fontesUsadas].map(nome => this.carregarFonte(nome)));

        this.renderizarGraficos();

        let timer;
        window.addEventListener("resize", () => {
            clearTimeout(timer);
            timer = setTimeout(() => this.renderizarGraficos(), 100);
        });
    }
};

administrativo.render();