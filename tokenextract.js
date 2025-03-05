const puppeteer = require('puppeteer');
const fs = require('fs');
const readline = require('readline');

// Configuración de readline para manejar la entrada del usuario
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Ruta de Chrome
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// Variables para almacenar la URL
let targetUrl = '';

// Función para extraer un único token de la página
async function extractToken() {
    let browser;

    try {
        // Lanzar Puppeteer con la ruta de Chrome
        browser = await puppeteer.launch({
            executablePath: chromePath,
            headless: true // Cambia a true si no quieres ver el navegador
        });

        console.log('Navegador iniciado.');

        const page = await browser.newPage();

        // Navegar a la URL y esperar a que la página esté completamente cargada
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 }); // Aumentar el timeout a 60 segundos

        // Extraer un solo token (el primer token encontrado)
        const token = await page.$$eval('a[href^="/coin/"]', links => {
            if (links.length > 0) {
                return links[0].href.replace('https://pump.fun/coin/', ''); // Extraer el primer token
            }
            return null; // Si no hay enlaces, retornar null
        });

        if (token) {
            // Guardar el token en un archivo, si no existe, lo crea
            fs.appendFileSync('tokens.txt', token + '\n', 'utf8');
            console.log(`Token extraído: ${token}`);
        } else {
            console.log('No se encontraron tokens en la página.');
        }

    } catch (error) {
        console.error('Error durante la extracción de token:', error);
    } finally {
        // Cerrar el navegador después de extraer el token
        if (browser) {
            await browser.close();
            console.log('Navegador cerrado.');
        }
    }
}

// Función principal que pide la URL y ejecuta la extracción de un solo token
rl.question('Introduce la URL de la página web para extraer el token: ', (urlInput) => {
    targetUrl = urlInput;

    console.log('Script iniciado. Extrayendo un solo token...');

    // Extraer el token
    extractToken().then(() => {
        rl.close(); // Cerrar la interfaz después de que el token se haya extraído
    }).catch(console.error);
});

