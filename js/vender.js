const LOCAL_CONFIG_SELL = {
    // Precio base en EUR por TC (Compra)
    baseBuyPricePerCoinEUR: 0.037
};

let exchangeRates = {};
let currentCurrency = 'CLP';
let verificationTimer = null;

let refDocInput = document.getElementById('inputDocId');
let refAccountInput = document.getElementById('inputAccountNumber');
let refHolderInput = document.getElementById('inputHolderName');

const sellInput = document.getElementById('sellInput');
const payoutOutput = document.getElementById('payoutOutput');
const sellerCharName = document.getElementById('sellerCharName');
const currencySelector = document.getElementById('currencySelector');
const sendOfferBtn = document.getElementById('sendOfferBtn');
const sellWarning = document.getElementById('sellWarning');
const bankTypeSelector = document.getElementById('bankTypeSelector');
const accountTypeContainer = document.getElementById('accountTypeContainer');
const inputAccountType = document.getElementById('inputAccountType');
const otherBankContainer = document.getElementById('otherBankContainer');
const inputOtherBank = document.getElementById('inputOtherBank');
const checkTerms = document.getElementById('checkTerms');
const inputEmail = document.getElementById('inputEmail');

document.addEventListener('DOMContentLoaded', () => {
    checkBusinessStatus();
    setInterval(checkBusinessStatus, 60000);
    fetchExchangeRates();
    updateBankForm(); 

    if (refDocInput && refAccountInput && refHolderInput) {
        const refs = ROYAL_FORMATTERS.applyInputMasks(currentCurrency, {
            docInput: refDocInput, accountInput: refAccountInput, holderInput: refHolderInput
        });
        refDocInput = refs.docInput; refAccountInput = refs.accountInput; refHolderInput = refs.holderInput;
    }

    if (currencySelector) {
        currencySelector.addEventListener('change', (e) => {
            currentCurrency = e.target.value;
            calculatePayout();
            updateBankForm();
            if (refDocInput && refAccountInput) {
                const refs = ROYAL_FORMATTERS.applyInputMasks(currentCurrency, {
                    docInput: refDocInput, accountInput: refAccountInput, holderInput: refHolderInput
                });
                refDocInput = refs.docInput; refAccountInput = refs.accountInput;
            }
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
            const start = sellerCharName.selectionStart;
            sellerCharName.value = ROYAL_FORMATTERS.toTitleCase(sellerCharName.value);
            sellerCharName.setSelectionRange(start, start);

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
            if (currentCurrency === 'CLP') updateAccountTypeOptions();
        });
    }

    if (sendOfferBtn) sendOfferBtn.addEventListener('click', generateWhatsAppLink);
});

function updateBankForm() {
    const config = ROYAL_CONFIG.bankingOptions[currentCurrency] || ROYAL_CONFIG.bankingOptions['CLP'];
    bankTypeSelector.innerHTML = '';
    config.methods.forEach(method => {
        const option = document.createElement('option');
        option.value = method; option.text = method; bankTypeSelector.appendChild(option);
    });
    otherBankContainer.style.display = 'none';
    inputOtherBank.value = '';
    
    document.getElementById('labelDocId').innerText = config.labels.doc;
    refDocInput.placeholder = `Ingrese su ${config.labels.doc}`;
    document.getElementById('labelAccountNum').innerText = config.labels.account;
    refAccountInput.placeholder = `Ingrese su ${config.labels.account}`;
    
    accountTypeContainer.style.display = config.showAccountType ? 'block' : 'none';
    if (currentCurrency === 'CLP') updateAccountTypeOptions();
}

function updateAccountTypeOptions() {
    if (!inputAccountType) return;
    const currentBank = bankTypeSelector.value;
    inputAccountType.innerHTML = ''; 
    let options = currentBank.includes('Banco Estado') ? ['Cuenta RUT', 'Cuenta Corriente', 'Cuenta Vista', 'Ahorro'] : ['Cuenta Corriente', 'Cuenta Vista', 'Ahorro'];
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt; option.text = opt; inputAccountType.appendChild(option);
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
        feedbackDiv.innerHTML = `<i class="bi bi-x-circle-fill me-1"></i> No encontrado (Verifica el nombre).`;
    } else if (status === 'clear') feedbackDiv.innerHTML = '';
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
            inputElement.classList.remove('is-valid');
            inputElement.classList.add('is-invalid');
            updateFeedbackMsg(inputElement, 'error');
        }
    } catch (error) {
        inputElement.classList.remove('is-valid');
        updateFeedbackMsg(inputElement, 'error');
    }
}

function validarRut(rut) {
    rut = rut.replace(/\./g, '');
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

async function fetchExchangeRates() {
    if(payoutOutput) payoutOutput.value = "Cargando...";
    const url = 'https://economia.awesomeapi.com.br/last/EUR-USD,USD-BRL,USD-CLP,USD-ARS';
    try {
        const response = await fetch(url);
        const data = await response.json();
        const eurToUsd = parseFloat(data.EURUSD.bid);
        exchangeRates = {
            EUR: 1, USD: eurToUsd, 
            BRL: eurToUsd * parseFloat(data.USDBRL.bid), CLP: eurToUsd * parseFloat(data.USDCLP.bid), ARS: eurToUsd * parseFloat(data.USDARS.bid)
        };
        if(currencySelector && currencySelector.value) currentCurrency = currencySelector.value;
        calculatePayout();
    } catch (error) { if(payoutOutput) payoutOutput.value = "Error API"; }
}

function calculatePayout() {
    if (!sellInput || !payoutOutput) return;
    let amount = parseFloat(sellInput.value);
    if (amount && amount >= 250) { 
        sellWarning.style.display = 'none';
        const valueInEur = amount * LOCAL_CONFIG_SELL.baseBuyPricePerCoinEUR;
        const rate = exchangeRates[currentCurrency] || 1;
        let finalPayout = valueInEur * rate;
        if (['CLP', 'ARS'].includes(currentCurrency)) finalPayout = Math.floor(finalPayout / 100) * 100;
        else finalPayout = Math.floor(finalPayout * 10) / 10;
        const formatted = new Intl.NumberFormat(ROYAL_CONFIG.currencies[currentCurrency].locale, {
            style: 'currency', currency: currentCurrency, minimumFractionDigits: ['CLP', 'ARS'].includes(currentCurrency) ? 0 : 2
        }).format(finalPayout);
        payoutOutput.value = `${formatted} ${currentCurrency}`;
    } else { payoutOutput.value = "---"; }
}

function generateWhatsAppLink() {
    const holder = refHolderInput.value.trim();
    const docId = refDocInput.value.trim();
    const accountNum = refAccountInput.value.trim();
    const amount = sellInput.value;
    const charName = sellerCharName.value.trim();
    const email = inputEmail.value.trim();
    let bankMethod = bankTypeSelector.value;
    const specificBank = inputOtherBank.value.trim();
    
    let errorMsg = "";

    if (!checkTerms.checked) {
        sellWarning.innerText = "⚠️ Debes aceptar los términos y condiciones.";
        sellWarning.style.display = 'block'; return;
    }

    if (charName.length === 0) {
        sellWarning.innerText = "❌ El nombre del personaje es obligatorio.";
        sellWarning.style.display = 'block'; sellerCharName.focus(); return;
    }
    if (!sellerCharName.classList.contains('is-valid')) {
        sellWarning.innerText = "❌ Personaje no verificado (Espera el check verde).";
        sellWarning.style.display = 'block'; sellerCharName.focus(); return;
    }

    if (docId.length === 0) {
        sellWarning.innerText = "❌ El documento (RUT/ID) es obligatorio.";
        sellWarning.style.display = 'block'; refDocInput.focus(); return;
    }
    if (accountNum.length === 0) {
        sellWarning.innerText = "❌ Falta el número de cuenta/clave.";
        sellWarning.style.display = 'block'; refAccountInput.focus(); return;
    }
    if (!email || !email.includes('@')) {
        errorMsg = "❌ Ingresa un email válido.";
    } else if (holder.length < 3) {
        errorMsg = "❌ Nombre del titular incompleto.";
    }

    if (otherBankContainer.style.display !== 'none') {
        if (!specificBank) errorMsg = "❌ Especifique el nombre del banco.";
        else bankMethod = `${bankMethod}: ${specificBank}`;
    }

    if (!errorMsg) {
        if (currentCurrency === 'CLP') {
            if (!validarRut(docId)) errorMsg = "❌ El RUT ingresado no es válido.";
        }
    }

    if (errorMsg) {
        sellWarning.innerText = errorMsg;
        sellWarning.style.display = 'block';
        return;
    }

    sellWarning.style.display = 'none';
    const totalPayout = payoutOutput.value;

    let bankDetails = `🏦 *Banco/Método:* ${bankMethod}\n` +
                      `👤 *Titular:* ${holder}\n` +
                      `🆔 *RUT/ID:* ${docId}\n` +
                      `🔢 *Cuenta:* ${accountNum}\n` +
                      `📧 *Email:* ${email}`;

    if (currentCurrency === 'CLP' && inputAccountType && accountTypeContainer.style.display !== 'none') {
        bankDetails += `\n📋 *Tipo:* ${inputAccountType.value}`;
    }

    const msg = `🛡️ *SOLICITUD DE VENTA (TIBIA COINS)*\n` +
                `────────────────────────\n` +
                `📤 *Entrego:* ${amount} TC\n` +
                `💵 *Recibo:* ${totalPayout}\n` +
                `👤 *Personaje:* ${charName}\n` +
                `────────────────────────\n` +
                `📂 *DATOS PARA EL PAGO:*\n` +
                `${bankDetails}\n` +
                `────────────────────────\n` +
                `⏳ *Quedo a la espera de instrucciones.*`;

    document.getElementById('modalAmount').innerText = `${amount} TC`;
    document.getElementById('modalPayout').innerText = totalPayout;
    document.getElementById('modalChar').innerText = charName;
    
    let modalBankInfo = `${bankMethod}\n${email}\n${holder}\n${accountNum}`;
    if(currentCurrency === 'CLP' && inputAccountType.value) modalBankInfo += `\n${inputAccountType.value}`;
    
    const bankDetailsContainer = document.getElementById('modalBankDetails');
    bankDetailsContainer.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
            <span style="white-space: pre-line; text-align: left;">${modalBankInfo}</span>
            <button class="btn btn-sm btn-outline-warning ms-2 btn-copy" title="Copiar"><i class="bi bi-clipboard"></i></button>
        </div>`;

    bankDetailsContainer.querySelector('.btn-copy').addEventListener('click', function() {
        navigator.clipboard.writeText(modalBankInfo);
        const btn = this;
        btn.innerHTML = '<i class="bi bi-check-lg"></i>';
        btn.classList.replace('btn-outline-warning', 'btn-success');
        setTimeout(() => {
            btn.innerHTML = '<i class="bi bi-clipboard"></i>';
            btn.classList.replace('btn-success', 'btn-outline-warning');
        }, 2000);
    });

    const finalBtn = document.getElementById('btnConfirmWhatsapp');
    const newBtn = finalBtn.cloneNode(true);
    finalBtn.parentNode.replaceChild(newBtn, finalBtn);

    newBtn.addEventListener('click', () => {
        newBtn.disabled = true;
        const originalContent = newBtn.innerHTML;
        newBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> PROCESANDO...`;

        const whatsappUrl = `https://wa.me/${ROYAL_CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`;

        setTimeout(() => {
            try {
                window.open(whatsappUrl, '_blank');
            } catch (e) {
                console.error("Error abriendo WhatsApp:", e);
                alert("No se pudo abrir WhatsApp automáticamente. Revisa si tienes bloqueador de ventanas.");
            }
            
            setTimeout(() => {
                const modalEl = document.getElementById('confirmModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if(modal) modal.hide();
                newBtn.disabled = false;
                newBtn.innerHTML = originalContent;
            }, 5000);
        }, 500); 
    });

    const myModal = new bootstrap.Modal(document.getElementById('confirmModal'));
    myModal.show();
}