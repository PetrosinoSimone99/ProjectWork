const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*'],
  },
  {
    // Il testo UI è in italiano: gli apostrofi ("l'app", "dell'utente") sono
    // legittimi. La regola di default è pensata per l'inglese, quindi togliamo
    // l'apostrofo dal set dei caratteri "da fuggare".
    rules: {
      'react/no-unescaped-entities': ['error', { forbid: ['>', '"', '}'] }],
    },
  },
]);
