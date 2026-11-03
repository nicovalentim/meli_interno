let caminho = window.location.pathname.replace(/\.html$/, "");
let arquivoAtual = caminho.substring(caminho.lastIndexOf('/') + 1)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

async function template(seletorAlvo) {
    const resposta = await fetch("../html/template.html");
        const htmlTexto = await resposta.text();

    const parser = new DOMParser();
        const docTemplate = parser.parseFromString(htmlTexto, "text/html");

    const elementoTemplate = docTemplate.querySelector(seletorAlvo);
    const elementoDestino = document.querySelector(seletorAlvo);

    if (elementoTemplate && elementoDestino) elementoDestino.innerHTML = elementoTemplate.innerHTML;
}

export const footer = {
    async render() {
        await template("footer");
    }
};

export const header = {
    async render() {
        const header = document.querySelector("header");
        if (header) {
            header.style.backgroundColor = `var(--${header.dataset.cor})`;
            header.style.setProperty('--bg', `url("${header.dataset.img}")`);
        }
    }
};

export const nav = {
    async render() {
        await template("nav");
        let linksNav = document.querySelectorAll('nav [data-nav]');

        linksNav.forEach(item => {
            if (
                item.dataset.nav &&
                item.dataset.nav != 0
            ) {
                item.textContent = item.dataset.nav;

                let arquivoDestino = item.dataset.nav
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase();

                item.href = `../html/${arquivoDestino}.html`;

                (arquivoDestino === arquivoAtual) ?
                    item.classList.add("navAtual") :
                    item.classList.remove("navAtual");
            }
        });
    }
};