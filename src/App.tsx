import { useState, useEffect } from "react";
import { LazyScene } from "./three/LazyScene";
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { Work } from "./components/Work";
import { Experience } from "./components/Experience";
import { Skills } from "./components/Skills";
import { Publications } from "./components/Publications";
import { Footer } from "./components/Footer";
import { Chat } from "./components/Chat";
import { Summary } from "./components/Summary";
import { useActiveSection, useScrollProgress } from "./lib/hooks";

const SECTIONS = ["top", "work", "experience", "skills", "writing", "contact"];
const NIEL_GREETING = "Hi, I am NIEL, NIshil patEL's AI Assistant";

export default function App() {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatGreeting, setChatGreeting] = useState<string | null>(null);
  const [showNavChatBtn, setShowNavChatBtn] = useState(false);

  useScrollProgress();
  const active = useActiveSection(SECTIONS);

  // Show chat button once the Work section top has scrolled up to (or past)
  // the nav bar, and keep it shown from there on. A plain IntersectionObserver
  // only fires on enter/exit edges, so its boundingClientRect snapshot is
  // stale for most of the time the user is scrolled inside a tall section -
  // we need the live value on every scroll tick instead.
  useEffect(() => {
    const workEl = document.getElementById("work");
    if (!workEl) return;

    const evaluate = () => {
      setShowNavChatBtn(workEl.getBoundingClientRect().top <= 120);
    };

    evaluate();
    window.addEventListener("scroll", evaluate, { passive: true });
    window.addEventListener("resize", evaluate);
    return () => {
      window.removeEventListener("scroll", evaluate);
      window.removeEventListener("resize", evaluate);
    };
  }, []);

  function handleAskAssistant(opts?: { greeting?: string }) {
    setChatGreeting(opts?.greeting ?? NIEL_GREETING);
    setChatOpen(true);
  }

  function toggleChat() {
    setChatOpen((prev) => !prev);
    if (!chatOpen && !chatGreeting) {
      setChatGreeting(NIEL_GREETING);
    }
  }

  return (
    <>
      <LazyScene />
      <a className="skip-link" href="#work">
        Skip to content
      </a>

      <Nav
        active={active}
        chatOpen={chatOpen}
        showChatBtn={showNavChatBtn}
        onChatToggle={toggleChat}
      />

      <main className="shell">
        <Hero onAskAssistant={handleAskAssistant} />
        <Summary onAskAssistant={() => handleAskAssistant()} />
        <Work />
        <Experience />
        <Skills />
        <Publications />
        <Footer />
      </main>

      <Chat
        open={chatOpen}
        setOpen={setChatOpen}
        initialGreeting={chatGreeting}
      />
    </>
  );
}