const CONFIG = {
    whatsappNumber: "56967894789", 
    basePricePerCoinBRL: 0.092, 
    currencies: {
        BRL: { locale: 'pt-BR', symbol: 'R$', flag: '🇧🇷', bankDetails: 'Pix: rubini@coins.com' },
        USD: { locale: 'en-US', symbol: '$', flag: '🇺🇸', bankDetails: 'Binance Pay / USDT: RUBINI123' },
        EUR: { locale: 'de-DE', symbol: '€', flag: '🇪🇺', bankDetails: 'IBAN: ES12 RUBINI 7890' },
        CLP: { locale: 'es-CL', symbol: 'CLP', flag: '🇨🇱', bankDetails: 'Banco Estado (Cuenta RUT): 12.345.678-9' },
        ARS: { locale: 'es-AR', symbol: '$', flag: '🇦🇷', bankDetails: 'Mercado Pago / CVU: 0000003100' }
    }
};

let exchangeRates = {};
let currentCurrency = 'CLP';
let rubiniTimer = null; 
let isCharVerified = false;

const coinInput = document.getElementById('coinInput');
const charNameInput = document.getElementById('charNameInput');
const priceOutput = document.getElementById('priceOutput');
const warningMsg = document.getElementById('warningMsg');
const currencySelector = document.getElementById('currencySelector');
const dynamicPrices = document.querySelectorAll('.dynamic-price');
const startPaymentBtn = document.getElementById('startPaymentBtn');
const buyButtons = document.querySelectorAll('.btn-buy');
const checkTerms = document.getElementById('checkTerms');

document.addEventListener('DOMContentLoaded', () => {
    checkBusinessStatus();
    setInterval(checkBusinessStatus, 60000);
    fetchExchangeRates();

    const savedCurrency = localStorage.getItem('selectedCurrency');
    const savedChar = localStorage.getItem('savedCharName');
    if (savedCurrency && currencySelector) {
        currencySelector.value = savedCurrency;
        currentCurrency = savedCurrency;
    }

    if (currencySelector) {
        currencySelector.addEventListener('change', (e) => {
            currentCurrency = e.target.value;
            localStorage.setItem('selectedCurrency', currentCurrency);
            updateUI(); 
        });
    }

    if (coinInput) {
        coinInput.min = 250;
        coinInput.step = 250;
        if (!coinInput.value || parseInt(coinInput.value) < 250) coinInput.value = 250;
        coinInput.addEventListener('input', calculateCalculatorPrice);
    }

    if (charNameInput) {
        charNameInput.addEventListener('input', () => {
            clearTimeout(rubiniTimer);
            charNameInput.classList.remove('is-valid', 'is-invalid');
            
            isCharVerified = false; 
            updateFeedbackMsg(charNameInput, 'clear');

            if (charNameInput.value.trim().length > 0) {
                updateFeedbackMsg(charNameInput, 'loading');
                rubiniTimer = setTimeout(() => validateRubiniFormat(charNameInput.value.trim(), charNameInput), 600);
            }
        });
        charNameInput.addEventListener('change', () => {
             localStorage.setItem('savedCharName', charNameInput.value);
        });
    }
    
    if (buyButtons) {
        buyButtons.forEach(btn => btn.addEventListener('click', quickBuy));
    }
});

function updatePaymentIcons() {
    const container = document.getElementById('paymentMethodIcons');
    if (!container) return;
    let icons = '';
    if (currentCurrency === 'BRL') icons = '<span class="badge bg-success me-2"><i class="bi bi-qr-code"></i> PIX</span><span class="badge bg-secondary">Boleto</span>';
    else if (currentCurrency === 'CLP') icons = '<span class="badge" style="background-color: #e6500a;">Banco Estado</span> <span class="badge bg-primary">Transferencia</span>';
    else if (currentCurrency === 'USD' || currentCurrency === 'EUR') icons = '<span class="badge bg-warning text-dark"><i class="bi bi-currency-bitcoin"></i> Binance</span> <span class="badge bg-light text-dark">USDT</span>';
    else icons = '<span class="badge bg-secondary">Transferencia Bancaria</span>';
    container.innerHTML = `<small class="text-secondary d-block mb-2">Métodos aceptados:</small> ${icons}`;
}

async function validateRubiniFormat(name, inputElement) {
    const apiUrl = `/check-char?name=${encodeURIComponent(name)}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Error en el servidor");
        const data = await response.json();
        
        if (data.exists === true) {
            isCharVerified = true;
            inputElement.classList.add('is-valid');
            inputElement.classList.remove('is-invalid');
            updateFeedbackMsg(inputElement, 'success', name);
        } else {
            isCharVerified = false;
            inputElement.classList.add('is-invalid');
            inputElement.classList.remove('is-valid');
            updateFeedbackMsg(inputElement, 'error-notfound', name);
        }
    } catch (error) {
        console.error("Error validando:", error);
        isCharVerified = false;
        // Este es el mensaje que ves ahora porque el 'fetch' a localhost falla
        updateFeedbackMsg(inputElement, 'warning-network', name);
    }
}

function updateFeedbackMsg(inputElement, status, charName = '') {
    let feedbackDiv = inputElement.closest('.col-12').querySelector('.char-api-feedback');
    if (!feedbackDiv) {
        feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'char-api-feedback small mt-2'; 
        inputElement.closest('.input-group').after(feedbackDiv);
    }

    if (status === 'loading') {
        feedbackDiv.style.color = '#0dcaf0'; 
        feedbackDiv.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>🔎 Verificando...';
    } else if (status === 'success') {
        feedbackDiv.style.color = '#25d366';
        const rubinotUrl = `https://rubinot.com.br/?subtopic=characters&name=${encodeURIComponent(charName)}`;
        feedbackDiv.innerHTML = `
            <div class="d-flex align-items-center flex-wrap gap-2">
                <span>✅ Personaje verificado.</span>
                <a href="${rubinotUrl}" target="_blank" class="text-secondary"><i class="bi bi-box-arrow-up-right"></i></a>
            </div>`;
    } else if (status === 'error-notfound') {
        feedbackDiv.style.color = '#dc3545';
        feedbackDiv.innerHTML = '<i class="bi bi-x-circle-fill me-1"></i>Personaje NO existe en Rubinot. No puedes continuar.';
    } else if (status === 'warning-network') {
        feedbackDiv.style.color = '#ffc107'; 
        feedbackDiv.innerHTML = '<i class="bi bi-wifi-off me-1"></i>Error de conexión con el verificador.';
    } else if (status === 'clear') {
        feedbackDiv.innerHTML = '';
    }
}

function checkBusinessStatus() {
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('statusDot');
    if (!statusText) return;
    const now = new Date();
    const chileTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Santiago"}));
    const hours = chileTime.getHours();
    if (hours >= 9 && hours < 22) {
        statusText.innerText = "ONLINE";
        statusText.style.color = "#25d366";
        statusDot.className = "status-dot status-online me-2";
    } else {
        statusText.innerText = "CERRADO";
        statusText.style.color = "#dc3545";
        statusDot.className = "status-dot status-offline me-2";
    }
}

async function fetchExchangeRates() {
    if(dynamicPrices.length > 0) dynamicPrices.forEach(el => el.textContent = "...");
    if(priceOutput) priceOutput.value = "Cargando...";
    
    const url = 'https://economia.awesomeapi.com.br/last/BRL-USD,BRL-EUR,BRL-CLP,BRL-ARS';
    try {
        const response = await fetch(url);
        const data = await response.json();
        exchangeRates = {
            USD: parseFloat(data.BRLUSD.ask),
            EUR: parseFloat(data.BRLEUR.ask),
            CLP: parseFloat(data.BRLCLP.ask),
            ARS: parseFloat(data.BRLARS.ask),
            BRL: 1
        };
        if(currencySelector && currencySelector.value) currentCurrency = currencySelector.value;
        updateUI();
    } catch (error) { console.error(error); }
}

function calculatePrice(amount) {
    const baseBlockSize = 250;
    const priceInReales250 = baseBlockSize * CONFIG.basePricePerCoinBRL; 
    const rate = currentCurrency === 'BRL' ? 1 : (exchangeRates[currentCurrency] || 1);
    const rawPrice250 = priceInReales250 * rate;
    
    let roundedBasePrice250;
    if (['CLP', 'ARS'].includes(currentCurrency)) roundedBasePrice250 = Math.ceil(rawPrice250 / 100) * 100;
    else roundedBasePrice250 = Math.ceil(rawPrice250 * 100) / 100;

    const effectiveUnitCost = roundedBasePrice250 / baseBlockSize;
    const finalTotal = amount * effectiveUnitCost;

    if (['CLP', 'ARS'].includes(currentCurrency)) return Math.round(finalTotal);
    else return parseFloat(finalTotal.toFixed(2));
}

function formatCurrency(value) {
    const details = CONFIG.currencies[currentCurrency] || { locale: 'en-US', symbol: '$' };
    const noDecimals = ['CLP', 'ARS'].includes(currentCurrency);
    const formattedValue = new Intl.NumberFormat(details.locale, { 
        style: 'currency', currency: currentCurrency, minimumFractionDigits: noDecimals ? 0 : 2, maximumFractionDigits: noDecimals ? 0 : 2
    }).format(value);
    return `${formattedValue} ${currentCurrency}`;
}

function updateUI() {
    dynamicPrices.forEach(element => {
        const coins = parseInt(element.getAttribute('data-coins'));
        if (coins) element.innerHTML = `${formatCurrency(calculatePrice(coins))}`;
    });
    calculateCalculatorPrice();
    updatePaymentIcons(); 
}

function calculateCalculatorPrice() {
    if (!coinInput || !priceOutput) return;
    let amount = parseFloat(coinInput.value);
    
    if (amount >= 250 && amount % 250 === 0) {
        coinInput.classList.remove('is-invalid');
        warningMsg.style.display = 'none';
        priceOutput.value = formatCurrency(calculatePrice(amount));
    } else {
        priceOutput.value = "---";
        if (amount) {
            coinInput.classList.add('is-invalid');
            warningMsg.style.display = 'block';
            warningMsg.innerText = "Múltiplos de 250.";
        }
    }
}

function quickBuy(event) {
    let coins = event.target.getAttribute('data-coins');
    if (coinInput) {
        coinInput.value = coins;
        calculateCalculatorPrice();
        const calcSection = document.getElementById('calculadora');
        if(calcSection) calcSection.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => charNameInput.focus(), 500);
    }
}

if (startPaymentBtn) {
    startPaymentBtn.addEventListener('click', () => {
        let amount = parseFloat(coinInput.value);
        let charName = charNameInput.value.trim();

        if (!isCharVerified) {
            warningMsg.style.display = 'block';
            warningMsg.innerText = "❌ Debes ingresar un personaje VÁLIDO para continuar.";
            charNameInput.focus();
            charNameInput.classList.add('is-invalid');
            return;
        }

        if (checkTerms && !checkTerms.checked) {
            warningMsg.style.display = 'block';
            warningMsg.innerText = "⚠️ Acepta los Términos.";
            return;
        }
        
        if (amount >= 250 && amount % 250 === 0) {
            warningMsg.style.display = 'none';
            document.getElementById('modalAmount').innerText = `${amount} RC`;
            document.getElementById('modalPrice').innerText = priceOutput.value;
            document.getElementById('modalChar').innerText = charName;
            
            const currencyData = CONFIG.currencies[currentCurrency];
            document.getElementById('modalBankDetails').innerText = currencyData ? currencyData.bankDetails : "Consultar.";

            const finalBtn = document.getElementById('btnConfirmWhatsapp');
            const newBtn = finalBtn.cloneNode(true);
            finalBtn.parentNode.replaceChild(newBtn, finalBtn);

            newBtn.addEventListener('click', () => {
                let message = `Hola *RoyalCoins*! ${currencyData.flag}\n\n` +
                              `🔥 *PEDIDO RUBINI COINS*\n` +
                              `👤 Char: *${charName}*\n` +
                              `💎 Cantidad: *${amount} RC*\n` +
                              `💰 Pago: *${priceOutput.value}*\n\n` +
                              `Adjunto mi comprobante.`;
                let url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
                const modalEl = document.getElementById('confirmModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if(modal) modal.hide();
            });

            new bootstrap.Modal(document.getElementById('confirmModal')).show();

        } else {
            warningMsg.style.display = 'block';
            warningMsg.innerText = "Mínimo 250 RC.";
        }
    });
}