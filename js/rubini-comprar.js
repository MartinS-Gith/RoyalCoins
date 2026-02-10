const LOCAL_CONFIG = {
    //Precio base en BRL por coin (Venta)
    basePricePerCoinBRL: 0.092 
};

let exchangeRates = {};
let currentCurrency = 'CLP';

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
        charNameInput.setAttribute('autocomplete', 'off');
        charNameInput.addEventListener('input', () => {
            const start = charNameInput.selectionStart;
            charNameInput.value = ROYAL_FORMATTERS.toTitleCase(charNameInput.value);
            charNameInput.setSelectionRange(start, start);

            const name = charNameInput.value.trim();
            generateVerifyLink(name, charNameInput);
        });
        charNameInput.addEventListener('change', () => {
             localStorage.setItem('savedCharName', charNameInput.value);
        });
    }
    
    if (buyButtons) {
        buyButtons.forEach(btn => btn.addEventListener('click', quickBuy));
    }
});

function generateVerifyLink(name, inputElement) {
    let feedbackDiv = inputElement.closest('.col-12').querySelector('.char-api-feedback');
    if (!feedbackDiv) {
        feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'char-api-feedback small mt-2'; 
        inputElement.closest('.input-group').after(feedbackDiv);
    }
    if (name.length > 0) {
        const url = `https://rubinot.com.br/?subtopic=characters&name=${encodeURIComponent(name)}`;
        feedbackDiv.innerHTML = `<div class="text-info"><i class="bi bi-box-arrow-up-right me-1"></i><a href="${url}" target="_blank" class="text-info text-decoration-underline">Verificar personaje en Rubinot</a></div>`;
    } else {
        feedbackDiv.innerHTML = '';
    }
}

function updatePaymentIcons() {
    const container = document.getElementById('paymentMethodIcons');
    if (!container) return;
    let icons = '';
    if (currentCurrency === 'BRL') {
        icons = '<span class="badge bg-success me-2"><i class="bi bi-qr-code"></i> PIX</span><span class="badge bg-secondary">Mercado Pago</span>';
    } else if (currentCurrency === 'CLP') {
        icons = '<span class="badge bg-primary"><i class="bi bi-bank2"></i> Mercado Pago</span> <span class="badge bg-secondary">Transferencia</span>';
    } else if (currentCurrency === 'USD' || currentCurrency === 'EUR') {
        icons = `<span class="badge bg-warning text-dark"><i class="bi bi-bank"></i> Wire Transfer</span> <span class="badge bg-light text-dark"><i class="bi bi-cash-stack"></i> Bank Deposit</span>`;
    } else {
        icons = '<span class="badge bg-secondary">Transferencia Bancaria</span>';
    }
    container.innerHTML = `<small class="text-secondary d-block mb-2">Métodos aceptados:</small> ${icons}`;
}

async function fetchExchangeRates() {
    if(dynamicPrices.length > 0) dynamicPrices.forEach(el => el.textContent = "...");
    if(priceOutput) priceOutput.value = "Cargando...";
    const url = 'https://economia.awesomeapi.com.br/last/BRL-USD,BRL-EUR,BRL-CLP,BRL-ARS';
    try {
        const response = await fetch(url);
        const data = await response.json();
        exchangeRates = {
            USD: parseFloat(data.BRLUSD.ask), EUR: parseFloat(data.BRLEUR.ask),
            CLP: parseFloat(data.BRLCLP.ask), ARS: parseFloat(data.BRLARS.ask), BRL: 1
        };
        if(currencySelector && currencySelector.value) currentCurrency = currencySelector.value;
        updateUI();
    } catch (error) { console.error(error); }
}

function calculatePrice(amount) {
    const baseBlockSize = 250;
    const priceInReales250 = baseBlockSize * LOCAL_CONFIG.basePricePerCoinBRL; 
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
    const details = ROYAL_CONFIG.currencies[currentCurrency] || { locale: 'en-US', symbol: '$' };
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

        if (charName.length === 0) {
            warningMsg.style.display = 'block';
            warningMsg.innerText = "❌ Debes escribir el nombre de tu personaje.";
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
            
            const currencyData = ROYAL_CONFIG.currencies[currentCurrency];
            const bankInfoText = currencyData ? currencyData.bankDetails : "Consultar.";
            const bankDetailsContainer = document.getElementById('modalBankDetails');

            bankDetailsContainer.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <span style="white-space: pre-line; text-align: left;">${bankInfoText}</span>
                    <button class="btn btn-sm btn-outline-primary ms-2 btn-copy" title="Copiar">
                        <i class="bi bi-clipboard"></i>
                    </button>
                </div>`;

            const copyBtn = bankDetailsContainer.querySelector('.btn-copy');
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(bankInfoText);
                copyBtn.innerHTML = '<i class="bi bi-check-lg"></i>';
                copyBtn.classList.remove('btn-outline-primary');
                copyBtn.classList.add('btn-success');
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
                    copyBtn.classList.remove('btn-success');
                    copyBtn.classList.add('btn-outline-primary');
                }, 2000);
            });

            const finalBtn = document.getElementById('btnConfirmWhatsapp');
            const newBtn = finalBtn.cloneNode(true);
            finalBtn.parentNode.replaceChild(newBtn, finalBtn);

            newBtn.addEventListener('click', () => {
                newBtn.disabled = true;
                const originalContent = newBtn.innerHTML;
                newBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> PROCESANDO...`;

                let message = `💠 *ORDEN DE COMPRA RUBINI* ${currencyData.flag}\n` +
                              `────────────────────────\n` +
                              `📦 *Producto:* Rubini Coins\n` +
                              `👤 *Personaje:* ${charName}\n` +
                              `💎 *Cantidad:* ${amount} RC\n` +
                              `💰 *Total a Pagar:* ${priceOutput.value}\n` +
                              `────────────────────────\n` +
                              `⚡ *Solicito entrega flash.*\n` +
                              `📎 *Adjunto mi comprobante:*`;
                              
                let url = `https://wa.me/${ROYAL_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
                
                setTimeout(() => {
                    const modalEl = document.getElementById('confirmModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if(modal) modal.hide();
                    newBtn.disabled = false;
                    newBtn.innerHTML = originalContent;
                }, 8000);
            });

            new bootstrap.Modal(document.getElementById('confirmModal')).show();

        } else {
            warningMsg.style.display = 'block';
            warningMsg.innerText = "Mínimo 250 RC.";
        }
    });
}