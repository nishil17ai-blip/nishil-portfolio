import { useState } from "react";
import { LazyScene } from "./three/LazyScene";
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { Work } from "./components/Work";
import { Experience } from "./components/Experience";
import { Skills } from "./components/Skills";
import { Publications } from "./components/Publications";
import { Footer } from "./components/Footer";
import { Chat } from "./components/Chat";
import { useActiveSection, useScrollProgress } from "./lib/hooks";

const SECTIONS = ["top", "work", "experience", "skills", "writing", "contact"];

export default function App() {
  const [chatOpen, setChatOpen] = useState(false);
  useScrollProgress();
  const active = useActiveSection(SECTIONS);

  return (
    <>
      <LazyScene />
      <a className="skip-link" href="#work">
        Skip to content
      </a>
      <Nav active={active} />

      <main className="shell">
        <Hero onAskAssistant={() => setChatOpen(true)} />
        <Work />
        <Experience />
        <Skills />
        <Publications />
        <Footer />
      </main>

      <Chat open={chatOpen} setOpen={setChatOpen} />
    </>
  );
}
