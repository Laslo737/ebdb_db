function normalizeButton(button) {
  return {
    title: button.text,
    directives: [
      {
        type: 'send_message',
        text: button.text
      }
    ]
  };
}

function chunkButtons(buttons = [], size = 2) {
  const result = [];
  for (let index = 0; index < buttons.length; index += size) {
    result.push(buttons.slice(index, index + size));
  }
  return result;
}

function mapButtons(buttons = []) {
  const limited = buttons.slice(0, 100);
  const isMatrix = limited.some(Array.isArray);
  const rows = isMatrix ? limited : chunkButtons(limited, 2);

  return {
    layout: true,
    persist: false,
    buttons: rows.map((row) => (Array.isArray(row) ? row : [row]).map(normalizeButton))
  };
}

function shouldRetryWithoutButtons(error) {
  return error?.status === 400 && error?.data?.code === 'invalid_request';
}

class YandexSender {
  constructor(client) {
    this.client = client;
  }

  async reply(event, message) {
    const target = event.replyTarget || {};
    const payload = {
      ...target,
      thread_id: event.threadId || undefined,
      payload_id: message.payloadId || `msg-${Date.now()}`,
      text: message.text
    };

    if (event.chat?.type === 'private' && !target.login) {
      throw new Error('YANDEX_LOGIN_REQUIRED');
    }

    if (message.buttons?.length) {
      payload.suggest_buttons = mapButtons(message.buttons);
    }

    try {
      return await this.client.sendText(payload);
    } catch (error) {
      if (payload.suggest_buttons && shouldRetryWithoutButtons(error)) {
        console.warn('yandex.sendText.invalid_buttons_payload', {
          suggest_buttons: payload.suggest_buttons,
          error: error.data || error.message
        });

        const fallbackPayload = { ...payload };
        delete fallbackPayload.suggest_buttons;
        return this.client.sendText(fallbackPayload);
      }

      throw error;
    }
  }
}

module.exports = { YandexSender };
