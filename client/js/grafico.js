export const grafico = {
    totalCores: 4,
    tema: {},
    cores: [],

    paraRgb(cor) {
        cor = String(cor).trim();
        if (cor.startsWith("#")) {
            let hex = cor.slice(1);
            if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
            const n = parseInt(hex, 16);
            return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        }
        const partes = cor.match(/\d+(\.\d+)?/g);
        return partes ? partes.slice(0, 3).map(Number) : [0, 0, 0];
    },

    paraHsl([r, g, b]) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;
        const l = (max + min) / 2;
        const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

        let h = 0;
        if (d !== 0) {
            if (max === r) h = ((g - b) / d) % 6;
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
        }
        return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 };
    },

    rgba([r, g, b], alfa) {
        return `rgba(${r}, ${g}, ${b}, ${alfa})`;
    },

    alvos(local) {
        if (!local) return [];
        return local instanceof Element ? [local] : [...local];
    },

    preparar() {
        const css = getComputedStyle(document.documentElement);
        const ler = (nome, padrao) => css.getPropertyValue(nome).trim() || padrao;

        const realceCss = ler("--azul");

        const realce = this.paraRgb(realceCss);
        const hsl = this.paraHsl(realce);

        this.tema = {
            branco: this.paraRgb(ler("--branco", "#F7F7F7")),
            preto: this.paraRgb(ler("--preto", ler("--cinzaEscuro", "#333"))),
            realce,
            ponto: `hsl(${hsl.h} 20% ${hsl.l}%)`,
            fonte: ler("--fonteCanvas", "14px Proxima, sans-serif")
        };

        this.cores = [];
        for (let i = 0; i < this.totalCores; i++) {
            const luz = 25 + ((i + 1) * 50) / this.totalCores;
            this.cores.push(`hsl(${hsl.h} ${hsl.s}% ${luz}%)`);
        }
    },

    redimensionar(canvas) {
        const rect = canvas.getBoundingClientRect();
        const largura = Math.floor(rect.width);
        const altura = Math.floor(rect.height);

        if (canvas.width !== largura || canvas.height !== altura) {
            canvas.width = largura;
            canvas.height = altura;
            return true;
        }
        return false;
    },

    eixoY(ctx, canvas, padding, maximo) {
        const alturaUtil = canvas.height - padding.top - padding.bottom;

        ctx.font = this.tema.fonte;
        ctx.fillStyle = this.rgba(this.tema.preto, 0.8);
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 1;

        for (let i = 0; i <= 4; i++) {
            const razao = i / 4;
            const y = canvas.height - padding.bottom - razao * alturaUtil;

            ctx.beginPath();
            ctx.strokeStyle = this.rgba(this.tema.preto, i === 0 ? 0.8 : 0.1);
            ctx.moveTo(padding.left, y);
            ctx.lineTo(canvas.width - padding.right, y);
            ctx.stroke();

            ctx.fillText(Math.round(razao * maximo), padding.left - 10, y);
        }
    },

    rotuloX(ctx, texto, x, y, rotacionarX) {
        ctx.save();
        ctx.translate(x, y);

        if (rotacionarX !== 0) {
            const angulo = rotacionarX > 0 ? -rotacionarX : rotacionarX;
            ctx.rotate((angulo * Math.PI) / 180);
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
        } else {
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
        }

        ctx.fillStyle = this.rgba(this.tema.preto, 0.8);
        ctx.fillText(texto, 0, 0);
        ctx.restore();
    },

    barra(dados, rotulos, local, config = {}) {
        const padding = { top: 20, right: 20, bottom: 40, left: 50, ...config.padding };
        const rotacionarX = config.rotacionarX || 0;

        this.alvos(local).forEach(canvas => {
            this.redimensionar(canvas);
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const largura = canvas.width - padding.left - padding.right;
            const altura = canvas.height - padding.top - padding.bottom;
            const maximo = Math.max(0, ...dados) || 1;

            this.eixoY(ctx, canvas, padding, maximo);

            const espaco = 10;
            const larguraBarra = (largura - espaco * (dados.length - 1)) / dados.length;

            dados.forEach((valor, i) => {
                const alturaBarra = (valor / maximo) * altura;
                const x = padding.left + i * (larguraBarra + espaco);
                const y = canvas.height - padding.bottom - alturaBarra;

                ctx.fillStyle = this.cores[i % this.cores.length];
                ctx.fillRect(x, y, larguraBarra, alturaBarra);

                if (rotulos[i] !== undefined)
                    this.rotuloX(ctx, rotulos[i], x + larguraBarra / 2, canvas.height - padding.bottom + 8, rotacionarX);
            });
        });
    },

    barras(...args) {
        return this.barra(...args);
    },

    linha(dados, rotulos, local, config = {}) {
        const padding = { top: 20, right: 20, bottom: 40, left: 50, ...config.padding };
        const rotacionarX = config.rotacionarX || 0;

        this.alvos(local).forEach(canvas => {
            this.redimensionar(canvas);
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const largura = canvas.width - padding.left - padding.right;
            const altura = canvas.height - padding.top - padding.bottom;
            const maximo = Math.max(0, ...dados) || 1;

            this.eixoY(ctx, canvas, padding, maximo);

            const divisorX = dados.length > 1 ? dados.length - 1 : 1;
            const pontos = dados.map((valor, i) => ({
                x: padding.left + i * (largura / divisorX),
                y: canvas.height - padding.bottom - (valor / maximo) * altura
            }));

            if (pontos.length > 0) {
                ctx.beginPath();
                ctx.strokeStyle = this.rgba(this.tema.realce, 1);
                ctx.lineWidth = 3;
                pontos.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
                ctx.stroke();
            }

            pontos.forEach((p, i) => {
                ctx.beginPath();
                ctx.fillStyle = this.tema.ponto;
                ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
                ctx.fill();

                if (rotulos[i] !== undefined)
                    this.rotuloX(ctx, rotulos[i], p.x, canvas.height - padding.bottom + 24, rotacionarX);
            });
        });
    },

    pizza(dados, rotulos, local, config = {}) {
        const rosca = config.rosca === true;

        this.alvos(local).forEach(canvas => {
            this.redimensionar(canvas);
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const total = dados.reduce((soma, v) => soma + v, 0);
            if (total <= 0) return;

            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const raio = (Math.min(canvas.width, canvas.height) / 2) * 0.8;

            ctx.font = this.tema.fonte;

            let inicio = 0;
            dados.forEach((valor, i) => {
                const fatia = (valor / total) * 2 * Math.PI;

                ctx.fillStyle = this.cores[i % this.cores.length];
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, raio, inicio, inicio + fatia);
                ctx.closePath();
                ctx.fill();

                inicio += fatia;
            });

            if (rosca) {
                ctx.save();
                ctx.globalCompositeOperation = "destination-out";
                ctx.beginPath();
                ctx.arc(cx, cy, raio * 0.6, 0, 2 * Math.PI);
                ctx.fill();
                ctx.restore();
            }

            let anguloInicial = 0;
            dados.forEach((valor, i) => {
                const fatia = (valor / total) * 2 * Math.PI;

                if (rotulos && rotulos[i] !== undefined && valor > 0) {
                    const meio = anguloInicial + fatia / 2;
                    const raioTexto = rosca ? raio * 0.8 : raio * 0.65;

                    ctx.save();
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = `rgb(${this.tema.branco.join(", ")})`;
                    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
                    ctx.shadowBlur = 4;
                    ctx.shadowOffsetX = 1;
                    ctx.shadowOffsetY = 1;
                    ctx.fillText(rotulos[i], cx + Math.cos(meio) * raioTexto, cy + Math.sin(meio) * raioTexto);
                    ctx.restore();
                }

                anguloInicial += fatia;
            });
        });
    },

    rosca(dados, rotulos, local, config = {}) {
        this.pizza(dados, rotulos, local, { ...config, rosca: true });
    },

    semDados(canvas) {
        this.redimensionar(canvas);
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = this.tema.fonte;
        ctx.fillStyle = this.rgba(this.tema.preto, 0.6);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Sem dados", canvas.width / 2, canvas.height / 2);
    },

    desenhar(tipo, dados, rotulos, local, config = {}) {
        const tipos = ["barra", "barras", "linha", "pizza", "rosca"];
        if (!tipos.includes(tipo)) {
            console.warn(`Tipo de gráfico desconhecido: "${tipo}". Use: ${tipos.join(", ")}.`);
            return;
        }
        this[tipo](dados, rotulos, local, config);
    }
};
