const express = require('express');
const puppeteer = require('puppeteer');
const NodeCache = require('node-cache');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar caché en memoria
const cache = new NodeCache({ stdTTL: 300 }); // TTL de 5 minutos

// Middleware para compresión
app.use(compression());

// Inicializa Puppeteer al iniciar el servidor
let browser;
(async () => {
  browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  console.log('Puppeteer inicializado');
})();

app.get('/proxy', async (req, res) => {
  const url = 'https://es.wallapop.com/user/ktst-455609884';

  // Verificar si el contenido ya está en caché
  const cachedContent = cache.get(url);
  if (cachedContent) {
    console.log('Cargando contenido desde caché');
    return res.send(cachedContent);
  }

  try {
    // Abrir nueva página en Puppeteer
    const page = await browser.newPage();

    // Navegar a la URL de Wallapop
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Aceptar cookies si el botón existe
    try {
      const cookieSelector = '#onetrust-accept-btn-handler';
      if (await page.$(cookieSelector)) {
        await page.click(cookieSelector);
        console.log('Cookies aceptadas');
      }
    } catch (error) {
      console.log('Botón de cookies no encontrado o ya aceptado');
    }

    // Modificar la página (ocultar header, eliminar elementos innecesarios)
    const modifiedContent = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (header) header.style.display = 'none';

      // Eliminar scripts y estilos no necesarios
      document.querySelectorAll('script, link[rel="stylesheet"]').forEach(el => el.remove());

      // Retornar el HTML modificado
      return document.documentElement.outerHTML;
    });

    // Cerrar la página para liberar recursos
    await page.close();

    // Guardar en caché el contenido modificado
    cache.set(url, modifiedContent);

    // Enviar el contenido modificado
    res.send(modifiedContent);
  } catch (error) {
    console.error('Error al cargar la página:', error);
    res.status(500).send('Error al cargar la página de Wallapop');
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
