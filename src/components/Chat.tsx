import { useEffect, useRef, useState } from "react";
import { profile } from "../lib/profile";
import { useScene } from "../lib/store";

interface Message {
  role: "user" | "assistant";
  body: string;
  grounded?: boolean;
  error?: boolean;
  meta?: string;
}

const DEFAULT_GREETING: Message = {
  role: "assistant",
  body: "Ask me anything about Nishil's work, stack or background. I only know what's on this page, and I'll say so when a question is outside that.",
  grounded: true,
};

export function Chat({
  open,
  setOpen,
  initialGreeting = null,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  initialGreeting?: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>([DEFAULT_GREETING]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const setActivity = useScene((s) => s.setActivity);
  const overHero = useScene((s) => s.progress < 0.06);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seededRef = useRef(false);

  // When panel opens with a greeting from Hero, seed NI-EL intro as first message
  useEffect(() => {
    if (open && initialGreeting && !seededRef.current) {
      setMessages([
        {
          role: "assistant",
          body: initialGreeting,
          grounded: true,
        },
      ]);
      seededRef.current = true;
    }
    if (!open) {
      seededRef.current = false;
    }
  }, [open, initialGreeting]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || pending) return;

    setMessages((m) => [...m, { role: "user", body: trimmed }]);
    setDraft("");
    setPending(true);
    setActivity("thinking");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "assistant", body: data.error ?? "That request didn't go through.", error: true },
        ]);
        setActivity("idle");
        return;
      }

      const meta = data.cached
        ? "cached"
        : data.latencyMs != null
          ? `${data.latencyMs} ms · ${data.usage?.promptTokens ?? "?"} prompt tokens`
          : undefined;

      setMessages((m) => [
        ...m,
        { role: "assistant", body: data.answer, grounded: data.grounded !== false, meta },
      ]);

      setActivity("answering");
      window.setTimeout(() => setActivity("idle"), 2200);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", body: "The assistant is unreachable. Check your connection.", error: true },
      ]);
      setActivity("idle");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        className="chat-launcher"
        data-hidden={overHero}
        tabIndex={overHero ? -1 : 0}
        aria-hidden={overHero}
        onClick={() => setOpen(true)}
      >
        <span className="pulse" />
        Ask NI-EL about me.
      </button>
    );
  }

  const showSuggestions = messages.length === 1;

  return (
    <div className="chat-panel" role="dialog" aria-label="Ask NI-EL about Nishil's work">
      <div className="chat-head">
        <span>NI-EL · answers only from this page</span>
        <button onClick={() => setOpen(false)} aria-label="Close assistant">
          ✕
        </button>
      </div>

      <div className="chat-log" ref={logRef}>
        {messages.map((m, i) => (
          <div
            className="msg"
            key={i}
            data-role={m.role}
            data-grounded={m.grounded === false ? "false" : "true"}
            data-error={m.error ? "true" : "false"}
          >
            <span className="msg-role">{m.role === "user" ? "You" : "NI-EL"}</span>
            <div className="msg-body">{m.body}</div>
            {m.meta && <div className="msg-meta">{m.meta}</div>}
          </div>
        ))}

        {pending && (
          <div className="msg">
            <span className="msg-role">NI-EL</span>
            <span className="thinking">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
      </div>

      {showSuggestions && (
        <div className="suggestions">
          {profile.assistant.suggestions.map((s) => (
            <button key={s} onClick={() => ask(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
        }}
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask a question"
          maxLength={400}
          aria-label="Your question"
        />
        <button type="submit" disabled={pending || !draft.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}