import { banco, sessao, ApiErro } from "./banco.js";
import { rota } from "./rotas.js";

const padraoEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const tamanhoMinimoSenha = 6;

export const login = {
    escrever(id, texto) {
        const elemento = document.getElementById(id);
        if (!elemento) return;

        elemento.textContent = texto;
        elemento.hidden = !texto;
    },

    validar(email, senha) {
        const erros = { email: "", senha: "" };

        if (!email) erros.email = "Informe seu e-mail.";
        else if (!padraoEmail.test(email)) erros.email = "Informe um e-mail válido.";

        if (!senha) erros.senha = "Informe sua senha.";
        else if (senha.length < tamanhoMinimoSenha) erros.senha = `A senha tem pelo menos ${tamanhoMinimoSenha} caracteres.`;

        return erros;
    },

    mostrarErros(erros) {
        this.escrever("erroEmail", erros.email);
        this.escrever("erroSenha", erros.senha);
        document.getElementById("loginEmail")?.setAttribute("aria-invalid", String(Boolean(erros.email)));
        document.getElementById("loginSenha")?.setAttribute("aria-invalid", String(Boolean(erros.senha)));
    },

    mensagemDeErro(erro) {
        if (!(erro instanceof ApiErro)) return "Não foi possível entrar. Tente novamente.";
        if (erro.status === 0) return "Não foi possível conectar ao servidor.";
        return erro.message;
    },

    async enviar(evento) {
        evento.preventDefault();

        const campoEmail = document.getElementById("loginEmail");
        const campoSenha = document.getElementById("loginSenha");
        const botao = document.getElementById("botaoEntrar");

        const email = campoEmail.value.trim();
        const senha = campoSenha.value;

        this.escrever("erroLogin", "");
        const erros = this.validar(email, senha);
        this.mostrarErros(erros);

        if (erros.email || erros.senha) {
            (erros.email ? campoEmail : campoSenha).focus();
            return;
        }

        botao.disabled = true;
        try {
            const usuario = await banco.enviar("POST", rota.login, { email, senha });
            sessao.entrar(usuario);
            window.location.replace("../html/home.html");
        } catch (erro) {
            this.escrever("erroLogin", this.mensagemDeErro(erro));
            campoSenha.value = "";
            campoSenha.focus();
            botao.disabled = false;
        }
    },

    render() {
        document.getElementById("formLogin")?.addEventListener("submit", (evento) => this.enviar(evento));
    }
};

login.render();
