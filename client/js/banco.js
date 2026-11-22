const portaApi = 8000;
const validadePadrao = 60 * 1000;
const prefixoStorage = "meli:banco:v2:";

function lerStorage(chave) {
    try { return localStorage.getItem(chave); } catch { return null; }
}

function gravarStorage(chave, valor) {
    try { localStorage.setItem(chave, valor); } catch { /* storage bloqueado: segue sem salvar */ }
}

function removerStorage(chave) {
    try { localStorage.removeItem(chave); } catch { /* ignora */ }
}

function sessionLer(chave) {
    try { return sessionStorage.getItem(chave); } catch { return null; }
}

function sessionGravar(chave, valor) {
    try { sessionStorage.setItem(chave, valor); } catch { /* cheio ou bloqueado: fica só em memória */ }
}

function sessionRemover(chave) {
    try { sessionStorage.removeItem(chave); } catch { /* ignora */ }
}

function sessionChaves() {
    try { return Object.keys(sessionStorage); } catch { return []; }
}

const perfisDisponiveis = {
    admin: "Administrador",
    user: "Usuário"
};

const chavePerfil = "perfil";
const chaveUsuario = "usuario";

export const sessao = {
    perfis: perfisDisponiveis,

    perfil() {
        const salvo = lerStorage(chavePerfil);
        return salvo in perfisDisponiveis ? salvo : null;
    },

    logado() {
        return this.perfil() !== null;
    },

    usuario() {
        try { return JSON.parse(lerStorage(chaveUsuario)) ?? null; } catch { return null; }
    },

    rotuloPerfil(perfil = this.perfil()) {
        return perfisDisponiveis[perfil] || perfil;
    },

    entrar({ perfil, nome, email, imagem }) {
        if (!(perfil in perfisDisponiveis)) throw new Error(`Perfil inválido: ${perfil}`);
        gravarStorage(chavePerfil, perfil);
        gravarStorage(chaveUsuario, JSON.stringify({ nome, email, imagem: imagem ?? null }));
        banco.limpar();
    },

    sair() {
        removerStorage(chavePerfil);
        removerStorage(chaveUsuario);
        banco.limpar();
    },

    definirPerfil(perfil) {
        if (!(perfil in perfisDisponiveis)) throw new Error(`Perfil inválido: ${perfil}`);
        gravarStorage(chavePerfil, perfil);
        banco.limpar();
    },

    ehAdmin(perfil = this.perfil()) {
        return perfil === "admin";
    },

    podeEditarEventos(perfil = this.perfil()) {
        return this.ehAdmin(perfil);
    },

    podeCriarParceiros(perfil = this.perfil()) {
        return this.ehAdmin(perfil);
    },

    podeVerLeads(perfil = this.perfil()) {
        return this.ehAdmin(perfil);
    }
};

function descobrirBase() {
    const forcada = lerStorage("apiBase");
    if (forcada) return forcada.replace(/\/+$/, "");

    const { protocol, hostname, port } = window.location;
    if (protocol === "file:") return `http://127.0.0.1:${portaApi}`;
    if (port === "" || port === String(portaApi)) return "";
    return `${protocol}//${hostname}:${portaApi}`;
}

export class ApiErro extends Error {
    constructor(status, mensagem) {
        super(mensagem);
        this.name = "ApiErro";
        this.status = status;
    }

    get semPermissao() { return this.status === 401 || this.status === 403; }
    get naoEncontrado() { return this.status === 404; }
    get conflito() { return this.status === 409; }
}

function paraCamel(texto) {
    return texto.replace(/_([a-z0-9])/g, (trecho, letra) => letra.toUpperCase());
}

function paraSnake(texto) {
    return texto.replace(/[A-Z]/g, letra => `_${letra.toLowerCase()}`);
}

function converterChaves(valor, converter) {
    if (Array.isArray(valor)) return valor.map(item => converterChaves(item, converter));
    if (valor && typeof valor === "object") {
        return Object.fromEntries(
            Object.entries(valor).map(([chave, item]) => [converter(chave), converterChaves(item, converter)])
        );
    }
    return valor;
}

function mensagemDeErro(dados, status) {
    const detalhe = dados?.detail;
    if (typeof detalhe === "string") return detalhe;
    if (Array.isArray(detalhe)) {
        return detalhe
            .map(e => `${(e.loc || []).filter(p => p !== "body").join(".")}: ${e.msg}`)
            .join("; ");
    }
    return `Erro ${status} ao falar com o servidor`;
}

function montarQuery(params = {}) {
    const busca = new URLSearchParams();
    Object.entries(params).forEach(([chave, valor]) => {
        if (valor !== undefined && valor !== null && valor !== "") busca.set(paraSnake(chave), valor);
    });
    const texto = busca.toString();
    return texto ? `?${texto}` : "";
}

async function requisitar(metodo, caminho, { params, corpo } = {}) {
    const perfil = sessao.perfil();
    const headers = perfil ? { "X-Perfil": perfil } : {};
    if (corpo !== undefined) headers["Content-Type"] = "application/json";

    let resposta;
    try {
        resposta = await fetch(descobrirBase() + caminho + montarQuery(params), {
            method: metodo,
            headers,
            body: corpo !== undefined ? JSON.stringify(converterChaves(corpo, paraSnake)) : undefined
        });
    } catch {
        throw new ApiErro(0, "Não foi possível conectar ao servidor");
    }

    if (resposta.status === 204) return null;

    let dados = null;
    try { dados = converterChaves(await resposta.json(), paraCamel); } catch { /* resposta sem corpo JSON */ }

    if (!resposta.ok) throw new ApiErro(resposta.status, mensagemDeErro(dados, resposta.status));
    return dados;
}

const memoria = new Map();
const pendentes = new Map();

function chaveDe(caminho, params) {
    return `${sessao.perfil()}|${caminho}${montarQuery(params)}`;
}

function lerSalvo(chave) {
    const emMemoria = memoria.get(chave);
    if (emMemoria) {
        if (emMemoria.ate > Date.now()) return emMemoria;
        memoria.delete(chave);
    }

    const texto = sessionLer(prefixoStorage + chave);
    if (!texto) return null;

    try {
        const guardado = JSON.parse(texto);
        if (guardado.ate > Date.now()) {
            memoria.set(chave, guardado);
            return guardado;
        }
    } catch { }

    sessionRemover(prefixoStorage + chave);
    return null;
}

function guardar(chave, dados, validade, persistir) {
    if (Array.isArray(dados) && dados.length === 0) return;

    const registro = { dados, ate: Date.now() + validade };
    memoria.set(chave, registro);
    if (persistir) sessionGravar(prefixoStorage + chave, JSON.stringify(registro));
}

export const banco = {
    validade: validadePadrao,

    async buscar(caminho, { params, validade = validadePadrao, persistir = true, forcar = false } = {}) {
        const chave = chaveDe(caminho, params);

        if (!forcar) {
            const salvo = lerSalvo(chave);
            if (salvo) return salvo.dados;
        }

        if (pendentes.has(chave)) return pendentes.get(chave);

        const busca = requisitar("GET", caminho, { params })
            .then(dados => {
                guardar(chave, dados, validade, persistir);
                return dados;
            })
            .finally(() => pendentes.delete(chave));

        pendentes.set(chave, busca);
        return busca;
    },

    async enviar(metodo, caminho, corpo) {
        try {
            return await requisitar(metodo, caminho, { corpo });
        } finally {
            this.limpar();
        }
    },

    salvo(caminho, params) {
        return lerSalvo(chaveDe(caminho, params))?.dados;
    },

    limpar(prefixo = "") {
        const combina = (chave) => prefixo === "" || chave.split("|")[1]?.startsWith(prefixo);

        [...memoria.keys()].filter(combina).forEach(chave => memoria.delete(chave));
        sessionChaves()
            .filter(k => k.startsWith(prefixoStorage) && combina(k.slice(prefixoStorage.length)))
            .forEach(sessionRemover);
    }
};
