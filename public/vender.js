const CONFIG_SELL = {
    whatsappNumber: "56967894789",
    //Precio base en EUR por coin (Compra)
    baseBuyPricePerCoinEUR: 0.037, 
    currencies: {
        EUR: { locale: 'de-DE', symbol: '€' },
        BRL: { locale: 'pt-BR', symbol: 'R$' },
        USD: { locale: 'en-US', symbol: '$' },
        CLP: { locale: 'es-CL', symbol: 'CLP' },
        ARS: { locale: 'es-AR', symbol: '$' }
    }
};

const BANKING_OPTIONS = {
    'CLP': {
        methods: [
            'Banco Estado (Cuenta RUT)', 'Banco Santander', 'Banco de Chile', 'BCI', 'Itaú', 
            'Scotiabank', 'Banco Falabella', 'Banco Security', 'Banco Bice', 'Tenpo', 
            'Mach', 'Mercado Pago', 'Otro Banco Chileno'
        ],
        labels: { doc: 'RUT', account: 'N° Cuenta' },
        showAccountType: true
    },
    'BRL': {
        methods: [
            'PIX', 'PicPay', 'Mercado Pago Brasil', 
            'Nubank', 'Banco Inter'
        ],
        labels: { doc: 'CPF (Opcional)', account: 'Chave PIX' },
        showAccountType: false
    },
    'ARS': {
        methods: [
            'Mercado Pago', 'Transferencia CBU', 'Ualá', 'Lemon Cash', 'Brubank', 'Naranja X'
        ],
        labels: { doc: 'DNI/CUIL', account: 'CBU / CVU / Alias' },
        showAccountType: false
    },
    'USD': {
        methods: [
            'Binance Pay', 'USDT (TRC20)', 'Wise'
        ],
        labels: { doc: 'ID (Opcional)', account: 'Email / Wallet' },
        showAccountType: false
    },
    'EUR': {
        methods: [
            'Binance Pay', 'SEPA Transfer', 'Revolut', 'Wise'
        ],
        labels: { doc: 'ID (Opcional)', account: 'IBAN / Email' },
        showAccountType: false
    }
};

let exchangeRates = {};
let currentCurrency = 'CLP';
let verificationTimer = null;

const sellInput = document.getElementById('sellInput');
const payoutOutput = document.getElementById('payoutOutput');
const sellerCharName = document.getElementById('sellerCharName');
const currencySelector = document.getElementById('currencySelector');
const sendOfferBtn = document.getElementById('sendOfferBtn');
const sellWarning = document.getElementById('sellWarning');

const bankTypeSelector = document.getElementById('bankTypeSelector');
const labelDocId = document.getElementById('labelDocId');
const inputDocId = document.getElementById('inputDocId');
const labelAccountNum = document.getElementById('labelAccountNum');
const inputAccountNumber = document.getElementById('inputAccountNumber');
const accountTypeContainer = document.getElementById('accountTypeContainer');
const inputAccountType = document.getElementById('inputAccountType');
const inputHolderName = document.getElementById('inputHolderName');
const otherBankContainer = document.getElementById('otherBankContainer');
const inputOtherBank = document.getElementById('inputOtherBank');
const checkTerms = document.getElementById('checkTerms');

document.addEventListener('DOMContentLoaded', () => {
    checkBusinessStatus();
    setInterval(checkBusinessStatus, 60000);
    fetchExchangeRates();
    updateBankForm(); 

    if (currencySelector) {
        currencySelector.addEventListener('change', (e) => {
            currentCurrency = e.target.value;
            calculatePayout(); 
            updateBankForm(); 
        });
    }

    if (sellInput) {
        sellInput.addEventListener('input', calculatePayout);
        sellInput.addEventListener('change', () => {
            let amount = parseInt(sellInput.value);
            if (!amount || amount < 250) amount = 250;
            else amount = Math.round(amount / 250) * 250;
            sellInput.value = amount;
            calculatePayout();
        });
    }

    if (sellerCharName) {
        sellerCharName.addEventListener('input', () => {
            clearTimeout(verificationTimer);
            sellerCharName.classList.remove('is-valid', 'is-invalid');
            updateFeedbackMsg(sellerCharName, 'clear');

            if (sellerCharName.value.trim().length > 1) {
                updateFeedbackMsg(sellerCharName, 'loading');
                verificationTimer = setTimeout(() => verifyTibiaCharacter(sellerCharName.value.trim(), sellerCharName), 800);
            }
        });
    }

    if (bankTypeSelector) {
        bankTypeSelector.addEventListener('change', function() {
            const value = this.value.toLowerCase();
            
            if (value.includes('otro') || value.includes('other')) {
                otherBankContainer.style.display = 'block';
                inputOtherBank.focus();
            } else {
                otherBankContainer.style.display = 'none';
                inputOtherBank.value = '';
            }

            if (currentCurrency === 'CLP') {
                updateAccountTypeOptions();
            }
        });
    }

    if(inputDocId) {
        inputDocId.addEventListener('input', function(e) {
            if(currentCurrency === 'CLP') {
                let value = this.value.replace(/[^0-9kK]/g, '');
                if (value.length > 1) {
                    value = value.slice(0, -1) + '-' + value.slice(-1);
                }
                this.value = value;
            }
        });
    }

    if (sendOfferBtn) {
        sendOfferBtn.addEventListener('click', generateWhatsAppLink);
    }
});

function updateBankForm() {
    const config = BANKING_OPTIONS[currentCurrency] || BANKING_OPTIONS['CLP'];
    bankTypeSelector.innerHTML = '';
    
    config.methods.forEach(method => {
        const option = document.createElement('option');
        option.value = method;
        option.text = method;
        bankTypeSelector.appendChild(option);
    });

    otherBankContainer.style.display = 'none';
    inputOtherBank.value = '';

    labelDocId.innerText = config.labels.doc;
    inputDocId.placeholder = `Ingrese su ${config.labels.doc}`;
    labelAccountNum.innerText = config.labels.account;
    inputAccountNumber.placeholder = `Ingrese su ${config.labels.account}`;
    
    accountTypeContainer.style.display = config.showAccountType ? 'block' : 'none';

    if (currentCurrency === 'CLP') {
        updateAccountTypeOptions();
    }
}

function updateAccountTypeOptions() {
    if (!inputAccountType) return;
    const currentBank = bankTypeSelector.value;
    inputAccountType.innerHTML = ''; 

    let options = [];
    if (currentBank.includes('Banco Estado')) {
        options = ['Cuenta RUT', 'Cuenta Corriente', 'Cuenta Vista', 'Ahorro'];
    } else {
        options = ['Cuenta Corriente', 'Cuenta Vista', 'Ahorro'];
    }

    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.text = opt;
        inputAccountType.appendChild(option);
    });
}

function updateFeedbackMsg(inputElement, status, extraText = '') {
    let feedbackDiv = inputElement.closest('.mb-3').querySelector('.char-api-feedback');
    if (!feedbackDiv) {
        feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'char-api-feedback small mt-2 fw-bold';
        inputElement.closest('.input-group').after(feedbackDiv);
    }
    if (status === 'loading') {
        feedbackDiv.style.color = '#adb5bd';
        feedbackDiv.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Buscando...';
    } else if (status === 'success') {
        feedbackDiv.style.color = '#25d366';
        feedbackDiv.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> Verificado: ${extraText}`;
    } else if (status === 'error') {
        feedbackDiv.style.color = '#dc3545';
        feedbackDiv.innerHTML = `<i class="bi bi-x-circle-fill me-1"></i> El personaje no existe.`;
    } else if (status === 'api-error') {
        feedbackDiv.style.color = '#ffc107'; 
        feedbackDiv.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i> Error de conexión.`;
    } else if (status === 'clear') {
        feedbackDiv.innerHTML = '';
    }
}

async function verifyTibiaCharacter(name, inputElement) {
    try {
        const response = await fetch(`https://api.tibiadata.com/v4/character/${encodeURIComponent(name)}`);
        const data = await response.json();
        if (data.character && data.character.character && data.character.character.name) {
            inputElement.classList.add('is-valid');
            const realName = data.character.character.name;
            inputElement.value = realName;
            updateFeedbackMsg(inputElement, 'success', realName);
        } else {
            inputElement.classList.add('is-invalid');
            updateFeedbackMsg(inputElement, 'error');
        }
    } catch (error) {
        updateFeedbackMsg(inputElement, 'api-error');
    }
}

function validarRut(rut) {
    if (!/^[0-9]+[-|‐]{1}[0-9kK]{1}$/.test(rut)) return false;
    let tmp = rut.split('-');
    let digv = tmp[1];
    let rutCuerpo = tmp[0];
    if (digv == 'K') digv = 'k';
    
    let M = 0, S = 1;
    for (; rutCuerpo; rutCuerpo = Math.floor(rutCuerpo / 10))
        S = (S + rutCuerpo % 10 * (9 - M++ % 6)) % 11;
    
    return S ? S - 1 == digv : 'k' == digv;
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
    if(payoutOutput) payoutOutput.value = "Cargando...";
    const url = 'https://economia.awesomeapi.com.br/last/EUR-USD,USD-BRL,USD-CLP,USD-ARS';
    try {
        const response = await fetch(url);
        const data = await response.json();
        const eurToUsd = parseFloat(data.EURUSD.bid);
        exchangeRates = {
            EUR: 1,
            USD: eurToUsd, 
            BRL: eurToUsd * parseFloat(data.USDBRL.bid),
            CLP: eurToUsd * parseFloat(data.USDCLP.bid),
            ARS: eurToUsd * parseFloat(data.USDARS.bid)
        };
        if(currencySelector && currencySelector.value) currentCurrency = currencySelector.value;
        calculatePayout();
    } catch (error) {
        console.error('Error API:', error);
        if(payoutOutput) payoutOutput.value = "Error API";
    }
}

function calculatePayout() {
    if (!sellInput || !payoutOutput) return;
    let amount = parseFloat(sellInput.value);
    
    if (amount && amount >= 250) { 
        sellWarning.style.display = 'none';
        const valueInEur = amount * CONFIG_SELL.baseBuyPricePerCoinEUR;
        const rate = exchangeRates[currentCurrency] || 1;
        let finalPayout = valueInEur * rate;

        if (['CLP', 'ARS'].includes(currentCurrency)) {
            finalPayout = Math.floor(finalPayout / 100) * 100;
        } else {
            finalPayout = Math.floor(finalPayout * 10) / 10;
        }

        const details = CONFIG_SELL.currencies[currentCurrency] || CONFIG_SELL.currencies['EUR'];
        const isNoDecimal = ['CLP', 'ARS'].includes(currentCurrency);
        const formatted = new Intl.NumberFormat(details.locale, {
            style: 'currency', currency: currentCurrency, minimumFractionDigits: isNoDecimal ? 0 : 2
        }).format(finalPayout);
        
        payoutOutput.value = `${formatted} ${currentCurrency}`;
    } else {
        payoutOutput.value = "---";
    }
}

function generateWhatsAppLink() {
    const amount = sellInput.value;
    const charName = sellerCharName.value.trim();
    const totalPayout = payoutOutput.value;
    
    let bankMethod = bankTypeSelector.value;
    const holder = inputHolderName.value.trim();
    const docId = inputDocId.value.trim();
    const accountNum = inputAccountNumber.value.trim();
    const specificBank = inputOtherBank.value.trim();
    
    let errorMsg = "";

    if (!checkTerms.checked) {
        sellWarning.innerText = "⚠️ Debes aceptar los términos y condiciones.";
        sellWarning.style.display = 'block';
        return;
    }

    if (sellerCharName.classList.contains('is-invalid')) errorMsg = "❌ Nombre de personaje inválido.";
    else if (!holder || holder.length < 3) errorMsg = "❌ Nombre del titular incompleto.";
    else if (!accountNum) errorMsg = "❌ Falta el número de cuenta/clave.";
    
    if (otherBankContainer.style.display !== 'none') {
        if (!specificBank) {
            errorMsg = "❌ Especifique el nombre del banco.";
        } else {
            bankMethod = `${bankMethod} (${specificBank})`;
        }
    }

    if (!errorMsg) {
        if (currentCurrency === 'CLP') {
            if (!validarRut(docId)) errorMsg = "❌ El RUT ingresado no es válido.";
        } else if (currentCurrency === 'BRL') {
            if (docId.length < 3 && bankMethod.includes('PIX')) errorMsg = "❌ Falta CPF o Chave PIX.";
        }
    }

    if (errorMsg) {
        sellWarning.innerText = errorMsg;
        sellWarning.style.display = 'block';
        return;
    }

    let bankDetails = `🏦 *Método:* ${bankMethod}\n👤 *Titular:* ${holder}\n🆔 *ID:* ${docId}\n🔢 *Cuenta/Key:* ${accountNum}`;
    
    if (currentCurrency === 'CLP' && inputAccountType && accountTypeContainer.style.display !== 'none') {
        bankDetails += `\n📋 *Tipo:* ${inputAccountType.value}`;
    }

    const msg = `Hola RoyalCoins, *QUIERO VENDER TIBIA COINS* 💰\n\n` +
                `💎 Cantidad: *${amount} TC*\n` +
                `💵 Recibiré: *${totalPayout}*\n` +
                `👤 Char: *${charName}*\n\n` +
                `*Datos de Pago:*\n${bankDetails}`;

    document.getElementById('modalAmount').innerText = `${amount} TC`;
    document.getElementById('modalPayout').innerText = totalPayout;
    document.getElementById('modalChar').innerText = charName;
    
    let modalBankInfo = `${bankMethod}\n${holder}\n${accountNum}`;
    if(currentCurrency === 'CLP' && inputAccountType.value) modalBankInfo += `\n${inputAccountType.value}`;
    document.getElementById('modalBankDetails').innerText = modalBankInfo;

    const finalBtn = document.getElementById('btnConfirmWhatsapp');
    const whatsappUrl = `https://wa.me/${CONFIG_SELL.whatsappNumber}?text=${encodeURIComponent(msg)}`;

    const newBtn = finalBtn.cloneNode(true);
    finalBtn.parentNode.replaceChild(newBtn, finalBtn);

    newBtn.addEventListener('click', () => {
        window.open(whatsappUrl, '_blank');
        const modalEl = document.getElementById('confirmModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
    });

    const myModal = new bootstrap.Modal(document.getElementById('confirmModal'));
    myModal.show();
}