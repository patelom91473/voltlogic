"use client";

import { useState, useMemo } from "react";
import { useCircuitStore } from "@/store/circuit-store";
import { X, ChevronDown, ChevronUp, Minus } from "lucide-react";

const W = 640;
const H = 280;
const PAD = { l: 50, r: 16, t: 16, b: 28 };
const GW = W - PAD.l - PAD.r;
const GH = H - PAD.t - PAD.b;
const H_DIVS = 10;
const V_DIVS = 7;

const TIME_BASES = [
  { label: "0.5 ms", sec: 0.0005 },
  { label: "1 ms",   sec: 0.001 },
  { label: "2 ms",   sec: 0.002 },
  { label: "5 ms",   sec: 0.005 },
  { label: "10 ms",  sec: 0.01 },
  { label: "50 ms",  sec: 0.05 },
  { label: "100 ms", sec: 0.1 },
];

export function Oscilloscope() {
  const scopeOpen = useCircuitStore((s) => s.scopeOpen);
  const setScopeOpen = useCircuitStore((s) => s.setScopeOpen);
  const probes = useCircuitStore((s) => s.probes);
  const traces = useCircuitStore((s) => s.scopeTraces);
  const removeProbe = useCircuitStore((s) => s.removeProbe);
  const simTime = useCircuitStore((s) => s.simTime);
  const simRunning = useCircuitStore((s) => s.simRunning);

  const [tbIdx, setTbIdx] = useState(3);
  const [vScale, setVScale] = useState(1);
  const [collapsed, setCollapsed] = useState(false);

  const tb = TIME_BASES[tbIdx];
  const windowSec = tb.sec * H_DIVS;
  const vRange = 6 * vScale;
  const vMin = -0.5 * vScale;

  const gridLines = useMemo(() => {
    const lines: React.ReactElement[] = [];
    for (let i = 0; i <= H_DIVS; i++) {
      const x = PAD.l + (GW * i) / H_DIVS;
      lines.push(
        <line key={`v${i}`} x1={x} y1={PAD.t} x2={x} y2={PAD.t + GH}
          stroke={i === 0 ? "#2a4a2a" : "#1a3a1a"} strokeWidth={i === 0 ? 1 : 0.5} />,
      );
    }
    for (let j = 0; j <= V_DIVS; j++) {
      const y = PAD.t + (GH * j) / V_DIVS;
      lines.push(
        <line key={`h${j}`} x1={PAD.l} y1={y} x2={PAD.l + GW} y2={y}
          stroke="#1a3a1a" strokeWidth={0.5} />,
      );
    }
    return lines;
  }, []);

  const traceElements = useMemo(() => {
    return probes.map((probe) => {
      const data = traces[probe.nodeKey];
      if (!data || data.length < 2) return null;

      const tEnd = simTime;
      const tStart = tEnd - windowSec;

      const visible = data.filter((s) => s.t >= tStart && s.t <= tEnd);
      if (visible.length < 2) return null;

      const points = visible.map((s) => {
        const px = PAD.l + ((s.t - tStart) / windowSec) * GW;
        const py = PAD.t + GH - ((s.v - vMin) / vRange) * GH;
        return `${px.toFixed(1)},${Math.max(PAD.t, Math.min(PAD.t + GH, py)).toFixed(1)}`;
      });

      return (
        <polyline key={probe.id} points={points.join(" ")}
          fill="none" stroke={probe.color} strokeWidth={1.5}
          style={{ filter: `drop-shadow(0 0 3px ${probe.color}40)` }} />
      );
    });
  }, [probes, traces, simTime, windowSec, vMin, vRange]);

  if (!scopeOpen) return null;

  return (
    <div className="fixed bottom-0 left-52 right-64 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm"
      style={{ transition: "height 200ms ease" }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 h-8 px-3 border-b border-zinc-800/60">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
          Scope
        </span>
        <span className={`text-[9px] font-mono ${simRunning ? "text-emerald-400" : "text-zinc-600"}`}>
          {simRunning ? `t = ${(simTime * 1000).toFixed(1)} ms` : "STOPPED"}
        </span>

        <div className="flex-1" />

        {/* Timebase */}
        <div className="flex items-center gap-1">
          <span className="text-[8px] font-mono text-zinc-600 uppercase">Time/div</span>
          <button onClick={() => setTbIdx(Math.max(0, tbIdx - 1))}
            className="w-4 h-4 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
            <Minus size={10} />
          </button>
          <span className="text-[9px] font-mono text-zinc-300 w-12 text-center">{tb.label}</span>
          <button onClick={() => setTbIdx(Math.min(TIME_BASES.length - 1, tbIdx + 1))}
            className="w-4 h-4 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rotate-90">
            <Minus size={10} />
          </button>
        </div>

        {/* V/div */}
        <div className="flex items-center gap-1 ml-2">
          <span className="text-[8px] font-mono text-zinc-600 uppercase">V/div</span>
          <button onClick={() => setVScale((s) => Math.max(0.25, s / 2))}
            className="px-1 h-4 rounded text-[9px] font-mono text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">+</button>
          <span className="text-[9px] font-mono text-zinc-300 w-10 text-center">
            {((vRange / V_DIVS)).toFixed(2)}V
          </span>
          <button onClick={() => setVScale((s) => Math.min(4, s * 2))}
            className="px-1 h-4 rounded text-[9px] font-mono text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">&minus;</button>
        </div>

        <button onClick={() => setCollapsed((c) => !c)}
          className="ml-2 p-0.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
          {collapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <button onClick={() => setScopeOpen(false)}
          className="p-0.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
          <X size={12} />
        </button>
      </div>

      {!collapsed && (
        <div className="flex">
          {/* SVG scope screen */}
          <svg width={W} height={H} className="shrink-0 select-none"
            style={{ background: "#080f08" }}>
            <rect x={PAD.l} y={PAD.t} width={GW} height={GH} fill="#0a0f0a" />
            {gridLines}

            {/* Y-axis labels */}
            {Array.from({ length: V_DIVS + 1 }, (_, j) => {
              const y = PAD.t + (GH * j) / V_DIVS;
              const v = vMin + vRange * (1 - j / V_DIVS);
              return (
                <text key={j} x={PAD.l - 4} y={y + 3} textAnchor="end"
                  fill="#3f6f3f" fontSize="8" fontFamily="var(--font-jetbrains)">
                  {v.toFixed(1)}
                </text>
              );
            })}

            {/* X-axis labels */}
            {Array.from({ length: H_DIVS + 1 }, (_, i) => {
              if (i % 2 !== 0) return null;
              const x = PAD.l + (GW * i) / H_DIVS;
              const t = (tb.sec * i * 1000);
              return (
                <text key={i} x={x} y={PAD.t + GH + 14} textAnchor="middle"
                  fill="#3f6f3f" fontSize="8" fontFamily="var(--font-jetbrains)">
                  {t < 1 ? `${(t * 1000).toFixed(0)}µs` : `${t.toFixed(1)}ms`}
                </text>
              );
            })}

            {/* Clip region */}
            <defs>
              <clipPath id="scopeClip">
                <rect x={PAD.l} y={PAD.t} width={GW} height={GH} />
              </clipPath>
            </defs>
            <g clipPath="url(#scopeClip)">
              {traceElements}
            </g>

            {/* Border */}
            <rect x={PAD.l} y={PAD.t} width={GW} height={GH}
              fill="none" stroke="#2a4a2a" strokeWidth={1} />
          </svg>

          {/* Probe list */}
          <div className="flex-1 min-w-0 p-2 space-y-1 overflow-y-auto" style={{ maxHeight: H }}>
            {probes.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                <p className="text-[10px] font-mono text-center leading-relaxed">
                  Right-click a wire<br />and select &ldquo;Probe&rdquo;<br />to add a trace
                </p>
              </div>
            )}
            {probes.map((p) => {
              const data = traces[p.nodeKey];
              const lastV = data && data.length > 0 ? data[data.length - 1].v : 0;
              return (
                <div key={p.id} className="flex items-center gap-2 px-2 py-1 rounded bg-zinc-900/60 border border-zinc-800/40">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: p.color, boxShadow: `0 0 6px ${p.color}60` }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-mono text-zinc-300 truncate block">{p.label}</span>
                    <span className="text-[8px] font-mono text-zinc-500">{p.nodeKey}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold shrink-0" style={{ color: p.color }}>
                    {lastV.toFixed(2)}V
                  </span>
                  <button onClick={() => removeProbe(p.id)}
                    className="p-0.5 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10">
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
