const test = require('node:test');
const assert = require('node:assert/strict');
const { YandexSender } = require('../src/services/yandex/sender');

test('sends exactly one recipient field', async () => {
  let sentPayload;
  const sender = new YandexSender({
    async sendText(payload) {
      sentPayload = payload;
      return { ok: true };
    }
  });

  await sender.reply({
    replyTarget: { user_id: 'user-1', login: undefined },
    threadId: null
  }, { text: 'Ответ', payloadId: 'payload-1' });

  assert.deepEqual(sentPayload, {
    user_id: 'user-1',
    thread_id: undefined,
    payload_id: 'payload-1',
    text: 'Ответ'
  });
});

test('does not call Yandex API without a recipient', async () => {
  let called = false;
  const sender = new YandexSender({
    async sendText() {
      called = true;
    }
  });

  await assert.rejects(
    sender.reply({ replyTarget: null }, { text: 'Ответ' }),
    { message: 'YANDEX_REPLY_TARGET_REQUIRED' }
  );
  assert.equal(called, false);
});
