"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  growthScale,
  levelLabel,
  shortDate,
  type ParentReport,
  type GrowthPoint,
} from "@/lib/parent-report";
import styles from "./parent-growth.module.css";

export function ParentGrowthChart({ report }: { report: ParentReport }) {
  const id = useId(),
    [active, setActive] = useState<GrowthPoint | null>(null);
  const svg = useRef<SVGSVGElement>(null),
    [chartWidth, setChartWidth] = useState(570);
  // 작은 화면에서도 글자를 축소하지 않고 그릴 영역만 줄여 날짜·눈금의 가독성을 유지한다.
  useEffect(() => {
    if (!svg.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setChartWidth(Math.max(270, entry.contentRect.width)),
    );
    observer.observe(svg.current);
    return () => observer.disconnect();
  }, [report.growth.length]);
  const scale = growthScale(report),
    points = scale.points;
  if (!points.length)
    return (
      <div className={styles.chartEmpty}>
        첫 측정이나 문제 풀이가 끝나면
        <br />
        읽기 단계의 변화를 그려드려요.
      </div>
    );
  const left = 104,
    top = 16,
    width = chartWidth - left - 18,
    height = 130;
  const x = (p: GrowthPoint) => left + scale.x(p.created_at) * width,
    y = (p: GrowthPoint) => top + scale.y(p.level) * height;
  const line = points
    .map((p, i) => `${i ? "L" : "M"}${x(p)},${y(p)}`)
    .join(" ");
  const chosen =
    points.find((p) => p.id === active?.id) ?? points[points.length - 1];
  const dates = [
    report.since,
    new Date(
      (Date.parse(report.since) + Date.parse(report.as_of)) / 2,
    ).toISOString(),
    report.as_of,
  ];
  return (
    <>
      <div className={styles.chartCaption} aria-live="polite">
        <strong>{levelLabel(chosen.level)}</strong>
        <span>
          {shortDate(chosen.created_at)}
          {chosen.baseline ? " · 기간 시작 기준값" : " · 기록 시점"}
        </span>
      </div>
      <svg
        ref={svg}
        className={styles.chart}
        viewBox={`0 0 ${chartWidth} 180`}
        role="group"
        aria-label="날짜별 읽기 단계 변화"
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6e9b7e" stopOpacity=".24" />
            <stop offset="1" stopColor="#6e9b7e" stopOpacity=".025" />
          </linearGradient>
        </defs>
        {scale.ticks.map((v) => (
          <g key={v}>
            <line
              x1={left}
              x2={left + width}
              y1={top + scale.y(v) * height}
              y2={top + scale.y(v) * height}
              stroke="#e9e6dd"
              strokeDasharray="3 4"
            />
            <text
              x={left - 12}
              y={top + scale.y(v) * height + 4}
              textAnchor="end"
            >
              {levelLabel(v)}
            </text>
          </g>
        ))}
        {points.length > 1 && (
          <>
            <path
              d={`${line} L${x(points[points.length - 1])},${top + height} L${x(points[0])},${top + height} Z`}
              fill={`url(#${id})`}
            />
            <path
              d={line}
              stroke="#39705b"
              strokeWidth="2.5"
              fill="none"
              strokeLinejoin="round"
            />
          </>
        )}
        {points.map((p) => (
          <g
            key={p.id}
            tabIndex={0}
            role="img"
            aria-label={`${shortDate(p.created_at)}, ${levelLabel(p.level)}${p.baseline ? ", 기간 시작 기준값" : ""}`}
            onFocus={() => setActive(p)}
            onMouseEnter={() => setActive(p)}
            onClick={() => setActive(p)}
          >
            <circle cx={x(p)} cy={y(p)} r="14" fill="transparent" />
            <circle
              cx={x(p)}
              cy={y(p)}
              r={chosen.id === p.id ? 5.5 : 4}
              fill={p.baseline ? "#faf8f0" : "#39705b"}
              stroke={p.baseline ? "#39705b" : "#fff"}
              strokeWidth="2"
            />
            <title>{`${shortDate(p.created_at)} · ${levelLabel(p.level)}`}</title>
          </g>
        ))}
        {dates.map((date, i) => (
          <text
            key={i}
            x={left + (i * width) / 2}
            y={top + height + 27}
            textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
          >
            {shortDate(date)}
          </text>
        ))}
      </svg>
      <p className={styles.finePrint}>
        변화가 보이도록 세로축을 확대했어요. 하루 마지막 기록 기준
        {points.length === 1 ? " · 기록이 더 쌓이면 선으로 이어져요." : "."}
      </p>
    </>
  );
}
