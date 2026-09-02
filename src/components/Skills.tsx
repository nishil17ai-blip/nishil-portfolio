import { useEffect, useMemo, useRef, useState } from "react";
import { profile } from "../lib/profile";
import { SectionLabel } from "./SectionLabel";

const WIDTH = 1080;
const BOX_W = 248;
const HEADER_H = 34;
const ITEM_H = 20;
const PAD_Y = 20;
const GAP_Y = 22;
const SIDE_MARGIN = 36;
const CENTER_R = 58;

function boxHeight(itemCount: number): number {
  return HEADER_H + itemCount * ITEM_H + PAD_Y;
}

function stackSide(groups: typeof profile.skills, top: number) {
  let y = top;
  return groups.map((g) => {
    const h = boxHeight(g.items.length);
    const box = { group: g, y, h };
    y += h + GAP_Y;
    return box;
  });
}

export function Skills() {
  const [shown, setShown] = useState(false);
  const total = profile.skills.reduce((n, g) => n + g.items.length, 0);

  const left = profile.skills.filter((_, i) => i % 2 === 0);
  const right = profile.skills.filter((_, i) => i % 2 === 1);

  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // The search box accepts more than one skill at a time, comma- (or
  // semicolon-) separated - e.g. "react, docker, aws" - so each term
  // is matched independently rather than the whole string being
  // treated as one continuous substring (which meant typing a second
  // skill just broke the match instead of adding to it). Multi-word
  // skill names like "Machine Learning" stay intact as one term since
  // only commas/semicolons split, not whitespace.
  const terms = query
    .split(/[,;]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const itemMatchesQuery = (item: string) => {
    if (!terms.length) return false;
    const lower = item.toLowerCase();
    return terms.some((t) => lower.includes(t));
  };

  const { leftBoxes, rightBoxes, height, matchCount } = useMemo(() => {
    const leftBoxes = stackSide(left, 0);
    const rightBoxes = stackSide(right, 0);
    const leftTotal = leftBoxes.length
      ? leftBoxes[leftBoxes.length - 1].y + leftBoxes[leftBoxes.length - 1].h
      : 0;
    const rightTotal = rightBoxes.length
      ? rightBoxes[rightBoxes.length - 1].y + rightBoxes[rightBoxes.length - 1].h
      : 0;
    const contentH = Math.max(leftTotal, rightTotal);
    const height = contentH + 48;
    const leftOffset = (height - leftTotal) / 2;
    const rightOffset = (height - rightTotal) / 2;
    const shiftedLeft = leftBoxes.map((b) => ({ ...b, y: b.y + leftOffset }));
    const shiftedRight = rightBoxes.map((b) => ({ ...b, y: b.y + rightOffset }));

    const matchCount = terms.length
      ? profile.skills.reduce(
          (n, g) =>
            n +
            g.items.filter((it) => {
              const lower = it.toLowerCase();
              return terms.some((t) => lower.includes(t));
            }).length,
          0
        )
      : 0;

    return { leftBoxes: shiftedLeft, rightBoxes: shiftedRight, height, matchCount };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, right, terms.join("|")]);

  const cx = WIDTH / 2;
  const cy = height / 2;

  const groupMatches = (groupName: string) => {
    if (!terms.length) return false;
    const g = profile.skills.find((s) => s.group === groupName);
    return !!g && g.items.some((it) => itemMatchesQuery(it));
  };

  const anyActive = !!activeGroup || terms.length > 0;

  // Mobile-only "pin and pan": rather than fighting touch events to
  // redirect vertical scroll into horizontal scrollLeft (unreliable -
  // the browser has usually already committed to its own scroll
  // handling before a touchmove listener can intercept it), this pins
  // the diagram in place with real CSS position:sticky and converts
  // ordinary vertical scroll progress directly into a horizontal
  // translateX on the diagram itself. The section is made taller than
  // one screen by exactly the distance the diagram needs to pan, so
  // scrolling through that extra height *is* the horizontal sweep -
  // once it's exhausted, the sticky pin releases and normal scroll
  // carries on into Publications, and the same happens symmetrically
  // in reverse scrolling back up. This never calls preventDefault and
  // never touches touch events at all, so it can't get out-sync with
  // the browser's own scroll physics the way the old approach could.
  const wrapRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const [panExtraPx, setPanExtraPx] = useState(0);
  const [panX, setPanX] = useState(0);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [readBufferPx, setReadBufferPx] = useState(0);

  // Same fade-and-lift-on-first-entry behavior useReveal provides
  // elsewhere, reimplemented locally against wrapRef so this element
  // only needs one ref (useReveal's own ref is read-only in its
  // return type and can't be merged with a second ref callback here).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const revealObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          revealObserver.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    revealObserver.observe(el);
    return () => revealObserver.disconnect();
  }, []);

  // How much plain scroll distance the visitor gets once the section
  // reaches the top of the viewport before the horizontal sweep even
  // starts - time to actually land on the page, see the heading and
  // search box, before scrolling starts panning the diagram. Expressed
  // as a fraction of viewport height so it scales sensibly across
  // phone sizes rather than being a fixed pixel count.
  const READ_BUFFER_VH = 0.35;

  // Decide whether the pin-and-pan behavior applies at all (touch
  // devices only - desktop already shows the full diagram at once) and
  // how much extra scroll distance the pan needs, which depends on how
  // much wider the diagram is than the viewport.
  useEffect(() => {
    const evaluate = () => {
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      setPinEnabled(coarse);
      setReadBufferPx(window.innerHeight * READ_BUFFER_VH);
      if (!coarse || !wrapRef.current) {
        setPanExtraPx(0);
        return;
      }
      const overflow = wrapRef.current.scrollWidth - wrapRef.current.clientWidth;
      setPanExtraPx(Math.max(overflow, 0));
    };
    evaluate();
    window.addEventListener("resize", evaluate);
    return () => window.removeEventListener("resize", evaluate);
  }, [height]);

  useEffect(() => {
    if (!pinEnabled || panExtraPx <= 0) {
      setPanX(0);
      return;
    }
    const section = sectionRef.current;
    if (!section) return;

    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const scrolledIntoPin = -rect.top;
      // Nothing happens for the first readBufferPx of scroll into the
      // pin zone - the visitor sees the section arrive and settle
      // before any panning starts. Only scroll distance past that
      // buffer maps to horizontal movement, and it's scaled back up so
      // the full panExtraPx range is still covered by the time the pin
      // zone's remaining height is exhausted.
      const pastBuffer = Math.max(scrolledIntoPin - readBufferPx, 0);
      const raw = pastBuffer / panExtraPx;
      const progress = Math.min(Math.max(raw, 0), 1);
      setPanX(progress * panExtraPx);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pinEnabled, panExtraPx, readBufferPx]);


  // SVG <rect> can't use backdrop-filter - blur only works on real HTML
  // elements. So the frosted-glass look each box needs (to match the
  // Work/Experience cards) comes from an invisible HTML div stacked
  // exactly on top of each box, positioned in percentages of the
  // SVG's own coordinate space so it tracks the diagram's scaling
  // 1:1 on every screen size, including the horizontally-scrolling
  // mobile layout.
  const renderBlurOverlay = (boxes: typeof leftBoxes, side: "left" | "right") =>
    boxes.map(({ group, y, h }) => {
      const x = side === "left" ? SIDE_MARGIN : WIDTH - SIDE_MARGIN - BOX_W;
      const isHighlighted = activeGroup === group.group || groupMatches(group.group);
      const isDim = anyActive && !isHighlighted;
      return (
        <div
          key={group.group}
          className={`erd-box-blur${isDim ? " is-dim" : ""}`}
          style={{
            left: `${(x / WIDTH) * 100}%`,
            top: `${(y / height) * 100}%`,
            width: `${(BOX_W / WIDTH) * 100}%`,
            height: `${(h / height) * 100}%`,
          }}
        />
      );
    });

  const renderSide = (boxes: typeof leftBoxes, side: "left" | "right") =>
    boxes.map(({ group, y, h }) => {
      const x = side === "left" ? SIDE_MARGIN : WIDTH - SIDE_MARGIN - BOX_W;
      const edgeX = side === "left" ? x + BOX_W : x;
      const midY = y + h / 2;

      const isHighlighted = activeGroup === group.group || groupMatches(group.group);
      const isDim = anyActive && !isHighlighted;

      const startX = side === "left" ? cx - CENTER_R : cx + CENTER_R;
      const bendX = (startX + edgeX) / 2;

      return (
        <g
          key={group.group}
          className={`erd-entity${isHighlighted ? " is-active" : ""}${isDim ? " is-dim" : ""}`}
          onMouseEnter={() => setActiveGroup(group.group)}
          onMouseLeave={() => setActiveGroup(null)}
        >
          <path
            className="erd-edge"
            d={`M ${startX} ${cy} C ${bendX} ${cy}, ${bendX} ${midY}, ${edgeX} ${midY}`}
            fill="none"
          />
          <rect className="erd-box" x={x} y={y} width={BOX_W} height={h} rx={10} />
          <text className="erd-box-title" x={x + 16} y={y + 22}>
            {group.group}
          </text>
          <line
            className="erd-box-rule"
            x1={x + 14}
            y1={y + HEADER_H - 8}
            x2={x + BOX_W - 14}
            y2={y + HEADER_H - 8}
          />
          {group.items.map((item, i) => {
            const itemMatch = itemMatchesQuery(item);
            return (
              <text
                key={item}
                className={`erd-item${itemMatch ? " erd-item-match" : ""}`}
                x={x + 18}
                y={y + HEADER_H + i * ITEM_H + 14}
              >
                {item}
              </text>
            );
          })}
        </g>
      );
    });

  return (
    <section id="skills" ref={sectionRef}>
      <SectionLabel text="Stack" count={`${total} tools`} />
      <h2>What I reach for</h2>
      <p>
        Mapped like the schema it kind of is, connecting every skill at the center node.
        Search or hover to trace the connections.
      </p>

      <div className="erd-controls">
        <div className="erd-search-wrap">
          <input
            type="text"
            className="erd-search"
            placeholder="Search skills… separate with commas"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search skills, separate multiple with commas"
          />
          {query && (
            <button
              type="button"
              className="erd-search-clear"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        {terms.length > 0 && (
          <span className="erd-count">
            {matchCount} match{matchCount === 1 ? "" : "es"}
            {terms.length > 1 ? ` across ${terms.length} terms` : ""}
          </span>
        )}
      </div>

      {/* On mobile this spacer is exactly as tall as one screen plus a
         short read buffer plus the distance the diagram needs to pan -
         scrolling through the buffer first does nothing (letting the
         visitor actually arrive and read the page), then the remaining
         height drives the horizontal sweep. On desktop panExtraPx is
         always 0 (the whole diagram already fits on screen), so this
         collapses to a plain wrapper with no extra scroll distance and
         no behavior change at all. */}
      <div
        ref={pinRef}
        className="erd-pin-zone"
        style={
          pinEnabled && panExtraPx > 0
            ? { height: `calc(100svh + ${readBufferPx + panExtraPx}px)` }
            : undefined
        }
      >
        <div
          className="erd-pin"
          style={pinEnabled && panExtraPx > 0 ? { position: "sticky", top: 0 } : undefined}
        >
          <div
            className="erd-wrap reveal"
            ref={wrapRef}
            data-shown={shown}
          >
            <div
              className="erd-inner"
              style={{
                aspectRatio: `${WIDTH} / ${height}`,
                transform: panX ? `translateX(-${panX}px)` : undefined,
              }}
            >
              <div className="erd-blur-layer" aria-hidden="true">
                {renderBlurOverlay(leftBoxes, "left")}
                {renderBlurOverlay(rightBoxes, "right")}
              </div>

              <svg
                viewBox={`0 0 ${WIDTH} ${height}`}
                className="erd-svg"
                role="img"
                aria-label="Diagram of skills grouped by category, connected to a central node"
              >
                {renderSide(leftBoxes, "left")}
                {renderSide(rightBoxes, "right")}

                <g className="erd-center">
                  <circle cx={cx} cy={cy} r={CENTER_R} />
                  <text x={cx} y={cy - 6} className="erd-center-name">
                    Nishil
                  </text>
                  <text x={cx} y={cy + 16} className="erd-center-name">
                    Patel
                  </text>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}