const express = require('express');
const { describeUpdateShape, extractUpdates, normalizeUpdate } = require('../../services/yandex/incoming');

function readSecret(headers) {
  return headers['x-webhook-secret'] || headers['x-channel-secret'] || headers['x-bot-secret'];
}

function createYandexWebhookRouter({ botService, dedupeStore, webhookSecret }) {
  const router = express.Router();

  router.post('/api/channels/yandex/webhook', (req, res) => {
    if (webhookSecret) {
      const incomingSecret = readSecret(req.headers);
      if (incomingSecret !== webhookSecret) {
        return res.status(401).json({ ok: false, error: 'Invalid webhook secret' });
      }
    }

    const updates = extractUpdates(req.body);
    res.status(200).json({ ok: true });

    queueMicrotask(async () => {
      for (const update of updates) {
        try {
          const event = normalizeUpdate(update);
          const dedupeKey = `yandex:${event.eventId}`;
          if (dedupeStore.has(dedupeKey)) continue;
          dedupeStore.remember(dedupeKey);
          await botService.handleEvent(event);
        } catch (error) {
          // Log only field presence, never webhook values or credentials.
          console.error('webhook.processing.failed', error, {
            updateShape: describeUpdateShape(update)
          });
        }
      }
    });
  });

  return router;
}

module.exports = { createYandexWebhookRouter };
