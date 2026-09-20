const dotenv = require('dotenv');

dotenv.config();

function get(name, fallback = undefined) {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function getBoolean(...names) {
  return names.some((name) => {
    const value = get(name);
    return value === 'true' || value === '1';
  });
}

const env = {
  port: Number(get('PORT', 3000)),
  enableYandex: getBoolean('ENABLE_YANDEX', 'ENABLE_YANDEX_MESSENGER'),
  yandex: {
    apiBaseUrl: get('YANDEX_API_BASE_URL', 'https://botapi.messenger.yandex.net'),
    key: get('YANDEX_MESSENGER_KEY', get('YANDEX_MESSANGER_KEY')),
    webhookSecret: get('YANDEX_WEBHOOK_SECRET'),
    authHeader: get('YANDEX_AUTH_HEADER', 'Authorization'),
    authScheme: get('YANDEX_AUTH_SCHEME', 'OAuth')
  },
  branchApi: {
    baseUrl: get('BRANCH_API_BASE_URL', 'https://yobicloud.ru'),
    token: get('BRANCH_API_TOKEN')
  }
};

module.exports = { env };
