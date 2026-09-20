class DedupeStore {
  constructor(ttlMs = 10 * 60 * 1000) {
    this.ttlMs = ttlMs;
    this.items = new Map();
  }

  has(key) {
    this.cleanup();
    const expiresAt = this.items.get(key);
    return Boolean(expiresAt && expiresAt > Date.now());
  }

  remember(key) {
    this.cleanup();
    this.items.set(key, Date.now() + this.ttlMs);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, expiresAt] of this.items.entries()) {
      if (expiresAt <= now) this.items.delete(key);
    }
  }
}

module.exports = { DedupeStore };
