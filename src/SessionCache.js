export default class SessionCache {
    constructor({ prefix = "app:", ttlMs = 1000 * 60 * 30 } = {}) {
      this.prefix = prefix;
      this.ttlMs = ttlMs;
      this.mem = new Map();
      this._loadFromLocal();
    }
  
    _key(k) {
      return `${this.prefix}${k}`;
    }
  
    _loadFromLocal() {
      try {
        // attempt to load last known keys (optional)
        // We'll not auto-populate memory for all keys (could be many).
        // but we keep a lastSessionId and explicit session keys when created.
      } catch (e) {
        // ignore
      }
    }
  
    set(key, value) {
      const now = Date.now();
      const item = { value, ts: now };
      this.mem.set(key, item);
      try {
        const json = JSON.stringify(item);
        localStorage.setItem(this._key(key), json);
      } catch (e) {
        // ignore
      }
    }
  
    get(key) {
      const cached = this.mem.get(key);
      const now = Date.now();
      if (cached) {
        if (now - cached.ts > this.ttlMs) {
          this.del(key);
          return null;
        }
        return cached.value;
      }
      try {
        const raw = localStorage.getItem(this._key(key));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.ts) return null;
        if (now - parsed.ts > this.ttlMs) {
          localStorage.removeItem(this._key(key));
          return null;
        }
        this.mem.set(key, parsed);
        return parsed.value;
      } catch (e) {
        return null;
      }
    }
  
    del(key) {
      this.mem.delete(key);
      try {
        localStorage.removeItem(this._key(key));
      } catch (e) {}
    }
  
    clearAll() {
      this.mem.clear();
      try {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith(this.prefix)) localStorage.removeItem(k);
        });
      } catch (e) {}
    }
  
    keys() {
      return Array.from(this.mem.keys());
    }
  }