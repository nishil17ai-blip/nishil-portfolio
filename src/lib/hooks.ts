import { useEffect, useRef, useState } from "react";
import { useScene } from "./store";

/** Fade-and-lift on first entry. Runs once per element. */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, shown };
}

/** Feeds scroll position to the 3D field, throttled to one read per frame. */
export function useScrollProgress() {
  const setProgress = useScene((s) => s.setProgress);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const max = document.body.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(window.scrollY / max, 1) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [setProgress]);
}

/** Tracks which section is in view, for the nav and the field's focus. */
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  const setFocus = useScene((s) => s.setFocus);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const id = visible.target.id;
        setActive(id);
        const index = ids.indexOf(id);
        if (index >= 0) setFocus(index % 6);
      },
      { rootMargin: "-30% 0px -45% 0px", threshold: [0.1, 0.5] },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids, setFocus]);

  return active;
}
