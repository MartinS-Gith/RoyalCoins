const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const path = require('path');

const app = express();
// Puerto dinámico para Render o 3000 para tu PC
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir archivos de la carpeta public (HTML, CSS, JS del front)
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
            // Ruta para Render o undefined para usar la local en tu PC
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        
        // Fingir que somos un navegador real
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const targetUrl = `https://rubinot.com.br/?subtopic=characters&name=${encodeURIComponent(charName)}`;
        
        // Navegación con tiempo de espera generoso
        await page.goto(targetUrl, { 
            waitUntil: 'domcontentloaded', 
            timeout: 4000 
        });

        // Espera de seguridad para que cargue el contenido dinámico
        await new Promise(r => setTimeout(r, 2000));

        // Analizar el contenido de la página
        const result = await page.evaluate(() => {
            const bodyText = document.body.innerText;
            
            // Frases que indican que NO existe
            const errorPhrases = ["does not exist", "The Following Errors Have Occurred"];
            // Frases que indican que SÍ existe
            const successPhrases = ["Character Information", "Vocation:", "Level:"];

            const hasError = errorPhrases.some(p => bodyText.toLowerCase().includes(p.toLowerCase()));
            const hasData = successPhrases.some(p => bodyText.includes(p));

            return hasData && !hasError;
        });

        console.log(`✅ Resultado para "${charName}": ${result ? 'EXISTE' : 'NO EXISTE'}`);

        await browser.close();

        return res.json({ 
            name: charName,
            exists: result 
        });

    } catch (error) {
        console.error("❌ Error en Puppeteer:", error.message);
        if (browser) await browser.close();
        
        // Enviamos exists: false para no bloquear el front-end
        return res.json({ 
            name: charName, 
            exists: false, 
            error: "Error de conexión con Rubinot" 
        });
    }
});

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🛡️ Servidor RoyalCoins activo en puerto ${PORT}`);
});