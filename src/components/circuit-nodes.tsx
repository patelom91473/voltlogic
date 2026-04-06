"use client";

import { memo, useEffect, type CSSProperties } from "react";
import { Handle, Position, useUpdateNodeInternals, type NodeProps, type Node } from "@xyflow/react";
import type { CircuitNodeData } from "@/store/circuit-store";
import { useCircuitStore } from "@/store/circuit-store";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

type CircuitNode = Node<CircuitNodeData>;
type CircuitNodeProps = NodeProps<CircuitNode>;

// ─── CONSTANTS ───────────────────────────────────────────────────────
// 80×80 container. All handle offsets are multiples of 20.

const S = 80;
const M = 40;
const WIRE = "#a1a1aa";
const JB_MONO = "var(--font-jetbrains), ui-monospace, monospace";
const SEL_GLOW = "drop-shadow(0 0 6px rgba(34,211,238,0.45))";
const SEL_OUTLINE: CSSProperties = {
  outline: "1.5px dashed #22d3ee",
  outlineOffset: "4px",
  borderRadius: "2px",
};

// Gate SVGs use viewBox 0 0 100 100 inside the 80px container.
// Input handle positions are computed dynamically based on input count.

// ─── HANDLE POSITION CALCULATOR ──────────────────────────────────────

function rh(
  side: "l" | "r" | "t" | "b",
  offset: number,
  rot: number,
  size: number = S,
): { position: Position; style: CSSProperties } {
  const m = size / 2;
  let x: number, y: number;
  switch (side) {
    case "l": x = 0;    y = offset; break;
    case "r": x = size; y = offset; break;
    case "t": x = offset; y = 0;    break;
    case "b": x = offset; y = size; break;
  }
  const steps = Math.round(((rot % 360 + 360) % 360) / 90);
  for (let i = 0; i < steps; i++) {
    const nx = m - (y - m);
    const ny = m + (x - m);
    x = nx; y = ny;
  }
  const position =
    x < 1 ? Position.Left :
    x > size - 1 ? Position.Right :
    y < 1 ? Position.Top :
    Position.Bottom;
  const lr = position === Position.Left || position === Position.Right;
  return { position, style: lr ? { top: Math.round(y) } : { left: Math.round(x) } };
}

// ─── WRAPPERS ────────────────────────────────────────────────────────

function Wrap({ id, rotation, selected, children }: {
  id: string; rotation: number; selected: boolean; children: React.ReactNode;
}) {
  const update = useUpdateNodeInternals();
  useEffect(() => { update(id); }, [rotation, id, update]);
  return (
    <div style={{
      width: S, height: S,
      filter: selected ? SEL_GLOW : undefined,
      ...(selected ? SEL_OUTLINE : {}),
    }}>
      {children}
    </div>
  );
}

function WrapSized({ id, rotation, selected, size, children }: {
  id: string; rotation: number; selected: boolean; size: number; children: React.ReactNode;
}) {
  const update = useUpdateNodeInternals();
  useEffect(() => { update(id); }, [rotation, id, update]);
  return (
    <div style={{
      width: size, height: size,
      filter: selected ? SEL_GLOW : undefined,
      ...(selected ? SEL_OUTLINE : {}),
    }}>
      {children}
    </div>
  );
}

function WrapRect({ id, rotation, selected, w, h, children }: {
  id: string; rotation: number; selected: boolean; w: number; h: number; children: React.ReactNode;
}) {
  const update = useUpdateNodeInternals();
  useEffect(() => { update(id); }, [rotation, id, update]);
  return (
    <div style={{
      width: w, height: h,
      filter: selected ? SEL_GLOW : undefined,
      ...(selected ? SEL_OUTLINE : {}),
    }}>
      {children}
    </div>
  );
}

function ValueLabel({ text, rotation = 0, size = S }: { text: string; rotation?: number; size?: number }) {
  const isVert = rotation === 90 || rotation === 270;
  if (isVert) {
    return (
      <div className="absolute top-0 bottom-0 flex items-center pointer-events-none" style={{ left: size + 4 }}>
        <span className="text-[9px] text-zinc-500 whitespace-nowrap" style={{ fontFamily: JB_MONO }}>{text}</span>
      </div>
    );
  }
  return (
    <div className="absolute left-0 right-0 text-center pointer-events-none" style={{ bottom: -14 }}>
      <span className="text-[9px] text-zinc-500" style={{ fontFamily: JB_MONO }}>{text}</span>
    </div>
  );
}

function MeterReading({ text, color }: { text: string; color: string }) {
  return (
    <div
      className="absolute left-0 right-0 text-center pointer-events-none"
      style={{ bottom: -16, zIndex: 50, isolation: "isolate" }}
    >
      <span className="text-[9px] font-medium" style={{ fontFamily: JB_MONO, color }}>{text}</span>
    </div>
  );
}

function formatCurrent(a: number): string {
  if (Math.abs(a) >= 1) return `${a.toFixed(2)}A`;
  if (Math.abs(a) >= 0.001) return `${(a * 1000).toFixed(1)}mA`;
  return `${(a * 1e6).toFixed(0)}µA`;
}

// ═══════════════════════════════════════════════════════════════════════
// 2-TERMINAL NODES — 80×80, handles at y=40 (center, on 20px grid)
// ═══════════════════════════════════════════════════════════════════════

export const ResistorNode = memo(function ResistorNode(p: CircuitNodeProps) {
  const { component } = p.data;
  const rot = component.rotation;
  const hA = rh("l", M, rot);
  const hB = rh("r", M, rot);
  const nc = (component.properties.nodeColor as string) || "";
  const label = component.value >= 1e6 ? `${component.value / 1e6}MΩ`
    : component.value >= 1e3 ? `${component.value / 1e3}kΩ`
    : `${component.value}Ω`;
  return (
    <Wrap id={p.id} rotation={rot} selected={p.selected}>
      <Handle type="source" position={hA.position} id="a" style={hA.style} />
      <svg width={S} height={S} viewBox="0 0 80 80">
        <g transform={`rotate(${rot},40,40)`}>
          <line x1="0" y1="40" x2="16" y2="40" stroke={WIRE} strokeWidth="2" />
          <path d="M16,40 L22,28 L32,52 L42,28 L52,52 L62,28 L64,40"
            fill="none" stroke={nc || "#fbbf24"} strokeWidth="2" strokeLinejoin="round" />
          <line x1="64" y1="40" x2="80" y2="40" stroke={WIRE} strokeWidth="2" />
        </g>
      </svg>
      <ValueLabel text={label} rotation={rot} />
      <Handle type="source" position={hB.position} id="b" style={hB.style} />
    </Wrap>
  );
});

export const CapacitorNode = memo(function CapacitorNode(p: CircuitNodeProps) {
  const { component } = p.data;
  const rot = component.rotation;
  const hA = rh("l", M, rot);
  const hB = rh("r", M, rot);
  const nc = (component.properties.nodeColor as string) || "";
  return (
    <Wrap id={p.id} rotation={rot} selected={p.selected}>
      <Handle type="source" position={hA.position} id="a" style={hA.style} />
      <svg width={S} height={S} viewBox="0 0 80 80">
        <g transform={`rotate(${rot},40,40)`}>
          <line x1="0" y1="40" x2="34" y2="40" stroke={WIRE} strokeWidth="2" />
          <line x1="34" y1="26" x2="34" y2="54" stroke={nc || "#38bdf8"} strokeWidth="2.5" />
          <line x1="46" y1="26" x2="46" y2="54" stroke={nc || "#38bdf8"} strokeWidth="2.5" />
          <line x1="46" y1="40" x2="80" y2="40" stroke={WIRE} strokeWidth="2" />
        </g>
      </svg>
      <ValueLabel text={`${component.value}${component.unit}`} rotation={rot} />
      <Handle type="source" position={hB.position} id="b" style={hB.style} />
    </Wrap>
  );
});

export const InductorNode = memo(function InductorNode(p: CircuitNodeProps) {
  const { component } = p.data;
  const rot = component.rotation;
  const hA = rh("l", M, rot);
  const hB = rh("r", M, rot);
  const nc = (component.properties.nodeColor as string) || "";
  return (
    <Wrap id={p.id} rotation={rot} selected={p.selected}>
      <Handle type="source" position={hA.position} id="a" style={hA.style} />
      <svg width={S} height={S} viewBox="0 0 80 80">
        <g transform={`rotate(${rot},40,40)`}>
          <line x1="0" y1="40" x2="10" y2="40" stroke={WIRE} strokeWidth="2" />
          <path d="M10,40 C10,28 20,28 20,40 C20,28 30,28 30,40 C30,28 40,28 40,40 C40,28 50,28 50,40 C50,28 60,28 60,40 C60,28 70,28 70,40"
            fill="none" stroke={nc || "#a78bfa"} strokeWidth="2" />
          <line x1="70" y1="40" x2="80" y2="40" stroke={WIRE} strokeWidth="2" />
        </g>
      </svg>
      <ValueLabel text={`${component.value}${component.unit}`} rotation={rot} />
      <Handle type="source" position={hB.position} id="b" style={hB.style} />
    </Wrap>
  );
});

export const LEDNode = memo(function LEDNode(p: CircuitNodeProps) {
  const { component } = p.data;
  const rot = component.rotation;
  const hA = rh("l", M, rot);
  const hB = rh("r", M, rot);
  const isPowered = useCircuitStore((s) => s.isPowered);
  const analysis = useCircuitStore((s) => s.analysis);
  const lit = isPowered && analysis !== null;
  const c = lit ? "#4ade80" : "#52525b";
  return (
    <Wrap id={p.id} rotation={rot} selected={p.selected}>
      <Handle type="source" position={hA.position} id="anode" style={hA.style} />
      <svg width={S} height={S} viewBox="0 0 80 80">
        <g transform={`rotate(${rot},40,40)`}>
          <line x1="0" y1="40" x2="18" y2="40" stroke={WIRE} strokeWidth="2" />
          <polygon points="18,26 18,54 46,40" fill="none" stroke={c} strokeWidth="2" />
          <line x1="46" y1="26" x2="46" y2="54" stroke={c} strokeWidth="2" />
          <line x1="46" y1="40" x2="80" y2="40" stroke={WIRE} strokeWidth="2" />
          {lit && <>
            <line x1="36" y1="22" x2="42" y2="16" stroke={c} strokeWidth="1.2" />
            <line x1="42" y1="20" x2="48" y2="14" stroke={c} strokeWidth="1.2" />
            <circle cx="34" cy="40" r="16" fill={c} opacity="0.06" />
          </>}
        </g>
      </svg>
      <ValueLabel text={`${component.value}V`} rotation={rot} />
      <Handle type="source" position={hB.position} id="cathode" style={hB.style} />
    </Wrap>
  );
});

export const VoltageSourceNode = memo(function VoltageSourceNode(p: CircuitNodeProps) {
  const { component } = p.data;
  const rot = component.rotation;
  const hNeg = rh("l", M, rot);
  const hPos = rh("r", M, rot);
  const isPowered = useCircuitStore((s) => s.isPowered);
  const a = isPowered ? "#22d3ee" : "#52525b";
  const r = Number(component.properties["internalResistance"] ?? 0);
  const label = r > 0 ? `${component.value}V r=${r}Ω` : `${component.value}V`;
  return (
    <Wrap id={p.id} rotation={rot} selected={p.selected}>
      <Handle type="target" position={hNeg.position} id="neg" style={hNeg.style} />
      <svg width={S} height={S} viewBox="0 0 80 80">
        <g transform={`rotate(${rot},40,40)`}>
          <line x1="0" y1="40" x2="24" y2="40" stroke={WIRE} strokeWidth="2" />
          <circle cx="40" cy="40" r="16" fill="none" stroke={a} strokeWidth="2" />
          <line x1="34" y1="34" x2="34" y2="40" stroke={a} strokeWidth="1.5" />
          <line x1="31" y1="37" x2="37" y2="37" stroke={a} strokeWidth="1.5" />
          <line x1="43" y1="43" x2="49" y2="43" stroke={a} strokeWidth="1.5" />
          <line x1="56" y1="40" x2="80" y2="40" stroke={WIRE} strokeWidth="2" />
        </g>
      </svg>
      <ValueLabel text={label} rotation={rot} />
      <Handle type="source" position={hPos.position} id="pos" style={hPos.style} />
    </Wrap>
  );
});

export const GroundNode = memo(function GroundNode(p: CircuitNodeProps) {
  const { component } = p.data;
  const rot = component.rotation;
  const hGnd = rh("t", M, rot);
  return (
    <Wrap id={p.id} rotation={rot} selected={p.selected}>
      <Handle type="source" position={hGnd.position} id="gnd" style={hGnd.style} />
      <svg width={S} height={S} viewBox="0 0 80 80">
        <g transform={`rotate(${rot},40,40)`}>
          <line x1="40" y1="0" x2="40" y2="28" stroke={WIRE} strokeWidth="2" />
          <line x1="20" y1="28" x2="60" y2="28" stroke={WIRE} strokeWidth="2" />
          <line x1="26" y1="38" x2="54" y2="38" stroke={WIRE} strokeWidth="2" />
          <line x1="32" y1="48" x2="48" y2="48" stroke={WIRE} strokeWidth="2" />
        </g>
      </svg>
    </Wrap>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// POTENTIOMETER — 80×80, 3-terminal, interactive slider for wiper pos
// ═══════════════════════════════════════════════════════════════════════

export const PotentiometerNode = memo(function PotentiometerNode(p: CircuitNodeProps) {
  const { component } = p.data;
  const rot = component.rotation;
  const pos = Number(component.properties.position ?? 0.5);
  const setPotPosition = useCircuitStore((s) => s.setPotPosition);
  const nc = (component.properties.nodeColor as string) || "";

  const hA = rh("l", M, rot);
  const hW = rh("t", M, rot);
  const hB = rh("r", M, rot);

  const label = component.value >= 1e6 ? `${component.value / 1e6}MΩ`
    : component.value >= 1e3 ? `${component.value / 1e3}kΩ`
    : `${component.value}Ω`;

  return (
    <Wrap id={p.id} rotation={rot} selected={p.selected}>
      <Handle type="source" position={hA.position} id="a" style={hA.style} />
      <Handle type="source" position={hW.position} id="wiper" style={hW.style} />
      <svg width={S} height={S} viewBox="0 0 80 80">
        <g transform={`rotate(${rot},40,40)`}>
          <line x1="0" y1="40" x2="12" y2="40" stroke={WIRE} strokeWidth="2" />
          <path d="M12,40 L17,30 L25,50 L33,30 L41,50 L49,30 L57,50 L63,40 L68,40"
            fill="none" stroke={nc || "#fbbf24"} strokeWidth="2" strokeLinejoin="round" />
          <line x1="68" y1="40" x2="80" y2="40" stroke={WIRE} strokeWidth="2" />
          {/* Wiper arrow */}
          <line x1="40" y1="0" x2="40" y2="26" stroke={WIRE} strokeWidth="2" />
          <polygon points="34,26 40,34 46,26" fill={nc || "#fbbf24"} stroke={nc || "#fbbf24"} strokeWidth="1" />
        </g>
      </svg>
      {/* Slider overlay — horizontal below the node */}
      <div className="absolute pointer-events-none"
        style={{ left: -4, right: -4, bottom: -22, height: 16 }}>
        <div className="nodrag" style={{ pointerEvents: "auto" }}
          onPointerDownCapture={(e) => e.stopPropagation()}>
          <Slider
            min={0} max={100} step={1}
            value={[Math.round(pos * 100)]}
            onValueChange={(val) => setPotPosition(component.id, (Array.isArray(val) ? val[0] : val) / 100)}
            className="w-full h-3 [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
          />
        </div>
      </div>
      <ValueLabel text={`${label} ${Math.round(pos * 100)}%`} rotation={rot} />
      <Handle type="source" position={hB.position} id="b" style={hB.style} />
    </Wrap>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// NPN TRANSISTOR (BJT) — 80×80, B/C/E pins
// ═══════════════════════════════════════════════════════════════════════

export const NPNTransistorNode = memo(function NPNTransistorNode(p: CircuitNodeProps) {
  const { component } = p.data;
  const rot = component.rotation;
  const isPowered = useCircuitStore((s) => s.isPowered);
  const analysis = useCircuitStore((s) => s.analysis);
  const nc = (component.properties.nodeColor as string) || "";
  const bjt = nc || "#f472b6";
  const beta = Number(component.properties.beta ?? 100);

  const vb = analysis?.nodeVoltages[`${component.id}:base`] ?? 0;
  const vc = analysis?.nodeVoltages[`${component.id}:collector`] ?? 0;
  const active = isPowered && vb > 0.7;

  const hBase = rh("l", M, rot);
  const hCollector = rh("r", 20, rot);
  const hEmitter = rh("r", 60, rot);

  return (
    <Wrap id={p.id} rotation={rot} selected={p.selected}>
      <Handle type="target" position={hBase.position} id="base" style={hBase.style} />
      <Handle type="source" position={hCollector.position} id="collector" style={hCollector.style} />
      <Handle type="source" position={hEmitter.position} id="emitter" style={hEmitter.style} />
      <svg width={S} height={S} viewBox="0 0 80 80">
        <g transform={`rotate(${rot},40,40)`}>
          {/* Base lead */}
          <line x1="0" y1="40" x2="30" y2="40" stroke={WIRE} strokeWidth="2" />
          {/* Transistor circle */}
          <circle cx="46" cy="40" r="20" fill="none" stroke={active ? bjt : "#52525b"} strokeWidth="1.5" />
          {/* Base vertical bar */}
          <line x1="30" y1="24" x2="30" y2="56" stroke={bjt} strokeWidth="2.5" />
          {/* Collector line */}
          <line x1="30" y1="30" x2="60" y2="14" stroke={bjt} strokeWidth="2" />
          <line x1="60" y1="14" x2="60" y2="0" stroke={WIRE} strokeWidth="2" />
          {/* Emitter line with arrow */}
          <line x1="30" y1="50" x2="60" y2="66" stroke={bjt} strokeWidth="2" />
          <line x1="60" y1="66" x2="60" y2="80" stroke={WIRE} strokeWidth="2" />
          {/* Emitter arrow */}
          <polygon points="52,62 60,66 54,56" fill={bjt} />
          {/* Pin labels */}
          <text x="14" y="36" fill="#71717a" fontSize="7" fontFamily="var(--font-jetbrains)">B</text>
          <text x="62" y="12" fill="#71717a" fontSize="7" fontFamily="var(--font-jetbrains)">C</text>
          <text x="62" y="78" fill="#71717a" fontSize="7" fontFamily="var(--font-jetbrains)">E</text>
        </g>
      </svg>
      <ValueLabel text={`β=${beta}`} rotation={rot} />
    </Wrap>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// LOGIC LED — 80×80, single input, glows if input ≥ 2.5V
// ═══════════════════════════════════════════════════════════════════════

export const LogicLEDNode = memo(function LogicLEDNode(p: CircuitNodeProps) {
  const { component } = p.data;
  const rot = component.rotation;
  const isPowered = useCircuitStore((s) => s.isPowered);
  const analysis = useCircuitStore((s) => s.analysis);
  const v = analysis?.nodeVoltages[`${component.id}:in`] ?? 0;
  const lit = isPowered && v >= 2.5;
  const c = lit ? "#4ade80" : "#52525b";
  const hIn = rh("l", M, rot);

  return (
    <Wrap id={p.id} rotation={rot} selected={p.selected}>
      <Handle type="target" position={hIn.position} id="in" style={hIn.style} />
      <svg width={S} height={S} viewBox="0 0 80 80">
        <g transform={`rotate(${rot},40,40)`}>
          <line x1="0" y1="40" x2="22" y2="40" stroke={WIRE} strokeWidth="2" />
          <circle cx="48" cy="40" r="18"
            fill={lit ? c : "none"} fillOpacity={lit ? 0.15 : 0}
            stroke={c} strokeWidth="2" />
          {lit && (
            <circle cx="48" cy="40" r="8" fill={c} opacity="0.5"
              style={{ filter: `drop-shadow(0 0 8px ${c})` }} />
          )}
        </g>
      </svg>
    </Wrap>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// VOLTMETER — 80×80, high impedance, displays V+ − V−
// ═══════════════════════════════════════════════════════════════════════

function meterVoltageColor(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 4.5) return "#ef4444";
  if (abs >= 2.5) return "#f97316";
  if (abs >= 0.5) return "#22d3ee";
  if (abs > 0.01) return "#06b6d4";
  return "#52525b";
}

export const VoltmeterNode = memo(function VoltmeterNode(p: CircuitNodeProps) {
  const { component } = p.data;
  const rot = component.rotation;
  const isPowered = useCircuitStore((s) => s.isPowered);
  const analysis = useCircuitStore((s) => s.analysis);
  const floating = analysis?.floatingReference === true;
  const vPos = analysis?.nodeVoltages[`${component.id}:pos`] ?? 0;
  const vNeg = analysis?.nodeVoltages[`${component.id}:neg`] ?? 0;
  const reading = isPowered && analysis && !floating ? vPos - vNeg : 0;
  const hPos = rh("l", M, rot);
  const hNeg = rh("r", M, rot);
  const active = isPowered && analysis !== null;
  const readColor = active && !floating ? meterVoltageColor(reading) : "#52525b";
  const ringColor = active && !floating ? readColor : "#52525b";
  const readoutText = !active ? "—" : floating ? "Floating" : `${reading.toFixed(2)}V`;

  return (
    <Wrap id={p.id} rotation={rot} selected={p.selected}>
      <Handle type="source" position={hPos.position} id="pos" style={hPos.style} />
      <svg width={S} height={S} viewBox="0 0 80 80">
        <g transform={`rotate(${rot},40,40)`}>
          <line x1="0" y1="40" x2="20" y2="40" stroke={WIRE} strokeWidth="2" />
          <circle cx="40" cy="40" r="18" fill="#18181b" stroke={ringColor} strokeWidth="1.5" />
          <text x="40" y="44" textAnchor="middle" fill={ringColor} fontSize="14"
            fontFamily={JB_MONO} fontWeight="bold">V</text>
          <line x1="60" y1="40" x2="80" y2="40" stroke={WIRE} strokeWidth="2" />
          <line x1="13" y1="38" x2="13" y2="42" stroke="#4ade80" strokeWidth="1.2" />
          <line x1="11" y1="40" x2="15" y2="40" stroke="#4ade80" strokeWidth="1.2" />
          <line x1="65" y1="40" x2="69" y2="40" stroke="#ef4444" strokeWidth="1.2" />
        </g>
      </svg>
      <MeterReading text={readoutText} color={readColor} />
      <Handle type="source" position={hNeg.position} id="neg" style={hNeg.style} />
    </Wrap>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// AMMETER — 80×80, zero resistance (series), displays current
// ═══════════════════════════════════════════════════════════════════════

function meterCurrentColor(a: number): string {
  const abs = Math.abs(a);
  if (abs >= 0.1) return "#ef4444";
  if (abs >= 0.01) return "#f97316";
  if (abs >= 0.001) return "#eab308";
  if (abs > 0) return "#22d3ee";
  return "#52525b";
}

export const AmmeterNode = memo(function AmmeterNode(p: CircuitNodeProps) {
  const { component } = p.data;
  const rot = component.rotation;
  const isPowered = useCircuitStore((s) => s.isPowered);
  const analysis = useCircuitStore((s) => s.analysis);
  const floating = analysis?.floatingReference === true;

  const current = (() => {
    if (!isPowered || !analysis || floating) return 0;
    const vA = analysis.nodeVoltages[`${component.id}:a`] ?? 0;
    const vB = analysis.nodeVoltages[`${component.id}:b`] ?? 0;
    for (const [, c] of Object.entries(analysis.branchCurrents)) {
      if (c > 0) return c;
    }
    return Math.abs(vA - vB) > 0 ? 0.001 : 0;
  })();

  const hA = rh("l", M, rot);
  const hB = rh("r", M, rot);
  const active = isPowered && analysis !== null;
  const readColor = active && !floating ? meterCurrentColor(current) : "#52525b";
  const readoutText = !active ? "—" : floating ? "Floating" : formatCurrent(current);

  return (
    <Wrap id={p.id} rotation={rot} selected={p.selected}>
      <Handle type="source" position={hA.position} id="a" style={hA.style} />
      <svg width={S} height={S} viewBox="0 0 80 80">
        <g transform={`rotate(${rot},40,40)`}>
          <line x1="0" y1="40" x2="20" y2="40" stroke={WIRE} strokeWidth="2" />
          <circle cx="40" cy="40" r="18" fill="#18181b" stroke={readColor} strokeWidth="1.5" />
          <text x="40" y="44" textAnchor="middle" fill={readColor} fontSize="14"
            fontFamily={JB_MONO} fontWeight="bold">A</text>
          <line x1="60" y1="40" x2="80" y2="40" stroke={WIRE} strokeWidth="2" />
        </g>
      </svg>
      <MeterReading text={readoutText} color={readColor} />
      <Handle type="source" position={hB.position} id="b" style={hB.style} />
    </Wrap>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// D FLIP-FLOP — 80×80, edge-triggered memory element
// ═══════════════════════════════════════════════════════════════════════

export const DFlipFlopNode = memo(function DFlipFlopNode(p: CircuitNodeProps) {
  const { component } = p.data;
  const rot = component.rotation;
  const isPowered = useCircuitStore((s) => s.isPowered);
  const analysis = useCircuitStore((s) => s.analysis);

  const qV = analysis?.nodeVoltages[`${component.id}:q`] ?? 0;
  const qHigh = isPowered && qV >= 2.5;

  const hD   = rh("l", 20, rot);
  const hClk = rh("l", 60, rot);
  const hQ   = rh("r", 20, rot);
  const hQn  = rh("r", 60, rot);

  return (
    <Wrap id={p.id} rotation={rot} selected={p.selected}>
      <Handle type="target" position={hD.position} id="d" style={hD.style} />
      <Handle type="target" position={hClk.position} id="clk" style={hClk.style} />
      <Handle type="source" position={hQ.position} id="q" style={hQ.style} />
      <Handle type="source" position={hQn.position} id="qn" style={hQn.style} />
      <svg width={S} height={S} viewBox="0 0 80 80">
        <g transform={`rotate(${rot},40,40)`}>
          {/* Body */}
          <rect x="14" y="6" width="52" height="68" rx="2" fill="#18181b"
            stroke={qHigh ? "#a78bfa" : "#52525b"} strokeWidth="1.5" />
          {/* D input lead */}
          <line x1="0" y1="20" x2="14" y2="20" stroke={WIRE} strokeWidth="2" />
          <text x="19" y="24" fill="#a1a1aa" fontSize="8" fontFamily="var(--font-jetbrains)">D</text>
          {/* CLK input lead + triangle */}
          <line x1="0" y1="60" x2="14" y2="60" stroke={WIRE} strokeWidth="2" />
          <polygon points="14,54 22,60 14,66" fill="none" stroke="#a1a1aa" strokeWidth="1.2" />
          {/* Q output lead */}
          <line x1="66" y1="20" x2="80" y2="20" stroke={WIRE} strokeWidth="2" />
          <text x="56" y="24" fill="#a1a1aa" fontSize="8" fontFamily="var(--font-jetbrains)">Q</text>
          {/* Q̄ output lead */}
          <line x1="66" y1="60" x2="80" y2="60" stroke={WIRE} strokeWidth="2" />
          <text x="54" y="64" fill="#a1a1aa" fontSize="8" fontFamily="var(--font-jetbrains)">Q̄</text>
          {/* State indicator */}
          <circle cx="40" cy="40" r="4" fill={qHigh ? "#a78bfa" : "#3f3f46"}
            style={qHigh ? { filter: "drop-shadow(0 0 4px #a78bfa)" } : {}} />
        </g>
      </svg>
      <ValueLabel text={qHigh ? "Q=1" : "Q=0"} rotation={rot} />
    </Wrap>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// FUNCTION GENERATOR — 80×80, waveform source with selectable wave type
// ═══════════════════════════════════════════════════════════════════════

function wavePreviewPath(wf: string): string {
  switch (wf) {
    case "sine":
      return "M24,40 C30,24 36,24 40,40 C44,56 50,56 56,40";
    case "triangle":
      return "M24,52 L32,28 L40,52 L48,28 L56,52";
    default:
      return "M24,52 L24,28 L34,28 L34,52 L44,52 L44,28 L56,28 L56,52";
  }
}

const WAVE_TYPES = ["square", "sine", "triangle"] as const;
const WAVE_LABEL: Record<string, string> = { square: "SQR", sine: "SIN", triangle: "TRI" };

export const FuncGenNode = memo(function FuncGenNode(p: CircuitNodeProps) {
  const { component } = p.data;
  const rot = component.rotation;
  const wf = String(component.properties.waveform ?? "square");
  const amp = Number(component.properties.amplitude ?? 5);
  const freq = component.value;
  const isPowered = useCircuitStore((s) => s.isPowered);
  const simRunning = useCircuitStore((s) => s.simRunning);
  const setFuncGenWaveform = useCircuitStore((s) => s.setFuncGenWaveform);
  const nc = (component.properties.nodeColor as string) || "";
  const accent = nc || "#22d3ee";
  const active = isPowered && simRunning;

  const hPos = rh("r", M, rot);
  const hNeg = rh("l", M, rot);

  const freqLabel = freq >= 1e6 ? `${freq / 1e6}MHz`
    : freq >= 1e3 ? `${freq / 1e3}kHz`
    : `${freq}Hz`;

  return (
    <Wrap id={p.id} rotation={rot} selected={p.selected}>
      <Handle type="target" position={hNeg.position} id="neg" style={hNeg.style} />
      <svg width={S} height={S} viewBox="0 0 80 80">
        <g transform={`rotate(${rot},40,40)`}>
          <line x1="0" y1="40" x2="18" y2="40" stroke={WIRE} strokeWidth="2" />
          <circle cx="40" cy="40" r="20" fill="#18181b" stroke={active ? accent : "#52525b"} strokeWidth="1.5" />
          <path d={wavePreviewPath(wf)} fill="none" stroke={active ? accent : "#71717a"} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
          <line x1="62" y1="40" x2="80" y2="40" stroke={WIRE} strokeWidth="2" />
        </g>
      </svg>
      {/* Waveform selector buttons */}
      <div className="absolute pointer-events-none"
        style={{ left: -6, right: -6, bottom: -20, height: 14 }}>
        <div className="nodrag flex justify-center gap-px" style={{ pointerEvents: "auto" }}
          onPointerDownCapture={(e) => e.stopPropagation()}>
          {WAVE_TYPES.map((w) => (
            <button key={w}
              onClick={() => setFuncGenWaveform(component.id, w)}
              className={`px-1 py-px rounded text-[6px] font-mono border transition-colors ${
                wf === w
                  ? "border-cyan-500/60 text-cyan-300 bg-cyan-500/15"
                  : "border-zinc-800 text-zinc-600 bg-transparent hover:text-zinc-400"
              }`}>
              {WAVE_LABEL[w]}
            </button>
          ))}
        </div>
      </div>
      <ValueLabel text={`${freqLabel} ${amp}V`} rotation={rot} />
      <Handle type="source" position={hPos.position} id="pos" style={hPos.style} />
    </Wrap>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// MOMENTARY BUTTON — 60×40, output HIGH only while pressed
// ═══════════════════════════════════════════════════════════════════════

export const MomentaryButtonNode = memo(function MomentaryButtonNode(p: CircuitNodeProps) {
  const { component } = p.data;
  const isPressed = component.properties["pressed"] === true;
  const isPowered = useCircuitStore((s) => s.isPowered);
  const setButtonPressed = useCircuitStore((s) => s.setButtonPressed);
  const active = isPressed && isPowered;

  return (
    <WrapRect id={p.id} rotation={0} selected={p.selected} w={SW_W} h={SW_H}>
      <svg width={SW_W} height={SW_H} viewBox="0 0 60 40">
        <rect x="2" y="2" width="48" height="36" rx="6" fill="#18181b"
          stroke={active ? "#f97316" : "#3f3f46"} strokeWidth="1.5" />
        <line x1="50" y1="20" x2="60" y2="20" stroke={WIRE} strokeWidth="2" />
      </svg>
      <div
        className="absolute flex items-center justify-center gap-1"
        style={{ top: 0, left: 4, bottom: 0, right: 14, pointerEvents: "none" }}
      >
        <div
          className="w-2 h-2 rounded-full shrink-0 transition-all duration-100"
          style={{
            background: active ? "#f97316" : "#27272a",
            border: `1px solid ${active ? "#f97316" : "#3f3f46"}`,
            boxShadow: active ? "0 0 6px #f97316" : "none",
          }}
        />
        <div
          className="nodrag"
          style={{ pointerEvents: "auto" }}
          onPointerDownCapture={(e) => e.stopPropagation()}
        >
          <button
            onPointerDown={() => setButtonPressed(component.id, true)}
            onPointerUp={() => setButtonPressed(component.id, false)}
            onPointerLeave={() => { if (isPressed) setButtonPressed(component.id, false); }}
            className={`select-none px-2 py-1 rounded text-[8px] font-mono font-bold border transition-colors ${
              isPressed
                ? "border-orange-500/60 bg-orange-500/20 text-orange-300"
                : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500"
            }`}
          >
            PUSH
          </button>
        </div>
        <span className="text-[7px] font-mono text-zinc-500 leading-none shrink-0">
          {isPressed ? "H" : "L"}
        </span>
      </div>
      <Handle type="source" position={Position.Right} id="out" style={{ top: 20 }} />
    </WrapRect>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// LOGIC SWITCH — 60×40, compact toggle, output at right center
// ═══════════════════════════════════════════════════════════════════════
const SW_W = 60;
const SW_H = 40;

export const LogicSwitchNode = memo(function LogicSwitchNode(p: CircuitNodeProps) {
  const { component } = p.data;
  const isOn = component.properties["on"] === true;
  const isPowered = useCircuitStore((s) => s.isPowered);
  const toggleSwitch = useCircuitStore((s) => s.toggleSwitch);
  const active = isOn && isPowered;

  return (
    <WrapRect id={p.id} rotation={0} selected={p.selected} w={SW_W} h={SW_H}>
      <svg width={SW_W} height={SW_H} viewBox="0 0 60 40">
        <rect x="2" y="2" width="48" height="36" rx="6" fill="#18181b" stroke={active ? "#22d3ee" : "#3f3f46"} strokeWidth="1.5" />
        <line x1="50" y1="20" x2="60" y2="20" stroke={WIRE} strokeWidth="2" />
      </svg>
      <div
        className="absolute flex items-center gap-1"
        style={{ top: 0, left: 4, bottom: 0, right: 14, pointerEvents: "none" }}
      >
        <div
          className="w-2 h-2 rounded-full shrink-0 transition-all duration-200"
          style={{
            background: active ? "#4ade80" : "#27272a",
            border: `1px solid ${active ? "#4ade80" : "#3f3f46"}`,
            boxShadow: active ? "0 0 6px #4ade80" : "none",
          }}
        />
        <div
          className="nodrag"
          style={{ pointerEvents: "auto" }}
          onPointerDownCapture={(e) => e.stopPropagation()}
        >
          <Switch
            checked={isOn}
            onCheckedChange={() => toggleSwitch(component.id)}
            size="sm"
          />
        </div>
        <span className="text-[7px] font-mono text-zinc-500 leading-none shrink-0">
          {isOn ? "H" : "L"}
        </span>
      </div>
      <Handle type="source" position={Position.Right} id="out" style={{ top: 20 }} />
    </WrapRect>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// LOGIC GATES — 80×80 container, viewBox 0 0 100 100
// Supports 2–5 inputs. Body stretches to encompass all input leads.
// ═══════════════════════════════════════════════════════════════════════

/** Input handle Y in 80px node space (multiples of 20 for 2- and 3-input gates). */
function gateInputHandleY80(index: number, count: number): number {
  if (count <= 1) return 40;
  if (count === 2) return index === 0 ? 20 : 60;
  if (count === 3) return [20, 40, 60][index] ?? 40;
  return Math.round(((index + 1) / (count + 1)) * 80);
}

function gateInputLeadY100(index: number, count: number): number {
  return (gateInputHandleY80(index, count) * 100) / 80;
}

function DynamicGateSVG({ type, color, out, rot, inputVBYs }: {
  type: string; color: string; out: boolean; rot: number; inputVBYs: number[];
}) {
  const oc = out ? "#4ade80" : "#3f3f46";
  const top = Math.max(8, Math.min(...inputVBYs) - 12);
  const bot = Math.min(92, Math.max(...inputVBYs) + 12);
  const mid = 50;

  const body = (() => {
    switch (type) {
      case "and_gate": case "nand_gate":
        return `M22,${top} L56,${top} Q78,${top} 78,${mid} Q78,${bot} 56,${bot} L22,${bot} Z`;
      case "or_gate": case "nor_gate":
        return `M22,${top} Q34,${mid} 22,${bot} Q54,${bot} 78,${mid} Q54,${top} 22,${top} Z`;
      case "xor_gate":
        return `M22,${top} Q34,${mid} 22,${bot} Q54,${bot} 78,${mid} Q54,${top} 22,${top} Z`;
      case "not_gate":
        return `M22,${top + 2} L22,${bot - 2} L70,${mid} Z`;
      default: return "";
    }
  })();
  const bubble = ["nand_gate", "nor_gate", "not_gate"].includes(type);
  const bx = type === "not_gate" ? 74 : 82;
  const leadX = bubble ? (type === "not_gate" ? 78 : 86) : 78;

  return (
    <svg width={S} height={S} viewBox="0 0 100 100">
      <g transform={`rotate(${rot},50,50)`}>
        {inputVBYs.map((y, i) => (
          <line key={i} x1="0" y1={y} x2="22" y2={y} stroke={WIRE} strokeWidth="1.5" />
        ))}
        {type === "xor_gate" && (
          <path d={`M16,${top} Q22,${mid} 16,${bot}`} fill="none" stroke={color} strokeWidth="2" />
        )}
        <path d={body} fill="none" stroke={color} strokeWidth="2" />
        {bubble && <circle cx={bx} cy={mid} r="4" fill="none" stroke={color} strokeWidth="1.5" />}
        <line x1={leadX} y1={mid} x2="100" y2={mid} stroke={WIRE} strokeWidth="1.5" />
        <circle cx="98" cy={mid} r="2" fill={oc} />
      </g>
    </svg>
  );
}

function LogicGateNode({ props, color }: { props: CircuitNodeProps; color: string }) {
  const { component } = props.data;
  const rot = component.rotation;
  const nc = (component.properties.nodeColor as string) || "";
  const gateColor = nc || color;
  const isPowered = useCircuitStore((s) => s.isPowered);
  const setGateInput = useCircuitStore((s) => s.setGateInput);
  const analysis = useCircuitStore((s) => s.analysis);
  const inputPins = component.pins.filter((pin) => pin.type === "input");
  const outV = analysis?.nodeVoltages[`${component.id}:out`] ?? 0;
  const isHigh = outV >= 2.5;

  const isNot = component.type === "not_gate";
  const N = isNot ? 1 : inputPins.length;

  const inHandles = isNot
    ? [{ id: "in", ...rh("l", M, rot) }]
    : inputPins.map((pin, i) => {
        const y = gateInputHandleY80(i, N);
        return { id: pin.id, ...rh("l", y, rot) };
      });
  const outHandle = rh("r", M, rot);

  const inputVBYs = isNot
    ? [50]
    : inputPins.map((_, i) => gateInputLeadY100(i, N));

  return (
    <Wrap id={props.id} rotation={rot} selected={props.selected}>
      {inHandles.map((h) => (
        <Handle key={h.id} type="target" position={h.position} id={h.id} style={h.style} />
      ))}
      <DynamicGateSVG type={component.type} color={gateColor} out={isHigh && isPowered} rot={rot} inputVBYs={inputVBYs} />
      <div className="absolute -bottom-4 left-0 right-0 flex justify-center gap-1">
        {inputPins.map((pin) => {
          const on = component.properties[pin.id] === true;
          return (
            <button key={pin.id}
              onClick={() => setGateInput(component.id, pin.id, !on)}
              className={`px-1 py-px rounded text-[7px] font-mono border transition-colors ${
                on ? "border-emerald-500/60 text-emerald-400 bg-emerald-500/10"
                   : "border-zinc-800 text-zinc-700 bg-transparent"
              }`}>
              {pin.label}:{on ? "1" : "0"}
            </button>
          );
        })}
      </div>
      <Handle type="source" position={outHandle.position} id="out" style={outHandle.style} />
    </Wrap>
  );
}

export const ANDGateNode  = memo(function ANDGateNode(p: CircuitNodeProps)  { return <LogicGateNode props={p} color="#34d399" />; });
export const ORGateNode   = memo(function ORGateNode(p: CircuitNodeProps)   { return <LogicGateNode props={p} color="#60a5fa" />; });
export const NOTGateNode  = memo(function NOTGateNode(p: CircuitNodeProps)  { return <LogicGateNode props={p} color="#fb7185" />; });
export const NANDGateNode = memo(function NANDGateNode(p: CircuitNodeProps) { return <LogicGateNode props={p} color="#a78bfa" />; });
export const NORGateNode  = memo(function NORGateNode(p: CircuitNodeProps)  { return <LogicGateNode props={p} color="#f97316" />; });
export const XORGateNode  = memo(function XORGateNode(p: CircuitNodeProps)  { return <LogicGateNode props={p} color="#facc15" />; });

// ═══════════════════════════════════════════════════════════════════════
// 555 Timer — 120×120
// ═══════════════════════════════════════════════════════════════════════
const IC_555 = 120;

export const Timer555Node = memo(function Timer555Node(p: CircuitNodeProps) {
  const { component } = p.data;
  const rot = component.rotation;
  const analysis = useCircuitStore((s) => s.analysis);
  const state = analysis?.timer555States[component.id];

  const leftPins  = [
    { id: "gnd",   y: 20, src: false },
    { id: "trig",  y: 40, src: false },
    { id: "out",   y: 60, src: true },
    { id: "reset", y: 80, src: false },
  ];
  const rightPins = [
    { id: "vcc",    y: 20, src: false },
    { id: "disch",  y: 40, src: true },
    { id: "thresh", y: 60, src: false },
    { id: "ctrl",   y: 80, src: false },
  ];
  const leftLabels  = ["1 GND", "2 TRIG", "3 OUT", "4 RST"];
  const rightLabels = ["VCC 8", "DIS 7", "THR 6", "CTRL 5"];

  return (
    <WrapSized id={p.id} rotation={rot} selected={p.selected} size={IC_555}>
      {leftPins.map((pin) => {
        const h = rh("l", pin.y, rot, IC_555);
        return <Handle key={pin.id} type={pin.src ? "source" : "target"} position={h.position} id={pin.id} style={h.style} />;
      })}
      <svg width={IC_555} height={IC_555} viewBox="0 0 120 120">
        <g transform={`rotate(${rot},60,60)`}>
          <rect x="20" y="10" width="80" height="100" rx="3" fill="#18181b" stroke="#52525b" strokeWidth="1.5" />
          <path d="M56,10 A6,6 0 0,0 64,10" fill="none" stroke="#52525b" strokeWidth="1.5" />
          <text x="60" y="22" textAnchor="middle" fill="#a1a1aa" fontSize="9" fontFamily="var(--font-jetbrains)" fontWeight="bold">NE555</text>
          {leftLabels.map((l, i) => (
            <text key={l} x="26" y={leftPins[i].y + 3} fill="#71717a" fontSize="6" fontFamily="var(--font-jetbrains)">{l}</text>
          ))}
          {rightLabels.map((l, i) => (
            <text key={l} x="94" y={rightPins[i].y + 3} textAnchor="end" fill="#71717a" fontSize="6" fontFamily="var(--font-jetbrains)">{l}</text>
          ))}
          {state && <circle cx="60" cy="48" r="3" fill={state.output ? "#4ade80" : "#3f3f46"} />}
        </g>
      </svg>
      {state && (
        <div className="absolute -bottom-4 left-0 right-0 text-center pointer-events-none">
          <span className={`text-[7px] font-mono uppercase ${state.mode !== "idle" ? "text-cyan-400" : "text-zinc-700"}`}>{state.mode}</span>
        </div>
      )}
      {rightPins.map((pin) => {
        const h = rh("r", pin.y, rot, IC_555);
        return <Handle key={pin.id} type={pin.src ? "source" : "target"} position={h.position} id={pin.id} style={h.style} />;
      })}
    </WrapSized>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// 7-Segment Display — 100×100
// ═══════════════════════════════════════════════════════════════════════
const SEG7 = 100;

export const SevenSegmentNode = memo(function SevenSegmentNode(p: CircuitNodeProps) {
  const { component } = p.data;
  const rot = component.rotation;
  const set7Seg = useCircuitStore((s) => s.set7SegInput);
  const analysis = useCircuitStore((s) => s.analysis);
  const segs = analysis?.sevenSegmentStates[component.id] ?? Array(7).fill(false);
  const segPaths: Record<string, string> = {
    a: "M30,16 L70,16", b: "M72,18 L72,46", c: "M72,54 L72,82",
    d: "M30,84 L70,84", e: "M28,54 L28,82", f: "M28,18 L28,46",
    g: "M30,50 L70,50",
  };
  const ids = ["a","b","c","d","e","f","g"];
  const leftIds = ids.slice(0, 4);
  const rightIds = ids.slice(4);
  const leftY = [20, 40, 60, 80];
  const rightY = [20, 40, 60];

  return (
    <WrapSized id={p.id} rotation={rot} selected={p.selected} size={SEG7}>
      {leftIds.map((id, i) => {
        const h = rh("l", leftY[i], rot, SEG7);
        return <Handle key={id} type="target" position={h.position} id={id} style={h.style} />;
      })}
      <svg width={SEG7} height={SEG7} viewBox="0 0 100 100">
        <g transform={`rotate(${rot},50,50)`}>
          <rect x="18" y="6" width="64" height="88" rx="4" fill="#0a0a0f" stroke="#27272a" strokeWidth="1.5" />
          {ids.map((id, i) => (
            <path key={id} d={segPaths[id]} stroke={segs[i] ? "#ef4444" : "#1c1c1f"}
              strokeWidth="4" strokeLinecap="round"
              style={segs[i] ? { filter: "drop-shadow(0 0 4px #ef4444)" } : {}} />
          ))}
          <circle cx="78" cy="82" r="2" fill="#1c1c1f" />
        </g>
      </svg>
      <div className="absolute -bottom-5 left-0 right-0 flex justify-center gap-px">
        {ids.map((id) => {
          const on = component.properties[id] === true;
          return (
            <button key={id} onClick={() => set7Seg(component.id, id, !on)}
              className={`w-4 h-3 text-[6px] font-mono rounded-sm border transition-colors ${on ? "border-red-500/60 text-red-300 bg-red-500/10" : "border-zinc-800 text-zinc-700 bg-transparent"}`}>
              {id}
            </button>
          );
        })}
      </div>
      {rightIds.map((id, i) => {
        const h = rh("r", rightY[i], rot, SEG7);
        return <Handle key={id} type="target" position={h.position} id={id} style={h.style} />;
      })}
      {(() => { const h = rh("b", 50, rot, SEG7); return <Handle type="target" position={h.position} id="com" style={h.style} />; })()}
    </WrapSized>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// NODE TYPE REGISTRY
// ═══════════════════════════════════════════════════════════════════════

export const nodeTypes: Record<string, React.ComponentType<CircuitNodeProps>> = {
  circuit_resistor: ResistorNode,
  circuit_capacitor: CapacitorNode,
  circuit_inductor: InductorNode,
  circuit_potentiometer: PotentiometerNode,
  circuit_led: LEDNode,
  circuit_npn_transistor: NPNTransistorNode,
  circuit_func_gen: FuncGenNode,
  circuit_momentary_button: MomentaryButtonNode,
  circuit_voltage_source: VoltageSourceNode,
  circuit_ground: GroundNode,
  circuit_logic_led: LogicLEDNode,
  circuit_voltmeter: VoltmeterNode,
  circuit_ammeter: AmmeterNode,
  circuit_d_flipflop: DFlipFlopNode,
  circuit_logic_switch: LogicSwitchNode,
  circuit_and_gate: ANDGateNode,
  circuit_or_gate: ORGateNode,
  circuit_not_gate: NOTGateNode,
  circuit_nand_gate: NANDGateNode,
  circuit_nor_gate: NORGateNode,
  circuit_xor_gate: XORGateNode,
  circuit_timer_555: Timer555Node,
  circuit_seven_segment: SevenSegmentNode,
};
