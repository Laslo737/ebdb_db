class SessionStore {
  constructor() {
    this.sessions = new Map();
  }

  get(userKey) {
    return this.sessions.get(userKey) || {};
  }

  set(userKey, session) {
    this.sessions.set(userKey, session);
    return session;
  }

  patch(userKey, patch) {
    const current = this.get(userKey);
    const next = { ...current, ...patch };
    this.sessions.set(userKey, next);
    return next;
  }

  clear(userKey) {
    this.sessions.delete(userKey);
  }
}

module.exports = { SessionStore };
