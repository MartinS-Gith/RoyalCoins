const express = require('express');
const cors = require('cors');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/check-char', async (req, res) => {
    const charName = req.query.name;

    if (!charName) {
        return res.status(400).json({ error: 'Falta el nombre' });
    }

    console.log(`🔎 Buscando en Rubinot: "${charName}"`);
    
    let browser;

    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const page = await browser.newPage();
        
        // --- CONFIGURACIÓN DE SIGILO (PASO 3) ---
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'es-ES,es;q=0.9'
        });

        const targetUrl = `https://rubinot.com.br/?subtopic=characters&name=${encodeURIComponent(charName)}`;
        
        // Aumentamos un poco el timeout porque Oracle/Cloudflare pueden ser lentos
        await page.goto(targetUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 10000 
        });

        // Espera táctica
        await new Promise(r => setTimeout(r, 2000));

        const result = await page.evaluate(() => {
            const bodyText = document.body.innerText;
            const errorPhrases = ["does not exist", "The Following Errors Have Occurred"];
            const successPhrases = ["Character Information", "Vocation:", "Level:"];

            const hasError = errorPhrases.some(p => bodyText.toLowerCase().includes(p.toLowerCase()));
            const hasData = successPhrases.some(p => bodyText.includes(p));

            return hasData && !hasError;
        });

        console.log(`✅ Resultado para "${charName}": ${result ? 'EXISTE' : 'NO EXISTE'}`);

        await browser.close();
        return res.json({ name: charName, exists: result });

    } catch (error) {
        console.error("❌ Error en Puppeteer:", error.message);
        if (browser) await browser.close();
        return res.json({ name: charName, exists: false, error: "Error de conexión" });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🛡️ Servidor RoyalCoins activo en puerto ${PORT}`);
});