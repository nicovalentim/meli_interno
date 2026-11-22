import { footer, header, nav } from "./carregar.js";
import { banco, sessao, ApiErro } from "./banco.js";
import { rota } from "./rotas.js";

            // TEMPORÁRIO: true = abre todas as páginas sem login, já "logado" com o perfil abaixo.
            // Voltar para false antes de publicar (a sessão de teste é apagada sozinha).
            const modoTeste = true;
            const perfilModoTeste = "admin"; // "admin" abre tudo; "user" simula o usuário comum
            const emailModoTeste = "modoteste@local";

const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const rotulosStatus = { planejado: "Planejado", realizado: "Realizado", cancelado: "Cancelado" };

export const formatar = {
    data(iso) {
        const [ano, mes, dia] = String(iso ?? "").split("-");
        return ano && mes && dia ? `${dia}/${mes}/${ano}` : "";
    },

    chaveMes(iso) {
        return String(iso ?? "").slice(0, 7);
    },

    mes(chave) {
        const [ano, mes] = String(chave ?? "").split("-");
        const nome = meses[Number(mes) - 1];
        return nome ? `${nome} de ${ano}` : "";
    },

    mesCurto(chave) {
        const [ano, mes] = String(chave ?? "").split("-");
        const nome = meses[Number(mes) - 1];
        return nome ? `${nome.slice(0, 3)}/${ano.slice(2)}` : "";
    },

    duracao(minutos) {
        const total = Math.round(Number(minutos) || 0);
        if (total <= 0) return "";
        const horas = Math.floor(total / 60);
        const resto = total % 60;
        if (horas === 0) return `${resto}min`;
        return resto ? `${horas}h${String(resto).padStart(2, "0")}` : `${horas}h`;
    },

    status(status) {
        return rotulosStatus[status] || status || "";
    },

    hoje() {
        const d = new Date();
        const dois = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
    }
};

const limiteMaximo = 500;
const maxPaginas = 20;

export async function buscarTodos(caminho, filtros = {}, opcoes = {}) {
    const todos = [];
    for (let pagina = 0; pagina < maxPaginas; pagina++) {
        const lote = await banco.buscar(caminho, {
            params: { ...filtros, limit: limiteMaximo, offset: pagina * limiteMaximo },
            ...opcoes
        });
        todos.push(...lote);
        if (lote.length < limiteMaximo) break;
    }
    return todos;
}

async function listaOuVaziaSeNaoExiste(caminho) {
    try {
        return await banco.buscar(caminho);
    } catch (erro) {
        if (erro instanceof ApiErro && erro.naoEncontrado) {
            console.warn(`Rota ${caminho} ainda não existe no servidor: lista vazia.`);
            return [];
        }
        throw erro;
    }
}

let cursosEmMemoria = null;

export const cursos = {
    comProgresso() {
        cursosEmMemoria ??= (async () => {
            const [lista, progresso] = await Promise.all([
                listaOuVaziaSeNaoExiste(rota.cursos),
                listaOuVaziaSeNaoExiste(rota.cursosProgresso).catch(() => [])   // sem progresso a lista ainda aparece
            ]);
            const porCurso = new Map(progresso.map(p => [Number(p.cursoId), p]));

            return lista.map(curso => {
                const modulos = Number(curso.modulos) || 0;
                const feito = porCurso.get(Number(curso.id));
                const concluidos = Math.min(Math.max(Number(feito?.modulosConcluidos) || 0, 0), modulos);

                return {
                    ...curso,
                    modulos,
                    tempoConclusao: Number(curso.tempoConclusao) || 0,
                    modulosConcluidos: concluidos,
                    percentual: modulos > 0 ? Math.round((concluidos / modulos) * 100) : 0,
                    concluido: modulos > 0 && concluidos >= modulos,
                    ultimoAcesso: feito?.ultimoAcesso ?? null
                };
            });
        })();

        cursosEmMemoria.catch(() => { cursosEmMemoria = null; });
        return cursosEmMemoria;
    },

    emAndamento(lista) {
        const iniciados = lista.filter(c => c.modulosConcluidos > 0 && !c.concluido);
        if (iniciados.length === 0) return null;

        return [...iniciados].sort((a, b) =>
            String(b.ultimoAcesso ?? "").localeCompare(String(a.ultimoAcesso ?? "")) ||
            b.percentual - a.percentual
        )[0];
    },

    url: (curso) => `../html/curso.html?id=${encodeURIComponent(curso.id)}`
};

const regras = {
    nav: {},
    paginas: {
        administrativo: ["admin"]
    }
};

const paginaInicial = "home";
const paginaLogin = "login";

function semAcento(texto) {
    return String(texto ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

export const acesso = {
    regras,

    cargoAtual: () => sessao.perfil(),
    cargos: () => Object.keys(sessao.perfis),

    paginaAtual() {
        const caminho = window.location.pathname.replace(/\.html$/, "");
        return semAcento(caminho.substring(caminho.lastIndexOf("/") + 1));
    },

    pode(tipo, alvo, cargo = this.cargoAtual()) {
        const lista = this.regras[tipo]?.[semAcento(alvo)];
        return lista === undefined || lista.includes(cargo);
    },

    veBotao(alvo, cargo = this.cargoAtual()) {
        return this.pode("nav", alvo, cargo) && this.pode("paginas", alvo, cargo);
    },

    alternar(tipo, alvo, cargo, permitido) {
        if (!(tipo in this.regras)) throw new Error(`Tipo de regra inválido: ${tipo}`);
        if (!this.cargos().includes(cargo)) throw new Error(`Cargo inválido: ${cargo}`);

        const chave = semAcento(alvo);
        const ligado = permitido ?? !this.pode(tipo, chave, cargo);

        const atuais = new Set(this.regras[tipo][chave] ?? this.cargos());
        if (ligado) atuais.add(cargo); else atuais.delete(cargo);

        if (atuais.size === this.cargos().length) delete this.regras[tipo][chave];
        else this.regras[tipo][chave] = [...atuais];

        return ligado;
    },

    aplicarNav() {
        document.querySelectorAll("nav [data-nav]").forEach(item => {
            const visivel = this.veBotao(item.dataset.nav);
            item.hidden = !visivel;
            item.style.display = visivel ? "" : "none";
        });
    },

    protegerPagina() {
        const pagina = this.paginaAtual();

        if (pagina === paginaLogin) {
            if (sessao.logado() && !modoTeste) window.location.replace(`../html/${paginaInicial}.html`);
            return true;
        }

        if (!sessao.logado()) {
            window.location.replace(`../html/${paginaLogin}.html`);
            return false;
        }

        if (this.pode("paginas", pagina)) return true;

        if (pagina === paginaInicial) {
            document.body.innerHTML = "<p style=\"padding:32px\">Seu cargo não tem acesso a esta página.</p>";
        } else {
            window.location.replace(`../html/${paginaInicial}.html`);
        }
        return false;
    }
};


function escapar(texto) {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export const menuUsuario = {
    menu: null,
    link: null,

    montar() {
        const avatar = document.getElementById("avatar");
        this.link = avatar?.closest("a") ?? null;
        if (!this.link || this.menu) return;

        const usuario = sessao.usuario();
        if (usuario?.imagem) avatar.src = usuario.imagem;

        this.link.setAttribute("aria-haspopup", "menu");
        this.link.setAttribute("aria-expanded", "false");

        this.menu = document.createElement("div");
        this.menu.id = "menuUsuario";
        this.menu.setAttribute("role", "menu");
        this.menu.hidden = true;
        this.menu.innerHTML = `
            <p>${escapar(usuario?.nome ?? "")}<small>${escapar(sessao.rotuloPerfil())}</small></p>
            <a href="../html/perfil.html" role="menuitem">Ver perfil</a>
            <button type="button" id="botaoSair" role="menuitem">Sair</button>`;
        document.body.append(this.menu);

        this.link.addEventListener("click", (e) => {
            e.preventDefault();
            this.alternar();
        });
        this.menu.querySelector("#botaoSair").addEventListener("click", () => this.sair());

        document.addEventListener("click", (e) => {
            if (!this.menu.hidden && !this.menu.contains(e.target) && !this.link.contains(e.target)) this.fechar();
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !this.menu.hidden) {
                this.fechar();
                this.link.focus();
            }
        });
        window.addEventListener("resize", () => this.fechar());
    },

    alternar() {
        if (this.menu.hidden) this.abrir();
        else this.fechar();
    },

    abrir() {
        const caixa = this.link.getBoundingClientRect();
        this.menu.style.top = `${caixa.bottom + window.scrollY + 8}px`;
        this.menu.style.right = `${document.documentElement.clientWidth - caixa.right}px`;
        this.menu.hidden = false;
        this.link.setAttribute("aria-expanded", "true");
    },

    fechar() {
        if (!this.menu) return;
        this.menu.hidden = true;
        this.link.setAttribute("aria-expanded", "false");
    },

    sair() {
        sessao.sair();
        window.location.replace(`../html/${paginaLogin}.html`);
    }
};

        // PARTE DE TESTE TEMPORÁRIA PARA TESTAR LAYOUTS
        function aplicarModoTeste() {
            const sessaoDeTeste = sessao.usuario()?.email === emailModoTeste;

            if (!modoTeste) {
                if (sessaoDeTeste) sessao.sair();
                return;
            }

            console.warn(`MODO DE TESTE ativo (global.js): páginas abertas sem login, perfil "${perfilModoTeste}".`);
            if (!sessao.logado() || (sessaoDeTeste && sessao.perfil() !== perfilModoTeste)) {
                sessao.entrar({ perfil: perfilModoTeste, nome: "Modo de teste", email: emailModoTeste, imagem: null });
            }
        }

        aplicarModoTeste();
acesso.protegerPagina();

footer.render();
header.render();
nav.render().then(() => {
    acesso.aplicarNav();
    menuUsuario.montar();
});
