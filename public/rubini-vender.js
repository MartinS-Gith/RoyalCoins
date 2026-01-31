const CONFIG_SELL = {
    whatsappNumber: "56967894789", 
    baseBuyPricePerCoinBRL: 0.076, 
    currencies: {
        BRL: { locale: 'pt-BR', symbol: 'R$' },
        USD: { locale: 'en-US', symbol: '$' },
        EUR: { locale: 'de-DE', symbol: '€' },
        CLP: { locale: 'es-CL', symbol: 'CLP' },
        ARS: { locale: 'es-AR', symbol: '$' }
    }
};

const BANKING_OPTIONS = {
    'CLP': { methods: ['Banco Estado (Cuenta RUT)', 'Banco Santander', 'Banco de Chile', 'BCI', 'Mercado Pago', 'Otro'], labels: { doc: 'RUT', account: 'N° Cuenta' }, showAccountType: true },
    'BRL': { methods: ['PIX', 'PicPay', 'Mercado Pago', 'Nubank'], labels: { doc: 'CPF', account: 'Chave PIX' }, showAccountType: false },
    'ARS': { methods: ['Mercado Pago', 'Transferencia CBU', 'Ualá'], labels: { doc: 'DNI', account: 'CBU / Alias' }, showAccountType: false },
    'USD': { methods: ['Binance Pay', 'USDT', 'Wise'], labels: { doc: 'ID', account: 'Email / Wallet' }, showAccountType: false },
    'EUR': { methods: ['Binance Pay', 'Revolut', 'Wise'], labels: { doc: 'ID', account: 'IBAN' }, showAccountType: false }
};

let exchangeRates = {};
let currentCurrency = 'CLP';
let rubiniTimer = null;
let isCharVerified = false;

const sellInput = document.getElementById('sellInput');
const payoutOutput = document.getElementById('payoutOutput');
const sellerCharName = document.getElementById('sellerCharName');
const currencySelector = document.getElementById('currencySelector');
const sendOfferBtn = document.getElementById('sendOfferBtn');
const sellWarning = document.getElementById('sellWarning');
const bankTypeSelector = document.getElementById('bankTypeSelector');
const inputDocId = document.getElementById('inputDocId');
const inputAccountNumber = document.getElementById('inputAccountNumber');
const inputAccountType = document.getElementById('inputAccountType');
const inputHolderName = document.getElementById('inputHolderName');
const checkTerms = document.getElementById('checkTerms');

document.addEventListener('DOMContentLoaded', () => {
    checkBusinessStatus();
    setInterval(checkBusinessStatus, 60000);
    fetchExchangeRates();
    updateBankForm();

    if (currencySelector) currencySelector.addEventListener('change', (e) => { currentCurrency = e.target.value; calculatePayout(); updateBankForm(); });
    if (sellInput) {
        sellInput.addEventListener('input', calculatePayout);
        sellInput.addEventListener('change', () => {
            let amount = parseInt(sellInput.value);
            if (!amount || amount < 250) sellInput.value = 250;
            else sellInput.value = Math.round(amount / 250) * 250;
            calculatePayout();
        });
    }

    if (sellerCharName) {
        sellerCharName.addEventListener('input', () => {
            clearTimeout(rubiniTimer);
            sellerCharName.classList.remove('is-valid', 'is-invalid');
            
            isCharVerified = false;
            updateFeedbackMsg(sellerCharName, 'clear');

            if (sellerCharName.value.trim().length > 0) {
                updateFeedbackMsg(sellerCharName, 'loading');
                rubiniTimer = setTimeout(() => validateRubiniFormat(sellerCharName.value.trim(), sellerCharName), 600);
            }
        });
    }

    if (bankTypeSelector) {
        bankTypeSelector.addEventListener('change', function() {
            if (this.value.toLowerCase().includes('otro')) document.getElementById('otherBankContainer').style.display = 'block';
            else document.getElementById('otherBankContainer').style.display = 'none';
            if (currentCurrency === 'CLP') updateAccountTypeOptions();
        });
    }
    
    if (sendOfferBtn) sendOfferBtn.addEventListener('click', generateWhatsAppLink);
});

function updateBankForm() {
    const config = BANKING_OPTIONS[currentCurrency] || BANKING_OPTIONS['CLP'];
    if (!bankTypeSelector) return;
    
    bankTypeSelector.innerHTML = '';
    config.methods.forEach(method => {
        const option = document.createElement('option');
        option.value = method; option.text = method; bankTypeSelector.appendChild(option);
    });
    const otherBank = document.getElementById('otherBankContainer');
    if (otherBank) otherBank.style.display = 'none';
    
    if (document.getElementById('labelDocId')) document.getElementById('labelDocId').innerText = config.labels.doc;
    if (document.getElementById('labelAccountNum')) document.getElementById('labelAccountNum').innerText = config.labels.account;
    
    const accountTypeContainer = document.getElementById('accountTypeContainer');
    if (accountTypeContainer) accountTypeContainer.style.display = config.showAccountType ? 'block' : 'none';
    
    if (currentCurrency === 'CLP') updateAccountTypeOptions();
}

function updateAccountTypeOptions() {
    if (!inputAccountType) return;
    inputAccountType.innerHTML = ''; 
    ['Cuenta RUT', 'Cuenta Corriente', 'Cuenta Vista', 'Ahorro'].forEach(opt => {
        const option = document.createElement('option');
        option.value = opt; option.text = opt; inputAccountType.appendChild(option);
    });
}

async function validateRubiniFormat(name, inputElement) {
    const apiUrl = `http://localhost:3000/check-char?name=${encodeURIComponent(name)}`;
    
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Error server");
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
        isCharVerified = false;
        updateFeedbackMsg(inputElement, 'warning-network', name);
    }
}

function updateFeedbackMsg(inputElement, status, charName = '') {
    let feedbackDiv = inputElement.closest('.mb-3').querySelector('.char-api-feedback');
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
                <span>✅ Vendedor verificado.</span>
                <a href="${rubinotUrl}" target="_blank" class="text-secondary"><i class="bi bi-box-arrow-up-right"></i></a>
            </div>`;
    } else if (status === 'error-notfound') {
        feedbackDiv.style.color = '#dc3545'; 
        feedbackDiv.innerHTML = '<i class="bi bi-x-circle-fill me-1"></i>Personaje NO existe en Rubinot.';
    } else if (status === 'warning-network') {
        feedbackDiv.style.color = '#ffc107'; 
        feedbackDiv.innerHTML = '<i class="bi bi-wifi-off me-1"></i>Error conexión. Intenta de nuevo.';
    } else if (status === 'clear') {
        feedbackDiv.innerHTML = '';
    }
}

function checkBusinessStatus() {
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('statusDot');
    
    if (!statusText || !statusDot) return;

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
    if(payoutOutput) payoutOutput.value = "Cargando...";
     const url = 'https://economia.awesomeapi.com.br/last/BRL-USD,BRL-EUR,BRL-CLP,BRL-ARS';
    try {
        const response = await fetch(url);
        const data = await response.json();
        exchangeRates = { BRL: 1, USD: parseFloat(data.BRLUSD.bid), EUR: parseFloat(data.BRLEUR.bid), CLP: parseFloat(data.BRLCLP.bid), ARS: parseFloat(data.BRLARS.bid) };
        if(currencySelector) currentCurrency = currencySelector.value;
        calculatePayout();
    } catch (e) { console.error(e); }
}

function calculatePayout() {
    if (!sellInput || !payoutOutput) return;
    let amount = parseFloat(sellInput.value);
    
    if (amount && amount >= 250) { 
        const valueInBrl = amount * CONFIG_SELL.baseBuyPricePerCoinBRL;
        const rate = exchangeRates[currentCurrency] || 1;
        let finalValue = valueInBrl * rate;

        const noDecimals = ['CLP', 'ARS'].includes(currentCurrency);
        
        if (noDecimals) {
            finalValue = Math.round(finalValue);
        }

        const formatted = new Intl.NumberFormat(CONFIG_SELL.currencies[currentCurrency].locale, { 
            style: 'currency', 
            currency: currentCurrency,
            minimumFractionDigits: noDecimals ? 0 : 2,
            maximumFractionDigits: noDecimals ? 0 : 2
        }).format(finalValue);
        
        payoutOutput.value = `${formatted} ${currentCurrency}`;
    } else {
        payoutOutput.value = "---";
    }
}

function generateWhatsAppLink() {
    if (!isCharVerified) {
        sellWarning.innerText = "❌ Debes validar el personaje para continuar."; 
        sellWarning.style.display = 'block'; 
        sellerCharName.classList.add('is-invalid');
        return;
    }

    if (!checkTerms.checked) {
        sellWarning.innerText = "⚠️ Acepta términos."; sellWarning.style.display = 'block'; return;
    }
    if (sellerCharName.value.trim().length === 0) {
        sellWarning.innerText = "❌ Falta nombre."; sellWarning.style.display = 'block'; return;
    }

    const amount = sellInput.value;
    const charName = sellerCharName.value.trim();
    const totalPayout = payoutOutput.value;
    const msg = `Hola RoyalCoins, VENDO RUBINI COINS: ${amount} RC por ${totalPayout}. Char: ${charName}`;
    const whatsappUrl = `https://wa.me/${CONFIG_SELL.whatsappNumber}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
}