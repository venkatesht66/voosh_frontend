import React from "react";

export default function ChatMessage({ role, content }) {
  const isUser = role === "user";
  const isAssistant = role === "assistant";
  const wrapperClass = isUser ? "bubble user" : isAssistant ? "bubble bot" : "bubble system";

  return (
    <div className={`message-row ${isUser ? "right" : "left"}`}>
      <div className={wrapperClass}>
        {content.split("\\n").map((line, idx) => (
          <div key={idx} style={{ whiteSpace: "pre-wrap" }}>{line}</div>
        ))}
      </div>
    </div>
  );
}