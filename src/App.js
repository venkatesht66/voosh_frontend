import React, { useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";
import api from "./api";
import SessionCache from "./SessionCache";

const cache = new SessionCache({ prefix: "newsqa:", ttlMs: 1000 * 60 * 60 }); // 1 hour TTL

export default function App() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isStreamingSupported, setIsStreamingSupported] = useState(true);
  const [statusMsg, setStatusMsg] = useState("");
  const messagesRef = useRef(messages);
  const scrollRef = useRef(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const list = await api.listSessions();
        setSessions(list || []);
      } catch (err) {
        console.error("Failed to list sessions:", err);
      }
    };

    loadSessions();
    const iv = setInterval(loadSessions, 30_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const last = cache.get("lastSessionId");
    if (last) {
      setSessionId(last);
      const cached = cache.get(`session:${last}`) || [];
      setMessages(cached);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const persistMessages = (sid, next) => {
    cache.set(`session:${sid}`, next);
  };

  const createSession = async () => {
    try {
      setStatusMsg("Creating session...");
      const res = await api.startSession();
      const sid = res.sessionId;
      setSessionId(sid);
      cache.set("lastSessionId", sid);
      setMessages([]);
      persistMessages(sid, []);
      setStatusMsg("Session created.");
    } catch (err) {
      console.error(err);
      setStatusMsg("Failed to create session.");
    } finally {
      setTimeout(() => setStatusMsg(""), 2000);
    }
  };

  const loadSessionChats = async (sid) => {
    try {
      setStatusMsg("Loading session...");
      setSessionId(sid);
      cache.set("lastSessionId", sid);

      const hist = await api.getSessionHistory(sid);
      const normalized = (hist.messages || []).map((m, idx) => ({
        id: `${m.role}-${idx}-${m.ts || Date.now()}`,
        role: m.role,
        content: m.content,
        ts: m.ts || null
      }));
      setMessages(normalized);
      persistMessages(sid, normalized);
      setSelectedSession(sid);
      setStatusMsg("Loaded session");
    } catch (err) {
      console.error("Load session error:", err);
      setStatusMsg("Failed to load session");
    } finally {
      setTimeout(() => setStatusMsg(""), 1200);
    }
  };

  const fetchHistory = async () => {
    if (!sessionId) {
      setStatusMsg("No session. Create one first.");
      return;
    }

    try {
      setStatusMsg("Fetching history...");
      const resp = await fetch(`${api.baseUrl}/session/history?sessionId=${encodeURIComponent(sessionId)}`);
      if (!resp.ok) {
        let body = "";
        try { body = await resp.text(); } catch (_) { body = "<no body>"; }
        throw new Error(`Server responded ${resp.status} ${resp.statusText}: ${body}`);
      }

      const data = await resp.json();
      let messagesArray = [];
      if (Array.isArray(data)) {
        messagesArray = data;
      } else if (data && Array.isArray(data.messages)) {
        messagesArray = data.messages;
      } else {
        throw new Error("Unexpected history format from server");
      }

      const normalized = messagesArray.map((h, idx) => ({
        role: h.role ?? (h.sender ?? "user"),
        content: h.content ?? h.message ?? "",
        ts: h.ts ?? h.timestamp ?? null,
        id: `${h.role ?? 'msg'}-${idx}-${Date.now()}`
      }));

      setMessages(normalized);
      persistMessages(sessionId, normalized);
      setStatusMsg("History loaded.");
    } catch (err) {
      console.error("Fetch history error:", err);
      setStatusMsg(`Failed to fetch history: ${err.message}`);
    } finally {
      setTimeout(() => setStatusMsg(""), 2500);
    }
  };

  const clearSession = async () => {
    if (!sessionId) {
      setStatusMsg("No session to clear.");
      return;
    }
    try {
      setStatusMsg("Clearing session on server...");
      await api.clearSession(sessionId);
      cache.del(`session:${sessionId}`);
      setMessages([]);
      setStatusMsg("Session cleared.");
    } catch (err) {
      console.error(err);
      setStatusMsg("Failed to clear session.");
    } finally {
      setTimeout(() => setStatusMsg(""), 1500);
    }
  };

  const resetClient = () => {
    if (!sessionId) {
      setStatusMsg("No session. Create one first.");
      return;
    }
    setMessages([]);
    persistMessages(sessionId, []);
    setStatusMsg("Client conversation reset.");
    setTimeout(() => setStatusMsg(""), 1200);
  };

  const sendMessage = async (evt) => {
    evt?.preventDefault();
    const text = input.trim();
    if (!text) return;
    if (!sessionId) {
      setStatusMsg("Create a session first.");
      return;
    }
  
    setIsSending(true);
    setStatusMsg("Sending message...");
  
    const userMsg = { id: `user-${Date.now()}`, role: "user", content: text };
    setMessages(prev => {
      const next = [...prev, userMsg];
      messagesRef.current = next;
      persistMessages(sessionId, next);
      return next;
    });
    setInput("");
  
    const placeholderId = `assistant-placeholder-${Date.now()}`;
    const assistantPlaceholder = { id: placeholderId, role: "assistant", content: "AI is thinking..." };
    setMessages(prev => {
      const next = [...prev, assistantPlaceholder];
      messagesRef.current = next;
      persistMessages(sessionId, next);
      return next;
    });
  
    try {
      const res = await fetch(`${api.baseUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ sessionId, message: text }),
      });
  
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server error: ${res.status} ${errText}`);
      }
  
      const contentType = res.headers.get("content-type") || "";
  
      if (res.body && (contentType.includes("text/event-stream") || contentType.includes("text/plain"))) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
  
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
  
            setMessages(prev => {
              const next = [...prev];
              const idx = next.findIndex(m => m.id === placeholderId);
              if (idx >= 0) {
                const prevContent = next[idx].content === "AI is thinking..." ? "" : next[idx].content;
                next[idx] = { ...next[idx], content: prevContent + chunk };
              }
              messagesRef.current = next;
              persistMessages(sessionId, next);
              return next;
            });
          }
        }
      }
      else {
        const data = await res.json();
        let assistantText = "";
        if (data == null) assistantText = "";
        else if (typeof data === "string") assistantText = data;
        else if (typeof data === "object") assistantText = data.answer ?? data.answerText ?? data.text ?? JSON.stringify(data);
        else assistantText = String(data);
  
        setMessages(prev => {
          const next = [...prev];
          const idx = next.findIndex(m => m.id === placeholderId);
          if (idx >= 0) next[idx] = { id: `assistant-${Date.now()}`, role: "assistant", content: assistantText };
          else next.push({ id: `assistant-${Date.now()}`, role: "assistant", content: assistantText });
          messagesRef.current = next;
          persistMessages(sessionId, next);
          return next;
        });
      }
    } catch (err) {
      console.error("Send message error:", err);
      setMessages(prev => {
        const next = [...prev];
        const idx = next.findIndex(m => m.id === placeholderId);
        const content = `Error: ${err.message}`;
        if (idx >= 0) next[idx] = { id: `assistant-${Date.now()}`, role: "assistant", content };
        else next.push({ id: `assistant-${Date.now()}`, role: "assistant", content });
        messagesRef.current = next;
        persistMessages(sessionId, next);
        return next;
      });
    } finally {
      setIsSending(false);
      setTimeout(() => setStatusMsg(""), 1600);
    }
  };

  return (
    <div className="app-root">
      <header className="topbar">
        <div className="title">RAG News — Chat</div>
        <div className="controls">
          <button className="btn" onClick={createSession}>Create Session</button>
          <button className="btn" onClick={fetchHistory}>Fetch History</button>
          <button className="btn" onClick={resetClient}>Reset Chat</button>
          <button className="btn danger" onClick={clearSession}>Clear Server</button>
        </div>
      </header>

      <main className="main">
        <aside className="sidebar">
          <div className="session-info">
            <div><strong>Session:</strong></div>
            <div className="session-id">{sessionId || "No session"}</div>
          </div>

          <div className="sessions-list">
            <div style={{ fontWeight: 600, marginBottom: 8 }}>All sessions</div>
            {sessions.length === 0 && <div className="hint">No sessions yet</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflow: 'auto' }}>
              {sessions.map(s => (
                <button
                  key={s.sessionId}
                  className={`btn small ${selectedSession === s.sessionId ? "primary" : ""}`}
                  onClick={() => loadSessionChats(s.sessionId)}
                  title={`Created: ${new Date(s.createdAt).toLocaleString()}`}
                >
                  {s.sessionId.slice(0, 8)} · {new Date(s.lastActiveAt || s.createdAt).toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div className="cache-actions" style={{ marginTop: 'auto' }}>
            <button className="btn small" onClick={() => {
              cache.clearAll();
              setStatusMsg("Local cache cleared.");
              setTimeout(() => setStatusMsg(""), 1200);
            }}>Clear Local Cache</button>
            <div className="hint">Local cache TTL: 1 hour</div>
          </div>
        </aside>

        <section className="chat-area">
          <div className="messages" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="empty">No messages yet. Create session & send a message.</div>
            )}

            {messages.map(msg => (
              <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
            ))}
          </div>

          <form className="composer" onSubmit={sendMessage}>
            <textarea
              className="input"
              placeholder="Type your question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={2}
              disabled={isSending}
            />
            <div className="composer-controls">
              <div className="status">{statusMsg}</div>
              <div className="right">
                <button type="submit" className="btn primary" disabled={isSending}>Send</button>
              </div>
            </div>
          </form>
        </section>
      </main>

      <footer className="footer">
        <div>Streaming supported: {isStreamingSupported ? "Yes" : "No (fallback)"}</div>
        <div>Cached sessions: {cache.keys().length}</div>
      </footer>
    </div>
  );
}