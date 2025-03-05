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

// Ruta de Chrome
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// Función para ejecutar un script de Python
function runPythonScript(scriptName) {
    return new Promise((resolve, reject) => {
        exec(`python ${scriptName}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error al ejecutar ${scriptName}:`, error.message);
                reject(error);
            } else {
                console.log(`Salida de ${scriptName}:`, stdout);
                resolve(stdout);
            }
        });
    });
}

// Función para extraer un token de la página
async function extractToken(targetUrl) {
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

// Función para solicitar entrada del usuario
async function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Función para leer todos los tokens del archivo token.txt
function readTokensFromFile(filePath) {
    const data = fs.readFileSync(filePath, 'utf8');
    const tokens = data.split('\n').filter(token => token.trim() !== ''); // Filtrar tokens vacíos
    return tokens;
}

// Función para seleccionar un token al azar y marcarlo como usado
function getRandomToken(filePath) {
    const tokens = readTokensFromFile(filePath);
    if (tokens.length === 0) {
        throw new Error('No hay tokens disponibles en el archivo.');
    }
    const randomIndex = Math.floor(Math.random() * tokens.length);
    const selectedToken = tokens[randomIndex].trim();

    // Si no deseas eliminar el token, omite estas líneas:
    // tokens.splice(randomIndex, 1);
    // fs.writeFileSync(filePath, tokens.join('\n'), 'utf8');

    return selectedToken;
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

// Función para leer una línea aleatoria de pump.txt
function getRandomMessageFromFile(filePath) {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n').filter(line => line.trim() !== ''); // Filtrar líneas vacías
    if (lines.length === 0) {
        throw new Error('El archivo pump.txt está vacío.');
    }
    const randomIndex = Math.floor(Math.random() * lines.length);
    return lines[randomIndex].trim(); // Devolver una línea aleatoria
}

// Función para escribir el mensaje completo en el campo activo
async function writeMessageToActiveField(page, message) {
    // Escribir el mensaje en el campo activo usando page.keyboard.type
    await page.keyboard.type(message, { delay: 5 }); // Escribir con un retraso de 100ms entre cada letra
    console.log(`Mensaje enviado: ${message}`);
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
        return new Promise((resolve) => {
            exec('taskkill /f /im chrome.exe', (error, stdout, stderr) => {
                if (error) {
                    console.error('Error al forzar el cierre de Chrome:', error.message);
                    resolve();
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

// Función para seleccionar un archivo al azar de la carpeta 'imagenes'
function getRandomImageFromFolder(folderPath) {
    const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.gif'));
    if (files.length === 0) {
        throw new Error('No hay archivos GIF en la carpeta imágenes.');
    }
    const randomIndex = Math.floor(Math.random() * files.length);
    return path.join(folderPath, files[randomIndex]);
}

// Función principal que ejecuta el proceso completo
async function runProcess() {
    try {
        // Ruta del archivo de tokens
        const tokenFilePath = path.join(__dirname, 'tokens.txt');

        // Solicitar el número de ciclos a ejecutar
        const totalCycles = parseInt(await askQuestion('Ingrese el número de ciclos a ejecutar: '), 10);

        // Ruta del archivo pump.txt
        const pumpFilePath = path.join(__dirname, 'pump.txt');

        // Ruta de la carpeta de imágenes
        const imagesFolderPath = path.join(__dirname, 'Imagenes');

        // Solicitar la URL solo una vez al inicio
        const webUrl = await askQuestion('Ingrese la URL de la web para extraer tokens: ');

        let completedCycles = 0; // Contador de ciclos completados exitosamente

        while (completedCycles < totalCycles) { // Ejecutar hasta completar los ciclos solicitados
            let browser;
            try {
                // Ejecutar imagen.py y comentario.py en cada ciclo
                await runPythonScript('imagen.py');
                await runPythonScript('comentario.py');

                // Extraer un token de la página
                await extractToken(webUrl);

                // Obtener un token al azar
                const token = getRandomToken(tokenFilePath);
                const url = `https://pump.fun/coin/${token}`;

                // Obtener un mensaje aleatorio de pump.txt
                const message = getRandomMessageFromFile(pumpFilePath);
                console.log(`Mensaje seleccionado: ${message}`);

                // Iniciar Puppeteer
                browser = await puppeteer.launch({
                    executablePath: chromePath,
                    headless: false, // Cambia a false si quieres ver el navegador
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

                await page.goto(url, { waitUntil: 'networkidle2' });
                console.log(`Navegando a: ${url}`);

                // Esperar 5 segundos antes de hacer clic en el primer botón
                await new Promise(resolve => setTimeout(resolve, 5000));
                const buttonSelector = '#radix-\\:r3\\: > div.mt-3 > button';
                await page.waitForSelector(buttonSelector);
                await page.click(buttonSelector);
                console.log("Se hizo click en el primer botón.");
                await waitRandom(); // Espera aleatoria

                // Esperar 5 segundos antes de hacer clic en el botón de login
                await new Promise(resolve => setTimeout(resolve, 5000));
                await page.waitForSelector("body > nav > div.flex.flex-col.gap-0\\.4.items-end.order-2.lg\\:order-3.overflow-clip > button");
                await page.evaluate(() => {
                    const button = document.querySelector("body > nav > div.flex.flex-col.gap-0\\.4.items-end.order-2.lg\\:order-3.overflow-clip > button");
                    if (button) {
                        button.click(); // Hacer clic en el botón de login
                    }
                });
                console.log("Se hizo clic en el botón de login.");
                await waitRandom(); // Espera aleatoria

                // Esperar 5 segundos antes de escribir el correo temporal
                await new Promise(resolve => setTimeout(resolve, 5000));
                await page.waitForSelector('#email-input');
                await page.type('#email-input', tempEmail.email, { delay: 2 }); // Escribir con un retraso de 100ms entre cada letra
                console.log("Correo temporal ingresado.");
                await waitRandom(); // Espera aleatoria

                // Esperar 5 segundos antes de hacer clic en el botón de aceptar
                await new Promise(resolve => setTimeout(resolve, 5000));
                const acceptButtonSelector = '#radix-\\:r9\\: > div > div.flex.flex-col.items-center > div > label > button';
                await page.waitForSelector(acceptButtonSelector);
                await page.click(acceptButtonSelector);
                console.log("Se hizo click en el botón de aceptar.");
                await waitRandom(); // Espera aleatoria

                // Esperar 5 segundos antes de hacer clic en el segundo botón
                await new Promise(resolve => setTimeout(resolve, 5000));
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

                // Esperar 5 segundos antes de hacer clic en el segundo botón
                await new Promise(resolve => setTimeout(resolve, 5000));
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

                // Escribir el mensaje completo en el campo activo
                await writeMessageToActiveField(page, message);

                // Seleccionar una imagen al azar de la carpeta 'imagenes'
                const randomImagePath = getRandomImageFromFolder(imagesFolderPath);
                console.log(`Imagen seleccionada: ${randomImagePath}`);

                // Hacer clic en el selector #image y subir la imagen
                await page.waitForSelector('#image');
                const inputUpload = await page.$('#image');
                await inputUpload.uploadFile(randomImagePath);
                console.log("Imagen subida correctamente.");

                // Esperar 5 segundos antes de hacer clic en el botón final
                await new Promise(resolve => setTimeout(resolve, 5000));
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
    } catch (error) {
        console.error('Error en el proceso principal:', error.message);
    }
}

// Ejecutar el script
runProcess();