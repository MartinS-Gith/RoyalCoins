const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const path = require('path'); // Necesario para servir tus carpetas

const app = express();
// IMPORTANTE: Render asigna el puerto automáticamente, por eso usamos process.env.PORT
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1. Servir tus archivos estáticos (CSS, JS de los archivos que subiste)
// Asegúrate de que tus archivos estén dentro de una carpeta llamada 'public'
app.use(express.static(path.join(__dirname, 'public')));

app.get('/check-char', async (req, res) => {
    const charName = req.query.name;

    if (!charName) {
        return res.status(400).json({ error: 'Falta el nombre' });
    }

    console.log(`🔎 Buscando: "${charName}"`);
    
    let browser;

    try {
        browser = await puppeteer.launch({
            headless: "new",
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            // FLAGS CRÍTICAS PARA RENDER/DOCKER
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Evita que se bloquee por falta de memoria RAM
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const targetUrl = `https://rubinot.com.br/?subtopic=characters&name=${encodeURIComponent(charName)}`;
        
        // Timeout de 20s para darle aire a la conexión de la nube
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 20000 });

        const pageText = await page.$eval('body', el => el.innerText);
        
        const errorPhrases = [
            "does not exist or has been deleted",
            "The Following Errors Have Occurred"
        ];
        const hasError = errorPhrases.some(phrase => pageText.includes(phrase));

        const successPhrases = [
            "Character Information",
            "Vocation:",
            "Level:",
            "Sex:"
        ];
        const hasData = successPhrases.some(phrase => pageText.includes(phrase));

        const exists = hasData && !hasError;

        console.log(`✅ Resultado para "${charName}": ${exists ? 'EXISTE' : 'NO EXISTE'}`);

        await browser.close();

        return res.json({ 
            name: charName,
            exists: exists 
        });

    } catch (error) {
        console.error("❌ Error verificando:", error.message);
        if (browser) await browser.close();
        // Respondemos 200 pero con exists false para que el front no se rompa
        return res.json({ name: charName, exists: false, error: "Timeout o error de red" });
    }
});

// 2. Ruta para servir tu index.html principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🛡️ Servidor RoyalCoins activo en puerto ${PORT}`);
});