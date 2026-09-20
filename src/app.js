const express = require('express');
const { env } = require('./config/env');
const { DedupeStore } = require('./utils/dedupeStore');
const { YandexClient } = require('./services/yandex/client');
const { YandexSender } = require('./services/yandex/sender');
const { BranchApiClient } = require('./services/api/branchApiClient');
const { BranchService } = require('./services/bot/branchService');
const { SessionStore } = require('./services/bot/sessionStore');
const { BotService } = require('./services/bot/botService');
const { createYandexWebhookRouter } = require('./http/routes/yandexWebhookRoute');

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const dedupeStore = new DedupeStore();
  const sessions = new SessionStore();
  const yandexClient = new YandexClient(env.yandex);
  const sender = new YandexSender(yandexClient);
  const branchApiClient = new BranchApiClient(env.branchApi);
  const branchService = new BranchService(branchApiClient);
  const botService = new BotService({ branchService, sender, sessions });

  app.get('/health', (req, res) => {
    res.json({ ok: true, service: 'yandex-filial-bot' });
  });

  app.use(createYandexWebhookRouter({
    botService,
    dedupeStore,
    webhookSecret: env.yandex.webhookSecret
  }));

  return app;
}

module.exports = { createApp };
