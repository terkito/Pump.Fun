const puppeteer = require('puppeteer');
const axios = require('axios');
const readline = require('readline');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Crear interfaz para entrada de datos
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Función para solicitar entrada del usuario
async function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Función para generar un correo temporal con Mail.tm
async function getTempEmail() {
    try {
        // Obtener lista de dominios válidos
        const { data: domains } = await axios.get('https://api.mail.tm/domains');
        console.log('Dominios disponibles:', domains);  // Verifica los dominios disponibles

        // Verificar si existe al menos un dominio
        if (domains['hydra:member'] && domains['hydra:member'].length > 0) {
            const domain = domains['hydra:member'][0].domain; // Usar el primer dominio disponible

            // Crear dirección de correo
            const randomString = Math.random().toString(36).substring(2, 10);
            const email = `${randomString}@${domain}`;

            // Registrar cuenta en Mail.tm
            const { data: account } = await axios.post('https://api.mail.tm/accounts', {
                address: email,
                password: 'TempPassword123!'
            });
            console.log('Cuenta creada:', account);  // Verifica los detalles de la cuenta

            // Obtener token de autenticación
            const { data: auth } = await axios.post('https://api.mail.tm/token', {
                address: email,
                password: 'TempPassword123!'
            });
            console.log('Token de autenticación:', auth);  // Verifica el token

            return {
                email: account.address,
                password: 'TempPassword123!',
                id: account.id,
                token: auth.token
            };
        } else {
            throw new Error("No hay dominios disponibles en Mail.tm");
        }
    } catch (error) {
        console.error('Error al generar el correo:', error.response?.data || error.message);
        return null;
    }
}

// Función para obtener el código de verificación del email
async function getVerificationCode(emailData) {
    const url = `https://api.mail.tm/messages`;

    for (let i = 0; i < 10; i++) { // Reintentar hasta 10 veces
        try {
            const { data: messages } = await axios.get(url, {
                headers: { Authorization: `Bearer ${emailData.token}` }
            });

            if (messages['hydra:member'] && messages['hydra:member'].length > 0) {
                const message = messages['hydra:member'][0];
                const subject = message.subject; // Obtener el subject del mensaje

                // Buscar el código de 6 dígitos en el subject
                const match = subject.match(/(\d{6})/); // Extraer código de 6 dígitos
                if (match) {
                    return match[1];
                }
            }
        } catch (error) {
            console.error('Error al verificar el email:', error.response?.data || error.message);
        }

        console.log('Esperando código...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos
    }

    return null;
}

// Función para leer una línea aleatoria del archivo
function getRandomLineFromFile(filePath) {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n').filter(line => line.trim() !== ''); // Filtrar líneas vacías
    if (lines.length === 0) {
        throw new Error('El archivo está vacío o no contiene líneas válidas.');
    }
    const randomIndex = Math.floor(Math.random() * lines.length);
    return lines[randomIndex].trim(); // Eliminar espacios en blanco al inicio y final
}

// Función para verificar si una línea ya ha sido utilizada
function isLineUsed(line, logFilePath) {
    if (!fs.existsSync(logFilePath)) {
        return false; // Si el archivo de log no existe, la línea no ha sido usada
    }
    const logData = fs.readFileSync(logFilePath, 'utf8');
    const usedLines = logData.split('\n').map(l => l.trim());
    return usedLines.includes(line);
}

// Función para guardar una línea utilizada en el archivo de log
function logUsedLine(line, logFilePath) {
    fs.appendFileSync(logFilePath, `${line}\n`, 'utf8');
}

// Función para escribir una línea aleatoria en el campo activo
async function writeRandomLineToActiveField(page, filePath, logFilePath) {
    let randomLine;
    let attempts = 0;
    const maxAttempts = 10; // Máximo de intentos para evitar bucles infinitos

    do {
        randomLine = getRandomLineFromFile(filePath);
        attempts++;
        if (attempts > maxAttempts) {
            throw new Error('No se pudo encontrar una línea no utilizada después de varios intentos.');
        }
    } while (isLineUsed(randomLine, logFilePath));

    // Escribir la línea en el campo activo usando page.keyboard.type
    await page.keyboard.type(randomLine, { delay: 5 }); // Escribir con un retraso de 100ms entre cada letra

    // Guardar la línea en el log
    logUsedLine(randomLine, logFilePath);

    console.log(`Línea utilizada: ${randomLine}`);
}

// Función para esperar un tiempo aleatorio entre 2 y 4 segundos
function waitRandom() {
    const randomTime = Math.floor(Math.random() * (4000 - 2000 + 1)) + 2000; // Entre 2 y 4 segundos
    return new Promise(resolve => setTimeout(resolve, randomTime));
}

// Función para verificar si Chrome está abierto
function isChromeRunning() {
    return new Promise((resolve) => {
        exec('tasklist /fi "imagename eq chrome.exe"', (error, stdout) => {
            if (error) {
                resolve(false);
            } else {
                resolve(stdout.toLowerCase().includes('chrome.exe'));
            }
        });
    });
}

// Función para forzar el cierre de Chrome en Windows
async function forceCloseChrome() {
    const isRunning = await isChromeRunning();
    if (isRunning) {
        return new Promise((resolve, reject) => {
            exec('taskkill /f /im chrome.exe', (error, stdout, stderr) => {
                if (error) {
                    console.error('Error al forzar el cierre de Chrome:', error.message);
                    reject(error);
                } else {
                    console.log('Chrome cerrado forzosamente.');
                    resolve();
                }
            });
        });
    } else {
        console.log('Chrome no está en ejecución.');
        return Promise.resolve();
    }
}

// Función principal que ejecuta el proceso completo
async function runProcess() {
    // Solicitar el token al usuario
    const token = await askQuestion('Ingrese el token: ');
    const url = `https://pump.fun/coin/${token}`;

    // Solicitar el número de ciclos a ejecutar
    const totalCycles = parseInt(await askQuestion('Ingrese el número de ciclos a ejecutar: '), 10);

    // Ruta fija de Chrome
    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

    // Rutas de archivos
    const pumpFilePath = path.join(__dirname, 'pump.txt');
    const logFilePath = path.join(__dirname, 'used_lines.log');

    let completedCycles = 0; // Contador de ciclos completados exitosamente

    while (completedCycles < totalCycles) { // Ejecutar hasta completar los ciclos solicitados
        let browser;
        try {
            // Iniciar Puppeteer
            browser = await puppeteer.launch({
                executablePath: chromePath,
                headless: false,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();

            // Obtener correo temporal
            const tempEmail = await getTempEmail();
            if (!tempEmail) {
                console.log("Reiniciando proceso debido a un error en la generación del correo...");
                continue; // Reiniciar el proceso
            }

            console.log(`Correo temporal generado: ${tempEmail.email}`);

            await page.goto(url);
            console.log(`Navegando a: ${url}`);

            // Hacer clic en el primer botón
            const buttonSelector = '#radix-\\:r3\\: > div.mt-3 > button';
            await page.waitForSelector(buttonSelector);
            await page.click(buttonSelector);
            console.log("Se hizo click en el primer botón.");
            await waitRandom(); // Espera aleatoria

            await page.evaluate(() => {
                const button = document.querySelector("body > nav > div.flex.flex-col.gap-0\\.4.items-end.order-2.lg\\:order-3.overflow-clip > button");
                if (button) {
                    button.click(); // Hacer clic en el botón de login
                }
            });
            console.log("Se hizo clic en el botón de login.");
            await waitRandom(); // Espera aleatoria

            // Escribir el correo temporal de forma más humana
            await page.waitForSelector('#email-input');
            await page.type('#email-input', tempEmail.email, { delay: 2 }); // Escribir con un retraso de 100ms entre cada letra
            console.log("Correo temporal ingresado.");
            await waitRandom(); // Espera aleatoria

            // Hacer click en el botón de aceptar
            const acceptButtonSelector = '#radix-\\:r9\\: > div > div.flex.flex-col.items-center > div > label > button';
            await page.waitForSelector(acceptButtonSelector);
            await page.click(acceptButtonSelector);
            console.log("Se hizo click en el botón de aceptar.");
            await waitRandom(); // Espera aleatoria

            // Hacer click en el segundo botón después de aceptar
            const secondButtonSelector = '#privy-modal-content > div > div.Hide-sc-b51c7c74-7.gWAUvf > div.AlignBottom-sc-b51c7c74-1.ZvrAP > div > div.Hide-sc-b51c7c74-7.gWAUvf > div > label > button > span:nth-child(2) > span';
            await page.waitForSelector(secondButtonSelector);
            await page.click(secondButtonSelector);
            console.log("Se hizo click en el segundo botón.");
            await waitRandom(); // Espera aleatoria

            // Obtener el código de verificación del correo
            const code = await getVerificationCode(tempEmail);

            if (!code) {
                console.error('No se recibió un código. Reiniciando proceso...');
                continue; // Reiniciar el proceso
            }

            console.log(`Código recibido: ${code}`);

            // Ingresar el código recibido de forma más humana
            const codeInputs = await page.$$('#privy-modal-content input');
            for (let i = 0; i < code.length; i++) {
                await codeInputs[i].type(code[i], { delay: Math.random() * 10 + 5 }); // Retraso entre 100ms y 250ms por cada carácter
            }
            console.log('Código ingresado correctamente.');
            await waitRandom(); // Espera aleatoria después de ingresar el código

            // Esperar 10 segundos antes de continuar
            await new Promise(resolve => setTimeout(resolve, 10000));
            console.log("Esperando 10 segundos antes de continuar...");

            // Recargar la página
            await page.reload({ waitUntil: "networkidle2" });
            console.log("Página recargada");

            // Hacer click en el segundo botón utilizando querySelector dentro de page.evaluate
            const secondButtonSelector2 = 'body > main > div > div.flex.space-x-8.justify-center > div.flex.flex-col.gap-2.w-2\\/3.h-auto > div.flex.items-center.mb-4.md\\:mb-1.mt-1 > div';
            await page.waitForSelector(secondButtonSelector2);

            // Usando evaluate para hacer clic directamente con querySelector
            await page.evaluate((selector) => {
                const button = document.querySelector(selector);
                if (button) {
                    button.click(); // Hace clic en el botón si se encuentra
                } else {
                    console.error("El botón no fue encontrado.");
                }
            }, secondButtonSelector2);

            console.log("Postear iniciado");
            await waitRandom(); // Espera aleatoria después de hacer clic en el segundo botón

            // Escribir una línea aleatoria en el campo activo al final del proceso
            await writeRandomLineToActiveField(page, pumpFilePath, logFilePath);

            // Hacer clic en el botón final con el selector #radix-\:rf\: > button
            const finalButtonSelector = '#radix-\\:rf\\: > button';
            await page.waitForSelector(finalButtonSelector);
            await page.click(finalButtonSelector);
            console.log("Se hizo clic en el botón final.");

            // Esperar 5 segundos antes de cerrar el navegador y reiniciar
            console.log("Esperando 5 segundos antes de reiniciar...");
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Incrementar el contador de ciclos completados exitosamente
            completedCycles++;
            console.log(`Ciclo completado: ${completedCycles}/${totalCycles}`);
        } catch (error) {
            console.error('Error durante la ejecución:', error.message);
            console.log("Reiniciando proceso debido a un error...");
        } finally {
            // Cerrar el navegador completamente al finalizar el script
            if (browser) {
                await browser.close();
                console.log("Navegador cerrado completamente.");
            }

            // Forzar el cierre de Chrome solo si está abierto
            await forceCloseChrome();
        }
    }

    console.log("Todos los ciclos han sido completados.");
    rl.close(); // Cerrar la interfaz de lectura
}

// Ejecutar el script
runProcess();