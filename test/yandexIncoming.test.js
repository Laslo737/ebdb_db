const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeUpdate } = require('../src/services/yandex/incoming');

test('uses login for a flat private-chat update when it is available', () => {
  const event = normalizeUpdate({
    update_id: 'update-1',
    message_id: 'message-1',
    text: '/menu',
    chat: { id: 'chat-1', type: 'private' },
    from: { id: 'user-1', login: 'employee' }
  });

  assert.equal(event.type, 'command');
  assert.deepEqual(event.replyTarget, { login: 'employee' });
});

test('uses user_id when a private-chat user has no login', () => {
  const event = normalizeUpdate({
    update_id: 'update-2',
    text: 'меню',
    chat: { id: 'chat-2', type: 'private' },
    from: { id: 'user-2' }
  });

  assert.deepEqual(event.replyTarget, { user_id: 'user-2' });
});

test('uses chat_id for a group chat', () => {
  const event = normalizeUpdate({
    text: 'меню',
    chat: { id: 'group-1', type: 'group' },
    from: { id: 'user-3', login: 'employee' }
  });

  assert.deepEqual(event.replyTarget, { chat_id: 'group-1' });
});

test('normalizes a webhook update with a nested message', () => {
  const event = normalizeUpdate({
    update_id: 'update-4',
    message: {
      message_id: 'message-4',
      text: 'меню',
      thread_id: 'thread-4',
      chat: { id: 'chat-4', type: 'private' },
      from: { id: 'user-4' }
    }
  });

  assert.equal(event.eventId, 'update-4');
  assert.equal(event.text, 'меню');
  assert.equal(event.threadId, 'thread-4');
  assert.deepEqual(event.chat, { id: 'chat-4', type: 'private' });
  assert.deepEqual(event.replyTarget, { user_id: 'user-4' });
});

test('returns no target when the webhook contains no recipient identifiers', () => {
  const event = normalizeUpdate({ text: 'меню', chat: { type: 'private' }, from: {} });
  assert.equal(event.replyTarget, null);
});
