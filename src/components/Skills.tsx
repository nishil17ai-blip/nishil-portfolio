import { useMemo, useState } from "react";
import { profile } from "../lib/profile";
import { SectionLabel } from "./SectionLabel";
import { useReveal } from "../lib/hooks";

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
  const { ref, shown } = useReveal<HTMLDivElement>();
  const total = profile.skills.reduce((n, g) => n + g.items.length, 0);

  const left = profile.skills.filter((_, i) => i % 2 === 0);
  const right = profile.skills.filter((_, i) => i % 2 === 1);

  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const q = query.trim().toLowerCase();

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

    const matchCount = q
      ? profile.skills.reduce(
          (n, g) => n + g.items.filter((it) => it.toLowerCase().includes(q)).length,
          0
        )
      : 0;

    return { leftBoxes: shiftedLeft, rightBoxes: shiftedRight, height, matchCount };
  }, [left, right, q]);

  const cx = WIDTH / 2;
  const cy = height / 2;

  const groupMatches = (groupName: string) => {
    if (!q) return false;
    const g = profile.skills.find((s) => s.group === groupName);
    return !!g && g.items.some((it) => it.toLowerCase().includes(q));
  };

  const anyActive = !!activeGroup || !!q;

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
            const itemMatch = q && item.toLowerCase().includes(q);
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
    <section id="skills">
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
            placeholder="Search a skill…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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
        {q && (
          <span className="erd-count">
            {matchCount} match{matchCount === 1 ? "" : "es"}
          </span>
        )}
      </div>

      <div className="erd-wrap reveal" ref={ref} data-shown={shown}>
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
    </section>
  );
}