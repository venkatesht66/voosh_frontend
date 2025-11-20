const BASE = "http://localhost:4000";
const API_PREFIX = `${"https://voosh-backend-2.onrender.com" || BASE}/api`;

async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const api = {
  baseUrl: API_PREFIX,

  async startSession() {
    const res = await fetch(`${API_PREFIX}/session/start`, { method: "POST" });
    if (!res.ok) throw new Error(`Failed to start session (${res.status})`);
    return await res.json();
  },

  async listSessions() {
    const res = await fetch(`${API_PREFIX}/session/list`);
    if (!res.ok) throw new Error(`Failed to list sessions (${res.status})`);
    return await res.json();
  },

  async getSessionHistory(sessionId) {
    if (!sessionId) throw new Error("Missing sessionId");
    const url = `${API_PREFIX}/session/history?sessionId=${encodeURIComponent(sessionId)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch history (${res.status})`);
    return await res.json();
  },

  async clearSession(sessionId) {
    if (!sessionId) throw new Error("Missing sessionId");
    const url = `${API_PREFIX}/session/clear?sessionId=${encodeURIComponent(sessionId)}`;
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) {
      const body = await safeJson(res);
      throw new Error(`Failed to clear session (${res.status}): ${JSON.stringify(body)}`);
    }
    return await res.json();
  },

  async chat(sessionId, message) {
    if (!sessionId) throw new Error("Missing sessionId");
    if (!message) throw new Error("Missing message");
    const res = await fetch(`${API_PREFIX}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, message })
    });
    if (!res.ok) throw new Error(`Chat failed (${res.status})`);
    return res;
  }
};

export default api;