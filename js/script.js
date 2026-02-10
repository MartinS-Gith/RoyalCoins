const LOCAL_CONFIG = {
    //Precio base en EUR por coin (Venta)
    basePricePerCoinEUR: 0.04272 
};

let exchangeRates = {};
let currentCurrency = 'BRL';
let verificationTimer = null;

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

    const savedCurrency = localStorage.getItem('selectedCurrency');
    const savedChar = localStorage.getItem('savedCharName');
    if (savedCurrency && currencySelector) {
        currencySelector.value = savedCurrency;
        currentCurrency = savedCurrency;
    }
    if (savedChar && charNameInput) {
        charNameInput.value = savedChar;
    }

    if (coinInput) {
        coinInput.value = 250;
        coinInput.min = 250;
        coinInput.step = 250;
        coinInput.addEventListener('input', calculateCalculatorPrice);
        coinInput.addEventListener('change', () => {
            let amount = parseInt(coinInput.value);
            if (!amount || amount < 250) amount = 250;
            else amount = Math.round(amount / 250) * 250;
            coinInput.value = amount;
            calculateCalculatorPrice();
        });
    }

    if (charNameInput) {
        charNameInput.addEventListener('input', () => {
            const start = charNameInput.selectionStart;
            charNameInput.value = ROYAL_FORMATTERS.toTitleCase(charNameInput.value);
            charNameInput.setSelectionRange(start, start);

            clearTimeout(verificationTimer);
            charNameInput.classList.remove('is-valid', 'is-invalid');
            updateFeedbackMsg(charNameInput, 'clear');
            
            if (charNameInput.value.trim().length > 1) {
                updateFeedbackMsg(charNameInput, 'loading');
                verificationTimer = setTimeout(() => verifyTibiaCharacter(charNameInput.value.trim(), charNameInput), 800);
            }
        });
        charNameInput.addEventListener('change', () => {
             localStorage.setItem('savedCharName', charNameInput.value);
        });
    }

    fetchExchangeRates();

    if (currencySelector) {
        if (currencySelector.value) currentCurrency = currencySelector.value;
        currencySelector.addEventListener('change', (e) => {
            currentCurrency = e.target.value;
            localStorage.setItem('selectedCurrency', currentCurrency);
            updateUI(); 
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
    if (currentCurrency === 'BRL') {
        icons = `<span class="badge bg-success me-2"><i class="bi bi-qr-code"></i> PIX</span><span class="badge bg-secondary"><i class="bi bi-bank"></i> Mercado Pago</span>`;
    } else if (currentCurrency === 'CLP') {
        icons = `<span class="badge" style="background-color: #009ee3;"><i class="bi bi-phone"></i> Mercado Pago</span> <span class="badge bg-primary"><i class="bi bi-bank2"></i> Transferencia</span>`;
    } else if (currentCurrency === 'USD' || currentCurrency === 'EUR') {
        icons = `<span class="badge bg-warning text-dark"><i class="bi bi-bank"></i> Wire Transfer</span> <span class="badge bg-light text-dark"><i class="bi bi-cash-stack"></i> Bank Deposit</span>`;
    } else {
        icons = '<span class="badge bg-secondary">Transferencia Bancaria</span>';
    }
    container.innerHTML = `<small class="text-secondary d-block mb-2 font-medieval">MÉTODOS ACEPTADOS:</small> ${icons}`;
}

function updateFeedbackMsg(inputElement, status, extraText = '') {
    let feedbackDiv = inputElement.closest('.col-12').querySelector('.char-api-feedback');
    if (!feedbackDiv) {
        feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'char-api-feedback small mt-2 fw-bold';
        inputElement.closest('.input-group').after(feedbackDiv);
    }
    if (status === 'loading') {
        feedbackDiv.style.color = '#adb5bd'; 
        feedbackDiv.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Buscando personaje...';
    } else if (status === 'success') {
        feedbackDiv.style.color = '#25d366';
        feedbackDiv.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> Verificado: ${extraText}`;
    } else if (status === 'error') {
        feedbackDiv.style.color = '#dc3545';
        feedbackDiv.innerHTML = `<i class="bi bi-x-circle-fill me-1"></i> Verifique Personaje (si existe, continuar).`;
    } else if (status === 'clear') {
        feedbackDiv.innerHTML = '';
    }
}

async function verifyTibiaCharacter(name, inputElement) {
    try {
        const response = await fetch(`https://api.tibiadata.com/v4/character/${encodeURIComponent(name)}`);
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        if (data?.character?.character?.name) {
            inputElement.classList.add('is-valid');
            inputElement.classList.remove('is-invalid');
            updateFeedbackMsg(inputElement, 'success', data.character.character.name);
        } else {
            inputElement.classList.add('is-invalid');
            inputElement.classList.remove('is-valid');
            updateFeedbackMsg(inputElement, 'error');
        }
    } catch (error) {
        inputElement.classList.remove('is-valid');
        inputElement.classList.add('is-invalid');
        updateFeedbackMsg(inputElement, 'error');
    }
}

async function fetchExchangeRates() {
    dynamicPrices.forEach(el => el.textContent = "...");
    if(priceOutput) priceOutput.value = "Cargando...";
    const url = 'https://economia.awesomeapi.com.br/last/EUR-BRL,EUR-USD,BRL-CLP,BRL-ARS';
    try {
        const response = await fetch(url);
        const data = await response.json();
        const eurToBrl = parseFloat(data.EURBRL.ask);
        exchangeRates = {
            EUR: 1, BRL: eurToBrl, USD: parseFloat(data.EURUSD.ask),
            CLP: eurToBrl * parseFloat(data.BRLCLP.ask), ARS: eurToBrl * parseFloat(data.BRLARS.ask)
        };
        exchangeRates['VEF'] = 8.0;
        updateUI();
    } catch (error) { console.error('Error API:', error); }
}

function calculatePrice(tibiaCoins) {
    const baseBlockSize = 250;
    const blockPriceEur = baseBlockSize * LOCAL_CONFIG.basePricePerCoinEUR;
    const rate = exchangeRates[currentCurrency] || 1;
    const rawBlockPrice = blockPriceEur * rate;
    let roundedBlockPrice = 0;
    if (['CLP', 'ARS'].includes(currentCurrency)) roundedBlockPrice = Math.floor(rawBlockPrice / 100) * 100;
    else if (currentCurrency === 'BRL') roundedBlockPrice = Math.floor(rawBlockPrice); 
    else if (['UYU', 'VEF'].includes(currentCurrency)) roundedBlockPrice = Math.floor(rawBlockPrice / 10) * 10;
    else roundedBlockPrice = Math.floor(rawBlockPrice * 100) / 100;
    return (tibiaCoins / baseBlockSize) * roundedBlockPrice;
}

function formatCurrency(value) {
    const details = ROYAL_CONFIG.currencies[currentCurrency] || { locale: 'en-US', symbol: '$' };
    const noDecimals = ['CLP', 'ARS', 'UYU', 'VEF'].includes(currentCurrency);
    const formattedValue = new Intl.NumberFormat(details.locale, { 
        style: 'currency', currency: currentCurrency, minimumFractionDigits: noDecimals ? 0 : 2, maximumFractionDigits: noDecimals ? 0 : 2
    }).format(value);
    return currentCurrency === 'BRL' ? formattedValue : `${formattedValue} ${currentCurrency}`;
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
    } else if (!amount) {
        priceOutput.value = formatCurrency(0);
        warningMsg.style.display = 'none';
    } else {
        coinInput.classList.add('is-invalid');
        priceOutput.value = "---";
    }
}

function quickBuy(event) {
    let coins = event.target.getAttribute('data-coins');
    if (coinInput) {
        coinInput.value = coins;
        calculateCalculatorPrice();
        document.getElementById('calculadora').scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => charNameInput.focus(), 500);
    }
}

if (startPaymentBtn) {
    startPaymentBtn.addEventListener('click', () => {
        let amount = coinInput.value;
        let charName = charNameInput.value.trim();
        
        if (checkTerms && !checkTerms.checked) {
            warningMsg.style.display = 'block';
            warningMsg.innerText = "⚠️ Debes aceptar los Términos de Compra.";
            return;
        }
        if (charName.length === 0) {
            warningMsg.style.display = 'block';
            warningMsg.innerText = "Ingresa el nombre de tu personaje.";
            charNameInput.focus();
            return;
        }
        
        if (amount >= 250 && amount % 250 === 0) {
            warningMsg.style.display = 'none';
            document.getElementById('modalAmount').innerText = `${amount} TC`;
            document.getElementById('modalPrice').innerText = priceOutput.value;
            document.getElementById('modalChar').innerText = charName;
            
            const currencyData = ROYAL_CONFIG.currencies[currentCurrency];
            const bankInfoText = currencyData ? currencyData.bankDetails : "Consultar por interno.";
            const bankDetailsContainer = document.getElementById('modalBankDetails');
            
            bankDetailsContainer.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <span style="white-space: pre-line; text-align: left;">${bankInfoText}</span>
                    <button class="btn btn-sm btn-outline-light ms-2 btn-copy" title="Copiar">
                        <i class="bi bi-clipboard"></i>
                    </button>
                </div>`;
            
            const copyBtn = bankDetailsContainer.querySelector('.btn-copy');
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(bankInfoText);
                copyBtn.innerHTML = '<i class="bi bi-check-lg"></i>';
                copyBtn.classList.remove('btn-outline-light');
                copyBtn.classList.add('btn-success');
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
                    copyBtn.classList.remove('btn-success');
                    copyBtn.classList.add('btn-outline-light');
                }, 2000);
            });

            const finalBtn = document.getElementById('btnConfirmWhatsapp');
            const newBtn = finalBtn.cloneNode(true);
            finalBtn.parentNode.replaceChild(newBtn, finalBtn);

            newBtn.addEventListener('click', () => {
                newBtn.disabled = true;
                const originalContent = newBtn.innerHTML;
                newBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> PROCESANDO...`;

                let message = `👑 *ORDEN DE COMPRA TIBIA COINS* ${currencyData.flag}\n` +
                              `────────────────────────\n` +
                              `📦 *Producto:* Tibia Coins\n` +
                              `👤 *Personaje:* ${charName}\n` +
                              `💎 *Cantidad:* ${amount} TC\n` +
                              `💰 *Total a Pagar:* ${priceOutput.value}\n` +
                              `────────────────────────\n` +
                              `📎 *Adjunto mi comprobante de pago:*\n` +
                              `(Esperando validación...)`;
                              
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

            const myModal = new bootstrap.Modal(document.getElementById('confirmModal'));
            myModal.show();

        } else {
            warningMsg.style.display = 'block';
            warningMsg.innerText = "La cantidad debe ser múltiplo de 250.";
            coinInput.focus();
        }
    });
}