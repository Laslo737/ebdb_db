const { fetchJson } = require('../../utils/http');
const { truncateText } = require('../../utils/text');

class YandexClient {
  constructor(config) {
    this.config = config;
  }

  headers() {
    return {
      'Content-Type': 'application/json',
      [this.config.authHeader]: `${this.config.authScheme} ${this.config.key}`
    };
  }

  async sendText(message) {
    if (!this.config.key) {
      throw new Error('YANDEX_MESSENGER_KEY is not configured');
    }

    return fetchJson(`${this.config.apiBaseUrl}/bot/v1/messages/sendText/`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        ...message,
        text: truncateText(message.text, 6000)
      })
    });
  }
}

module.exports = { YandexClient };
