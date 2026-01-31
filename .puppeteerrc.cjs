const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Esto obliga a Puppeteer a instalar y buscar Chrome en la misma carpeta
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};