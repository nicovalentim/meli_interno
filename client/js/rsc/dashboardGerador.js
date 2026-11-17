/*
    ver as variáveis e modificar de acordo
*/

const css = getComputedStyle(document.documentElement);
const branco = css.getPropertyValue('--branco').trim();
const preto = css.getPropertyValue('--preto').trim();
const corRealce = css.getPropertyValue('--corRealce').trim();

const rgbToHex = (rgbString) => {
    const rgbArray = rgbString.match(/\d+/g);
    const [r, g, b] = rgbArray.map(Number);
    const toHex = (c) => c.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const corRealceHex = rgbToHex(corRealce);
let cores = [];
let coresTotal = 4;
for (let i = 0; i < coresTotal; i++) {
    cores.push(`hsl(from ${corRealceHex} h s ${25+(i+1)*50/coresTotal})`);
}
const text = css.getPropertyValue('--fonteCanvas');

export function redimensionarCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);

    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        return true;
    }
    return false;
}

export function graficosBarra(barraDados, barraRotulo, barraLocal, config = {}) {
    const padding = { top: 20, right: 20, bottom: 40, left: 50, ...config.padding };
    const rotacionarX = config.rotacionarX || 0;

    const elementosCanvas = barraLocal.forEach ? barraLocal : [barraLocal];

    elementosCanvas.forEach((barCanvas) => {
        redimensionarCanvas(barCanvas);
        const barCtx = barCanvas.getContext('2d');
        barCtx.clearRect(0, 0, barCanvas.width, barCanvas.height);

        const barChartWidth = barCanvas.width - padding.left - padding.right;
        const barChartHeight = barCanvas.height - padding.top - padding.bottom;
        const maxBarValue = Math.max(...barraDados) || 1;

        barCtx.font = text;
        barCtx.fillStyle = `rgba(${preto}, 0.8)`;
        barCtx.textAlign = "right";
        barCtx.textBaseline = "middle";

        for (let i = 0; i <= 4; i++) {
            const ratio = i / 4;
            const yCoord = barCanvas.height - padding.bottom - (ratio * barChartHeight);
            const labelValue = Math.round(ratio * maxBarValue);

            barCtx.beginPath();
            barCtx.strokeStyle = i === 0 ? `rgba(${preto}, 0.8)` : `rgba(${preto}, 0.1)`; 
            barCtx.lineWidth = 1;
            barCtx.moveTo(padding.left, yCoord);
            barCtx.lineTo(barCanvas.width - padding.right, yCoord);
            barCtx.stroke();

            barCtx.fillText(labelValue, padding.left - 10, yCoord);
        }

        const barGap = 10;
        const totalGapsWidth = barGap * (barraDados.length - 1);
        const barWidth = (barChartWidth - totalGapsWidth) / barraDados.length;

        barraDados.forEach((value, index) => {
            const calculatedBarHeight = (value / maxBarValue) * barChartHeight;
            const xCoord = padding.left + (index * (barWidth + barGap));
            const yCoord = barCanvas.height - padding.bottom - calculatedBarHeight;

            barCtx.fillStyle = cores[index % cores.length];
            barCtx.fillRect(xCoord, yCoord, barWidth, calculatedBarHeight);

            if (barraRotulo[index] !== undefined) {
                barCtx.save();

                const textX = xCoord + (barWidth / 2);
                const textY = barCanvas.height - padding.bottom + 8;
                
                barCtx.translate(textX, textY);
                
                if (rotacionarX !== 0) {
                    const anguloNegativo = rotacionarX > 0 ? -rotacionarX : rotacionarX;
                    barCtx.rotate((anguloNegativo * Math.PI) / 180);

                    barCtx.textAlign = "right";
                    barCtx.textBaseline = "middle";
                } else {
                    barCtx.textAlign = "center";
                    barCtx.textBaseline = "top";
                }

                barCtx.fillStyle = `rgba(${preto}, 0.8)`;
                barCtx.fillText(barraRotulo[index], 0, 0);
                barCtx.restore();
            }
        });
    });
}

export function graficosLinha(linhaDados, linhaRotulo, linhaLocal, config = {}) {
    const padding = { top: 20, right: 20, bottom: 40, left: 50, ...config.padding };
    const rotacionarX = config.rotacionarX || 0;

    const elementosCanvas = linhaLocal.forEach ? linhaLocal : [linhaLocal];

    elementosCanvas.forEach((linhaCanvas) => {
        redimensionarCanvas(linhaCanvas);
        const linhaCtx = linhaCanvas.getContext('2d');
        linhaCtx.clearRect(0, 0, linhaCanvas.width, linhaCanvas.height);
        linhaCtx.font = text;
        linhaCtx.fillStyle = `rgba(${preto}, 0.8)`;
        linhaCtx.textAlign = "right";
        linhaCtx.textBaseline = "middle";

        const linhaChartWidth = linhaCanvas.width - padding.left - padding.right;
        const linhaChartHeight = linhaCanvas.height - padding.top - padding.bottom;
        const maxlinhaValue = Math.max(...linhaDados) || 1;

        for (let i = 0; i <= 4; i++) {
            const ratio = i / 4;
            const yCoord = linhaCanvas.height - padding.bottom - (ratio * linhaChartHeight);
            const labelValue = Math.round(ratio * maxlinhaValue);

            linhaCtx.beginPath();
            linhaCtx.strokeStyle = i === 0 ? `rgba(${preto}, 0.8)` : `rgba(${preto}, 0.1)`;
            linhaCtx.lineWidth = 1;
            linhaCtx.moveTo(padding.left, yCoord);
            linhaCtx.lineTo(linhaCanvas.width - padding.right, yCoord);
            linhaCtx.stroke();

            linhaCtx.fillText(labelValue, padding.left - 10, yCoord);
        }

        const totalPontos = linhaDados.length;
        const linhaPoints = linhaDados.map((value, index) => {
            const divisorX = totalPontos > 1 ? totalPontos - 1 : 1;
            const xCoord = padding.left + (index * (linhaChartWidth / divisorX));
            const yCoord = linhaCanvas.height - padding.bottom - ((value / maxlinhaValue) * linhaChartHeight);
            return { x: xCoord, y: yCoord };
        });

        if (linhaPoints.length > 0) {
            linhaCtx.beginPath();
            linhaCtx.lineWidth = 3;
            linhaPoints.forEach((point, index) => {
                if (index === 0) linhaCtx.moveTo(point.x, point.y);
                else linhaCtx.lineTo(point.x, point.y);
            });
            linhaCtx.stroke();
        }

        linhaPoints.forEach((point, index) => {
            linhaCtx.beginPath();
            linhaCtx.fillStyle = `hsl(from ${corRealceHex} h 20% l)`;
            linhaCtx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
            linhaCtx.fill();

            if (linhaRotulo[index] !== undefined) {
                linhaCtx.save();

                const textY = linhaCanvas.height - padding.bottom + 24;

                linhaCtx.translate(point.x, textY);

                if (rotacionarX !== 0) {
                    const anguloNegativo = rotacionarX > 0 ? -rotacionarX : rotacionarX;
                    linhaCtx.rotate((anguloNegativo * Math.PI) / 180);
                    linhaCtx.textAlign = "right";
                    linhaCtx.textBaseline = "middle";
                } else {
                    linhaCtx.textAlign = "center";
                    linhaCtx.textBaseline = "top";
                }

                linhaCtx.fillStyle = `rgba(${preto}, 0.8)`;
                linhaCtx.fillText(linhaRotulo[index], 0, 0);
                linhaCtx.restore();
            }
        });
    });
}

export function graficosPizza(pizzaDados, pizzaLocal, pizzaRotulo, rosca) {
    const elementosCanvas = pizzaLocal.forEach ? pizzaLocal : [pizzaLocal];

    elementosCanvas.forEach((pizzaCanvas) => {
        redimensionarCanvas(pizzaCanvas);
        const pizzaCtx = pizzaCanvas.getContext('2d');
        pizzaCtx.clearRect(0, 0, pizzaCanvas.width, pizzaCanvas.height);

        const pizzaTotal = pizzaDados.reduce((sum, val) => sum + val, 0);
        const pizzaX = pizzaCanvas.width / 2;
        const pizzaY = pizzaCanvas.height / 2;

        const maxRaio = Math.min(pizzaCanvas.width, pizzaCanvas.height) / 2;
        const pizzaRaioY = maxRaio * 0.80; 
        let pizzaAnguloInicial = 0;

        pizzaDados.forEach((value, index) => {
            const sliceAngle = (value / pizzaTotal) * 2 * Math.PI;

            pizzaCtx.font = text;
            pizzaCtx.fillStyle = cores[index % cores.length];
            pizzaCtx.beginPath();
            pizzaCtx.moveTo(pizzaX, pizzaY);
            pizzaCtx.arc(pizzaX, pizzaY, pizzaRaioY, pizzaAnguloInicial, pizzaAnguloInicial + sliceAngle);
            pizzaCtx.closePath();
            pizzaCtx.fill();

            pizzaAnguloInicial += sliceAngle;
        });

        if (rosca) {
            pizzaCtx.beginPath();
            pizzaCtx.fillStyle = `rgb(${branco})`;
            pizzaCtx.arc(pizzaX, pizzaY, pizzaRaioY * 0.6, 0, 2 * Math.PI);
            pizzaCtx.closePath();
            pizzaCtx.fill();
        }

        let anguloRotuloInicial = 0;
        pizzaDados.forEach((value, index) => {
            const sliceAngle = (value / pizzaTotal) * 2 * Math.PI;

            if (pizzaRotulo && pizzaRotulo[index] !== undefined && value > 0) {
                const anguloMeio = anguloRotuloInicial + (sliceAngle / 2);
                const raioTexto = rosca ? pizzaRaioY * 0.8 : pizzaRaioY * 0.65;

                const textoX = pizzaX + Math.cos(anguloMeio) * raioTexto;
                const textoY = pizzaY + Math.sin(anguloMeio) * raioTexto;

                pizzaCtx.save();

                pizzaCtx.textAlign = "center";
                pizzaCtx.textBaseline = "middle";

                const texto = pizzaRotulo[index];

                const métricas = pizzaCtx.measureText(texto);
                const larguraTexto = métricas.width;
                const alturaTexto = 14;

                const bgX = textoX - (larguraTexto / 2) - 4;
                const bgY = textoY - (alturaTexto / 2) - 4;
                const bgLargura = larguraTexto + (4 * 2);
                const bgAltura = alturaTexto + (4 * 2);

                pizzaCtx.fillStyle = `rgba(${preto}, 0.02)`;
                pizzaCtx.beginPath();
                const raioBorda = 2;
                pizzaCtx.roundRect(bgX, bgY, bgLargura, bgAltura, raioBorda);
                pizzaCtx.fill();

                pizzaCtx.beginPath();
                pizzaCtx.fillStyle = `rgb(${branco})`;
                pizzaCtx.shadowColor = 'rgba(0, 0, 0, 0.6)';
                pizzaCtx.shadowBlur = 4;
                pizzaCtx.shadowOffsetX = 1;
                pizzaCtx.shadowOffsetY = 1;
                pizzaCtx.fillText(texto, textoX, textoY);
                
                pizzaCtx.restore();
            }

            anguloRotuloInicial += sliceAngle;
        });
    });
}
    export function graficosRosca(roscaDados, roscaLocal, roscaRotulo) {
        graficosPizza(roscaDados, roscaLocal, roscaRotulo, true);
    }