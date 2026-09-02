import { useEffect, useRef, useState } from "react";
import { profile } from "../lib/profile";
import { useScene } from "../lib/store";

interface Message {
  role: "user" | "assistant";
  body: string;
  grounded?: boolean;
  error?: boolean;
  notice?: boolean;
}

const DEFAULT_GREETING: Message = {
  role: "assistant",
  body: "Grounded, not generic - ask me anything about Nishil's work, stack, or background.",
  grounded: true,
};

// A friendly, non-blocking reminder - not an actual block, the real
// rate limit is enforced server-side (3/min). This just discourages
// rapid-fire questions before someone hits that wall and sees an error.
const PACE_NOTICE_EVERY = 5;
const PACE_NOTICE_TEXT = "That's a few in a row - give it a minute, then keep going whenever you're ready.";

// sessionStorage rather than localStorage on purpose: it survives the
// panel being closed and reopened, and survives a page reload in the
// same tab, but clears the moment the tab itself is closed - which is
// exactly "pick the conversation back up until you close the tab."
const STORAGE_KEY = "niel:chat-history";

function loadStoredMessages(): Message[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function Chat({
  open,
  setOpen,
  initialGreeting = null,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  initialGreeting?: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>(
    () => loadStoredMessages() ?? [DEFAULT_GREETING],
  );
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const setActivity = useScene((s) => s.setActivity);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seededRef = useRef(false);

  // Persist on every change. sessionStorage is per-tab and synchronous,
  // so this is cheap enough to do on every message rather than
  // debouncing it.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* storage can fail in private-browsing modes - conversation just
         won't survive a reload in that case, nothing else breaks. */
    }
  }, [messages]);

  // When panel opens with a greeting from Hero, seed NIEL's intro as the
  // first message - but only if there's no real conversation already
  // restored from storage. Otherwise clicking "Ask NIEL about me" again
  // mid-conversation would wipe out everything that came before it.
  useEffect(() => {
    const hasRealHistory =
      messages.length > 1 || (messages.length === 1 && messages[0].body !== DEFAULT_GREETING.body);

    if (open && initialGreeting && !seededRef.current && !hasRealHistory) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialGreeting]);

  useEffect(() => {
    // Auto-focusing is a nice touch on desktop (keyboard input works
    // immediately), but on a touch device it pops the on-screen
    // keyboard the instant the panel opens - before the visitor has
    // even read NIEL's greeting - and eats up to half the viewport
    // doing it. Matching against a coarse pointer is a reasonable
    // proxy for "has a virtual keyboard that would appear."
    const hasCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches;
    if (open && !hasCoarsePointer) inputRef.current?.focus();
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

    // Count this question against how many the visitor has already sent
    // this session, so every 5th one gets a gentle pacing reminder.
    const priorUserCount = messages.filter((m) => m.role === "user").length;
    const showPaceNotice = (priorUserCount + 1) % PACE_NOTICE_EVERY === 0;

    setMessages((m) => [
      ...m,
      { role: "user", body: trimmed },
      ...(showPaceNotice
        ? [{ role: "assistant", body: PACE_NOTICE_TEXT, notice: true } as Message]
        : []),
    ]);
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

      // Latency, token counts, and cache hits are useful in dev but
      // meaningless (and a bit unpolished) for an actual visitor to see -
      // deliberately not surfaced in the UI.
      setMessages((m) => [
        ...m,
        { role: "assistant", body: data.answer, grounded: data.grounded !== false },
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

  // No persistent floating launcher - entry points into the assistant
  // now live inline (the Hero button and the "Ask NIEL" link in the
  // About Me card), so there's nothing to render here when closed.
  if (!open) {
    return null;
  }

  const showSuggestions = messages.length === 1;

  return (
    <div className="chat-panel" role="dialog" aria-label="Ask NIEL about Nishil's work">
      <div className="chat-head">
        <div className="chat-head-id">
          <span className="avatar-ring">
            <span className="chat-avatar">N</span>
          </span>
          <span className="chat-head-text">
            <strong>NIEL</strong>
            <small>No fluff, just facts.</small>
          </span>
        </div>
        <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close assistant">
          ✕
        </button>
      </div>

      <div className="chat-log" ref={logRef}>
        {messages.map((m, i) =>
          m.notice ? (
            <div className="msg-system" key={i}>
              {m.body}
            </div>
          ) : (
            <div
              className="msg"
              key={i}
              data-role={m.role}
              data-grounded={m.grounded === false ? "false" : "true"}
              data-error={m.error ? "true" : "false"}
            >
              {m.role === "assistant" && (
                <span className="avatar-ring avatar-ring--sm">
                  <span className="msg-avatar">N</span>
                </span>
              )}
              <div className="msg-bubble">
                {m.grounded === false && !m.error && (
                  <span className="msg-flag" title="Not from Nishil's profile">
                    ⓘ off-page
                  </span>
                )}
                <div className="msg-body">{m.body}</div>
              </div>
            </div>
          ),
        )}

        {pending && (
          <div className="msg" data-role="assistant">
            <span className="avatar-ring avatar-ring--sm">
              <span className="msg-avatar">N</span>
            </span>
            <div className="msg-bubble">
              <span className="thinking">
                <i />
                <i />
                <i />
                <em>NIEL is typing…</em>
              </span>
            </div>
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
        <button className="chat-send" type="submit" disabled={pending || !draft.trim()} aria-label="Send">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
            <path
              d="M4 12L20 4L14 20L11 13L4 12Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}