function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function getMessage(update) {
  return isObject(update?.message) ? update.message : update;
}

function getEventType(update, message = getMessage(update)) {
  if (update.callback_data || update.callback?.data || message.callback_data || message.callback?.data) return 'callback';
  if (!message.text && (update.status || update.delivery_status || update.event_type || update.type)) return 'system';
  if (typeof message.text === 'string' && message.text.trim().startsWith('/')) return 'command';
  return 'message';
}

function buildReplyTarget(chat, from) {
  if (chat?.type !== 'private' && hasValue(chat?.id)) {
    return { chat_id: chat.id };
  }

  if (hasValue(from?.login)) return { login: from.login };
  if (hasValue(from?.id)) return { user_id: from.id };
  if (hasValue(chat?.id)) return { chat_id: chat.id };
  return null;
}

function normalizeUpdate(update) {
  const message = getMessage(update);
  const chat = message.chat || update.chat || {};
  const from = message.from || update.from || {};

  return {
    eventId: String(update.update_id || message.message_id || update.message_id || Date.now()),
    type: getEventType(update, message),
    text: message.text || update.text || '',
    threadId: message.thread_id || update.thread_id || null,
    chat,
    from,
    replyTarget: buildReplyTarget(chat, from),
    metadata: {
      updateId: update.update_id,
      providerMessageId: message.message_id || update.message_id,
      chatId: chat.id,
      chatType: chat.type,
      providerEventType: update.event_type || update.type || null
    },
    raw: update
  };
}

function describeUpdateShape(update) {
  const message = getMessage(update);
  return {
    hasMessageEnvelope: message !== update,
    hasText: typeof message?.text === 'string',
    hasChatId: hasValue(message?.chat?.id || update?.chat?.id),
    chatType: message?.chat?.type || update?.chat?.type || null,
    hasFromId: hasValue(message?.from?.id || update?.from?.id),
    hasFromLogin: hasValue(message?.from?.login || update?.from?.login)
  };
}

function extractUpdates(body) {
  if (Array.isArray(body?.updates)) return body.updates;
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object') return [body];
  return [];
}

module.exports = { buildReplyTarget, describeUpdateShape, normalizeUpdate, extractUpdates };
