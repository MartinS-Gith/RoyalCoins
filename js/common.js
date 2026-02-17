// js/common.js

/* CONFIGURACIÓN CENTRALIZADA ROYALCOINS */
const ROYAL_CONFIG = {
    whatsappNumber: "56984278148",

    currencies: {
        BRL: { 
            locale: 'pt-BR', symbol: 'R$', flag: '🇧🇷',
            bankDetails: 'Banco: Mercado Pago\nTipo: Cuenta Vista\nN° Cuenta: 1043016715\nRUT: 19961553-K' 
        },
        USD: { 
            locale: 'en-US', symbol: '$', flag: '🇺🇸',
            bankDetails: 'Bank: Community Federal Savings Bank\nHolder: Martin Fernando Simon Canales\nAccount: 8336091912\nRouting: 026073150\nSWIFT: CMFGUS33' 
        },
        CLP: { 
            locale: 'es-CL', symbol: 'CLP', flag: '🇨🇱',
            bankDetails: 'Banco: Mercado Pago\nTipo: Cuenta Vista\nN° Cuenta: 1043016715\nRUT: 19961553-K' 
        },
        ARS: { 
            locale: 'es-AR', symbol: '$', flag: '🇦🇷',
            bankDetails: 'Banco: Mercado Pago\nTipo: Cuenta Vista\nN° Cuenta: 1043016715\nRUT: 19961553-K' 
        },
        EUR: { 
            locale: 'de-DE', symbol: '€', flag: '🇪🇺',
            bankDetails: 'Bank: Consultar por Interno' 
        },
        UYU: { locale: 'es-UY', symbol: '$U', flag: '🇺🇾', bankDetails: 'Consultar' },
        VEF: { locale: 'es-VE', symbol: 'Bs.', flag: '🇻🇪', bankDetails: 'Consultar' }
    },

    bankingOptions: {
        'CLP': {
            methods: ['Banco Estado', 'Banco Santander', 'Banco de Chile', 'BCI', 'Itaú', 'Scotiabank', 'Banco Falabella', 'Banco Security', 'Banco Bice', 'Tenpo', 'Mach', 'Mercado Pago', 'Otro'],
            labels: { doc: 'RUT', account: 'N° Cuenta' },
            showAccountType: true
        },
        'BRL': {
            methods: ['PIX', 'PicPay', 'Mercado Pago Brasil', 'Nubank', 'Banco Inter', 'Otro'],
            labels: { doc: 'CPF', account: 'Chave PIX' },
            showAccountType: false
        },
        'ARS': {
            methods: ['Mercado Pago', 'Transferencia CBU', 'Ualá', 'Lemon Cash', 'Brubank', 'Naranja X', 'Otro'],
            labels: { doc: 'DNI/CUIL', account: 'CBU / CVU / Alias' },
            showAccountType: false
        },
        'USD': {
            methods: ['Binance Pay', 'USDT (TRC20)', 'Wise', 'Otro'],
            labels: { doc: 'ID', account: 'Email / Wallet' },
            showAccountType: false
        },
        'EUR': {
            methods: ['Binance Pay', 'SEPA Transfer', 'Revolut', 'Wise', 'Otro'],
            labels: { doc: 'ID', account: 'IBAN / Email' },
            showAccountType: false
        }
    }
};

/* FUNCIÓN DE ESTADO DEL NEGOCIO */
function checkBusinessStatus() {
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('statusDot');
    
    if (!statusText || !statusDot) return;

    const now = new Date();
    const chileTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Santiago"}));
    const hours = chileTime.getHours();

    if (hours >= 0 && hours < 24) {
        statusText.innerText = "ONLINE";
        statusText.style.color = "#25d366";
        statusDot.className = "status-dot status-online me-2";
    } else {
        statusText.innerText = "CERRADO";
        statusText.style.color = "#dc3545";
        statusDot.className = "status-dot status-offline me-2";
    }
}

/* =========================================
   ROYAL FORMATTERS (LÓGICA DE INPUTS)
   ========================================= */
const ROYAL_FORMATTERS = {
    // Convierte "juan perez" en "Juan Perez"
    toTitleCase: (str) => {
        return str.replace(/\w\S*/g, (txt) => {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    },

    // Formatea RUT Chileno: 12.345.678-9
    formatRUT: (value) => {
        let v = value.replace(/[^0-9kK]/g, "");
        if (v.length > 1) {
            let dv = v.slice(-1);
            let cuerpo = v.slice(0, -1);
            cuerpo = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
            return `${cuerpo}-${dv}`;
        }
        return v;
    },

    // Formatea CPF Brasileño: 123.456.789-00
    formatCPF: (value) => {
        let v = value.replace(/\D/g, ""); 
        v = v.substring(0, 11); 
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        return v;
    },

    // Limpieza para cuentas numéricas
    cleanNumberAccount: (value) => {
        return value.replace(/[^0-9-]/g, "");
    },

    // Configuración de Inputs según moneda
    applyInputMasks: (currency, inputs) => {
        const { docInput, accountInput, holderInput } = inputs;
        const resultInputs = { ...inputs };

        // 1. Formato de Nombre (Siempre Title Case)
        if (holderInput) {
            const newHolder = holderInput.cloneNode(true);
            holderInput.parentNode.replaceChild(newHolder, holderInput);
            newHolder.addEventListener('input', (e) => {
                let start = newHolder.selectionStart;
                newHolder.value = ROYAL_FORMATTERS.toTitleCase(e.target.value);
                newHolder.setSelectionRange(start, start);
            });
            resultInputs.holderInput = newHolder;
        }

        // 2. Formato de Documento (ID)
        if (docInput) {
            const newDocInput = docInput.cloneNode(true);
            docInput.parentNode.replaceChild(newDocInput, docInput);
            
            newDocInput.addEventListener('input', (e) => {
                let val = e.target.value;
                if (currency === 'CLP') {
                    e.target.value = ROYAL_FORMATTERS.formatRUT(val);
                } else if (currency === 'BRL') {
                    e.target.value = ROYAL_FORMATTERS.formatCPF(val);
                }
            });
            resultInputs.docInput = newDocInput; 
        }

        // 3. Formato de Cuenta
        if (accountInput) {
            const newAccInput = accountInput.cloneNode(true);
            accountInput.parentNode.replaceChild(newAccInput, accountInput);

            newAccInput.addEventListener('input', (e) => {
                let val = e.target.value;
                if (currency === 'CLP' || currency === 'ARS') {
                    e.target.value = ROYAL_FORMATTERS.cleanNumberAccount(val);
                } else if (currency === 'USD' || currency === 'EUR') {
                    e.target.value = val.toUpperCase();
                }
            });
            resultInputs.accountInput = newAccInput;
        }
        
        return resultInputs; // Devolver referencias nuevas
    }
};