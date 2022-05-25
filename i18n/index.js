const i18next = require('i18next');
const Backend = require('i18next-node-fs-backend');
const i18nextMiddleware = require('i18next-express-middleware');
const translationESP = require('./locales/esp/translation.json');

i18next
  .use(Backend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    fallbackLng: 'esp',
    preload: ['en', 'esp'],
    resources: {
      esp: {
        translation: translationESP,
      },
    },
  });
module.exports = { i18next, i18nextMiddleware };
